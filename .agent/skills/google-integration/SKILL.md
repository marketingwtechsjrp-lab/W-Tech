---
name: google-integration
description: Expert in Google Analytics 4 (GA4) and Google Search Console integrations. Handles OAuth2 token management (Refresh Token), GA4 Data API reporting (Métricas, Realtime, Acquisition), and automated Sitemap generation for SEO. Use when setting up Google Analytics, fixing Realtime data, automating sitemaps, or managing Google API credentials.
---

# Google Integration Skill

This skill provides specialized knowledge and workflows for integrating Google services (Analytics and SEO) into the W-Tech platform.

## Key Capabilities

1.  **GA4 Data Extraction**: Using the Google Analytics Data API (v1beta) to fetch metrics like views, active users, sessions, and acquisition channels.
2.  **OAuth2 Lifecycle**: Managing `refresh_tokens` and automatically renewing `access_tokens`.
3.  **Automated Sitemaps**: Dynamic generation of `sitemap.xml` based on content from Supabase.
4.  **Real-time Analytics**: Implementing and debugging GA4 Realtime reporting.

## Core Workflows

### 🔑 Token Management
All Google API calls must first ensure a valid `access_token`.
- Tokens are refreshed using the `client_id`, `client_secret`, and `refresh_token` stored in `SITE_Config`.
- See `references/auth-flow.md` for implementation details.

### 📊 Metric Fetching
Metrics should be fetched using the `runReport` (batch) or `runRealtimeReport` (real-time) endpoints.
- Dimensions for Acquisition: `firstUserDefaultChannelGroup` or `sessionSource`.
- Metrics for Traffic: `activeUsers`, `screenPageViews`, `sessions`.

### 🗺️ Sitemap Generation
To update the search index:
1.  Run `scripts/generate-sitemap.js` during the build process.
2.  The script fetches all slugs from `SITE_LandingPages`, `SITE_Courses`, and `SITE_BlogPosts`.
3.  Ensure the resulting `sitemap.xml` is placed in the `public/` directory.

## Reference Materials

- **[AUTH_FLOW.md](references/auth-flow.md)**: Details on OAuth2 logic and token renewal.
- **[GA4_API.md](references/ga4-api.md)**: List of endpoints, metrics, and dimensions used in the project.
- **[SITEMAP.md](references/sitemap.md)**: Guide on the automated sitemap structure and automation script.

## Shared Resources

- **`assets/google-auth.html`**: Helper page for initial OAuth authorization.
- **`scripts/generate-sitemap.js`**: Reusable script for sitemap generation.
