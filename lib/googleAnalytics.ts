import { supabase } from './supabaseClient';

export interface GA4Metrics {
    totalViews: number;
    activeUsers: number;
    sessions: number;
    eventCount: number;
    whatsappClicks: number;
    conversionRate: number;
    averageSessionDuration: string;
    bounceRate: string;
    dailyData: { categories: string[], data: number[] };
    topPages: { path: string, count: number }[];
    deviceStats: { mobile: number, desktop: number };
    acquisitionChannels: { source: string, count: number }[];
    engagementMetrics: { sessions: number, engagedSessions: number, engagementRate: string, avgSessionDuration: string, eventsPerSession: number };
    acquisitionChartData?: { categories: string[], series: { name: string, data: number[] }[] };
}

export interface RealtimeData {
    activeUsers: number;
    activeUsers30m: number;
    topPages: { path: string, users: number }[];
    topCountries: { country: string, users: number }[];
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
                { name: 'sessions' },
                { name: 'eventCount' },
                { name: 'averageSessionDuration' },
                { name: 'bounceRate' },
                { name: 'engagedSessions' },
                { name: 'engagementRate' },
                { name: 'eventsPerSession' }
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

        // 6. Fetch Acquisition Channels
        const acquisitionResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRanges: [{ startDate: `${periodDays}daysAgo`, endDate: 'today' }],
                metrics: [{ name: 'sessions' }],
                dimensions: [{ name: 'sessionSource' }],
                limit: 5
            })
        });
        const acquisitionData = await acquisitionResponse.json();

        // 7. Fetch Device Stats
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

        // 8. Fetch WhatsApp Clicks (Event parsing)
        const waEventsResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRanges: [{ startDate: `${periodDays}daysAgo`, endDate: 'today' }],
                metrics: [{ name: 'eventCount' }],
                dimensions: [{ name: 'eventName' }],
                dimensionFilter: {
                    filter: {
                        fieldName: 'eventName',
                        stringFilter: {
                            value: 'whatsapp_click',
                            matchType: 'EXACT'
                        }
                    }
                }
            })
        });
        const waEventsData = await waEventsResponse.json();

        // 9. Fetch Daily Acquisition Channels
        const acqChartResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRanges: [{ startDate: `${periodDays}daysAgo`, endDate: 'today' }],
                metrics: [{ name: 'activeUsers' }],
                dimensions: [{ name: 'date' }, { name: 'firstUserDefaultChannelGroup' }],
                orderBys: [{ dimension: { dimensionName: 'date' } }]
            })
        });
        const acqChartData = await acqChartResponse.json();

        // 8. Map Data
        const totals = data.totals?.[0]?.metricValues;
        const totalViews = parseInt(totals?.[0]?.value || '0');
        const activeUsers = parseInt(totals?.[1]?.value || '0');
        const sessions = parseInt(totals?.[2]?.value || '0');
        const eventCount = parseInt(totals?.[3]?.value || '0');
        
        const avgDurationRaw = parseFloat(totals?.[4]?.value || '0');
        const minutes = Math.floor(avgDurationRaw / 60);
        const seconds = Math.floor(avgDurationRaw % 60);
        const averageSessionDuration = `${minutes}m ${seconds}s`;
        
        const bounceRate = (parseFloat(totals?.[5]?.value || '0') * 100).toFixed(1) + '%';

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

        const whatsappClicks = parseInt(waEventsData.rows?.[0]?.metricValues?.[0]?.value || '0');
        const conversionRate = totalViews > 0 ? parseFloat(((whatsappClicks / totalViews) * 100).toFixed(2)) : 0;

        const acquisitionChannels = acquisitionData.rows?.map((row: any) => ({
            source: row.dimensionValues[0].value,
            count: parseInt(row.metricValues[0].value)
        })) || [];

        const engagedSessions = parseInt(totals?.[6]?.value || '0');
        const engagementRate = (parseFloat(totals?.[7]?.value || '1') * 100).toFixed(1) + '%';
        const eventsPerSession = parseFloat(totals?.[8]?.value || '0');

        return {
            totalViews,
            activeUsers,
            sessions,
            eventCount,
            whatsappClicks,
            conversionRate,
            averageSessionDuration,
            bounceRate,
            dailyData: { categories: dailyCategories, data: dailyValues },
            topPages,
            deviceStats: { mobile, desktop },
            acquisitionChannels,
            engagementMetrics: {
                sessions,
                engagedSessions,
                engagementRate,
                avgSessionDuration: averageSessionDuration,
                eventsPerSession
            },
            acquisitionChartData: processAcquisitionChart(acqChartData)
        };

    } catch (err) {
        console.error("GA4 Fetch Error:", err);
        return null;
    }
}

