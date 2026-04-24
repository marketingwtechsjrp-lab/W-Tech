# Task: Rebuild Analytics Dashboard with Google OAuth Integration

## 🎯 Goal
Transform the current manual tracking dashboard into a robust integration with **Google Analytics 4 (GA4)** via **Google OAuth**.

## 🛠️ Requirements
- [ ] Implement Google OAuth flow to obtain access/refresh tokens.
- [ ] Store integration credentials securely in `SITE_Config`.
- [ ] Fetch real-time metrics from Google Analytics Data API.
- [ ] Redesign `AnalyticsView.tsx` to handle "Connected" vs "Disconnected" states.
- [ ] Add a setup UI for Google Cloud credentials (Client ID, Secret, Property ID).

## 📅 Phases

### Phase 1: Infrastructure & Schema
1. [ ] Create necessary configuration keys in `SITE_Config`:
   - `google_oauth_client_id`
   - `google_oauth_client_secret`
   - `ga4_property_id`
   - `ga4_refresh_token` (encrypted or system config)
2. [ ] (Optional) Create a Supabase Edge Function to handle the OAuth callback safely.

### Phase 2: OAuth Implementation
1. [ ] Add "Connect Google Account" button in `AdminIntegrations.tsx`.
2. [ ] Implement the login flow and token exchange.
3. [ ] Store the refresh token for background data fetching.

### Phase 3: Data Fetching (GA4 API)
1. [ ] Implement service to fetch metrics:
   - Views (screenPageViews)
   - Unique Visitors (activeUsers)
   - Events (eventCount)
   - Conversion Rates.
2. [ ] Map Google's API response to our dashboard state.

### Phase 4: UI Refactor
1. [ ] Update `AnalyticsView.tsx` to prioritize Google data if connected.
2. [ ] Add a "Sync Now" button.
3. [ ] Improve visual aesthetics inspired by premium dark-mode dashboards.

---
## 🚦 Socratic Gate Verification
- **User Confirmation Required**: Do you want to use a Supabase Edge Function to keep the Client Secret safe, or should we handle the flow entirely on the frontend?
- **Data Privacy**: We will store the refresh token in your database. This allows the system to update the dashboard even when you are not logged in.
