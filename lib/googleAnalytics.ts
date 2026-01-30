import { supabase } from './supabaseClient';

export interface GA4Metrics {
    totalViews: number;
    activeUsers: number;
    eventCount: number;
    whatsappClicks: number;
    conversionRate: number;
    dailyData: { categories: string[], data: number[] };
    topPages: { path: string, count: number }[];
    deviceStats: { mobile: number, desktop: number };
}

export const fetchGA4Data = async (periodDays: number = 30): Promise<GA4Metrics | null> => {
    try {
        // 1. Get Refresh Token & Config
        const { data: configs } = await supabase.from('SITE_Config').select('*');
        const configMap = configs?.reduce((acc: any, cfg: any) => ({ ...acc, [cfg.key]: cfg.value }), {}) || {};

        const refreshToken = configMap['google_refresh_token'];
        const clientId = configMap['google_oauth_client_id'];
        const clientSecret = configMap['google_oauth_client_secret'];
        const propertyId = configMap['ga4_property_id'];

        if (!refreshToken || !propertyId) return null;

        // 2. Refresh Access Token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) throw new Error('Falha ao renovar token do Google.');

        // 3. Fetch Data from GA4 API
        const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
        
        const requestBody = {
            dateRanges: [{ startDate: `${periodDays}daysAgo`, endDate: 'today' }],
            metrics: [
                { name: 'screenPageViews' },
                { name: 'activeUsers' },
                { name: 'eventCount' }
            ],
            dimensions: [{ name: 'date' }],
            orderBys: [{ dimension: { dimensionName: 'date' } }]
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        // 4. Fetch Top Pages
        const pagesResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRanges: [{ startDate: `${periodDays}daysAgo`, endDate: 'today' }],
                metrics: [{ name: 'screenPageViews' }],
                dimensions: [{ name: 'pagePath' }],
                limit: 10
            })
        });
        const pagesData = await pagesResponse.json();

        // 5. Fetch Device Stats
        const deviceResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRanges: [{ startDate: `${periodDays}daysAgo`, endDate: 'today' }],
                metrics: [{ name: 'activeUsers' }],
                dimensions: [{ name: 'deviceCategory' }]
            })
        });
        const deviceData = await deviceResponse.json();

        // 6. Map Data
        const totals = data.totals?.[0]?.metricValues;
        const totalViews = parseInt(totals?.[0]?.value || '0');
        const activeUsers = parseInt(totals?.[1]?.value || '0');
        const eventCount = parseInt(totals?.[2]?.value || '0');

        const dailyCategories: string[] = [];
        const dailyValues: number[] = [];
        
        data.rows?.forEach((row: any) => {
            const dateStr = row.dimensionValues[0].value; // YYYYMMDD
            const formattedDate = `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}`;
            dailyCategories.push(formattedDate);
            dailyValues.push(parseInt(row.metricValues[0].value));
        });

        const topPages = pagesData.rows?.map((row: any) => ({
            path: row.dimensionValues[0].value,
            count: parseInt(row.metricValues[0].value)
        })) || [];

        let mobile = 0;
        let desktop = 0;
        deviceData.rows?.forEach((row: any) => {
            const cat = row.dimensionValues[0].value;
            const val = parseInt(row.metricValues[0].value);
            if (cat === 'mobile') mobile = val;
            else desktop += val; 
        });

        return {
            totalViews,
            activeUsers,
            eventCount,
            whatsappClicks: 0, // Need to fetch via event search
            conversionRate: 0,
            dailyData: { categories: dailyCategories, data: dailyValues },
            topPages,
            deviceStats: { mobile, desktop }
        };

    } catch (err) {
        console.error("GA4 Fetch Error:", err);
        return null;
    }
}