export const fetchGA4Realtime = async (): Promise<RealtimeData | null> => {
    try {
        const { data: configs } = await supabase.from('SITE_Config').select('*');
        const configMap = configs?.reduce((acc: any, cfg: any) => ({ ...acc, [cfg.key]: cfg.value }), {}) || {};
        
        const refreshToken = configMap['google_refresh_token'];
        const clientId = configMap['google_oauth_client_id'];
        const clientSecret = configMap['google_oauth_client_secret'];
        const propertyId = configMap['ga4_property_id'];

        if (!refreshToken || !propertyId) return null;

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
        if (!accessToken) return null;

        const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                metrics: [{ name: 'activeUsers' }],
                dimensions: [{ name: 'unifiedPagePath' }, { name: 'country' }],
                limit: 100 // Ensure we get enough rows
            })
        });
        const data = await response.json();

        if (data.error) {
            console.error("GA4 Realtime API Error:", data.error);
            return null;
        }

        const topPages: any[] = [];
        const topCountries: any[] = [];
        let totalActive = 0;

        // Try to get total from totals field first (more reliable)
        if (data.totals && data.totals.length > 0) {
            totalActive = parseInt(data.totals[0].metricValues[0].value || '0');
        }

        data.rows?.forEach((row: any) => {
            const users = parseInt(row.metricValues[0].value);
            // If we didn't get totalActive from totals, sum it up
            if (totalActive === 0) totalActive += users;
            
            const path = row.dimensionValues[0].value;
            const country = row.dimensionValues[1].value;

            const existingPage = topPages.find(p => p.path === path);
            if (existingPage) existingPage.users += users;
            else topPages.push({ path, users });

            const existingCountry = topCountries.find(c => c.country === country);
            if (existingCountry) existingCountry.users += users;
            else topCountries.push({ country, users });
        });

        return {
            activeUsers: totalActive,
            activeUsers30m: totalActive, // In reality, GA4 realtime is last 30m
            topPages: topPages.sort((a, b) => b.users - a.users).slice(0, 5),
            topCountries: topCountries.sort((a, b) => b.users - a.users).slice(0, 5),
        };
    } catch (err) {
        console.error("Realtime Error:", err);
        return null;
    }
}

const processAcquisitionChart = (gaData: any) => {
    if (!gaData.rows) return undefined;

    const categories: string[] = [];
    const seriesMap: Record<string, Record<string, number>> = {};
    const channelNames = new Set<string>();

    gaData.rows.forEach((row: any) => {
        const date = row.dimensionValues[0].value; // YYYYMMDD
        const channel = row.dimensionValues[1].value;
        const users = parseInt(row.metricValues[0].value);

        const formattedDate = `${date.substring(6, 8)}/${date.substring(4, 6)}`;
        if (!categories.includes(formattedDate)) categories.push(formattedDate);

        if (!seriesMap[channel]) seriesMap[channel] = {};
        seriesMap[channel][formattedDate] = users;
        channelNames.add(channel);
    });

    // Compute Total series
    const totalDataMap: Record<string, number> = {};
    categories.forEach(date => {
        let dailyTotal = 0;
        channelNames.forEach(channel => {
            dailyTotal += seriesMap[channel][date] || 0;
        });
        totalDataMap[date] = dailyTotal;
    });

    const series = Array.from(channelNames).map(channel => ({
        name: channel,
        data: categories.map(date => seriesMap[channel][date] || 0)
    }));

    // Add Total at the beginning
    series.unshift({
        name: 'Total',
        data: categories.map(date => totalDataMap[date])
    });

    return { categories, series };
}
