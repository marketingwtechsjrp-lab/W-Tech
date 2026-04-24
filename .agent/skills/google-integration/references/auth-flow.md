# OAuth2 Authentication Flow

The W-Tech platform uses a server-side OAuth2 flow to communicate with Google APIs.

## Credentials Storage
All credentials are stored in the `SITE_Config` table in Supabase:
- `google_refresh_token`: The long-lived token used to get new access tokens.
- `google_oauth_client_id`: From Google Cloud Console.
- `google_oauth_client_secret`: From Google Cloud Console.
- `ga4_property_id`: The ID of the GA4 property (e.g., `473...`).

## Token Renewal Logic

```typescript
const { data: configs } = await supabase.from('SITE_Config').select('*');
const configMap = configs?.reduce((acc: any, cfg: any) => ({ ...acc, [cfg.key]: cfg.value }), {}) || {};

const refreshToken = configMap['google_refresh_token'];
const clientId = configMap['google_oauth_client_id'];
const clientSecret = configMap['google_oauth_client_secret'];

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
```

## Security Note
The `access_token` is short-lived (usually 3600s). Always refresh it before making API calls to avoid 401 Unauthorized errors.
