# GA4 Data API Reference

Used endpoints and configurations for GA4 reporting.

## Base URL
`https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}`

## Endpoints

### 1. `runReport` (Batch/Historical)
Used for dashboard stats (7d, 30d, etc.).

**Standard Metrics**:
- `screenPageViews`
- `activeUsers`
- `sessions`
- `eventCount`
- `averageSessionDuration`
- `engagementRate`

**Acquisition Dimensions**:
- `sessionSource` (Source/Medium)
- `firstUserDefaultChannelGroup` (Channel Grouping)

### 2. `runRealtimeReport` (Real-time)
Used for the "Tempo Real" tab.

**Dimensions**:
- `unifiedPagePath`
- `country`
- `minutesAgo` (optional)

**Metrics**:
- `activeUsers` (Total users)

## Fallback Logic for Real-time
The API might not return a `totals` field if the data is very sparse. In such cases, sum the `metricValues` from the `rows` array.

```typescript
let totalActive = 0;
// Fallback if totals array is empty
if (data.totals && data.totals.length > 0) {
    totalActive = parseInt(data.totals[0].metricValues[0].value || '0');
}
if (totalActive === 0 && data.rows) {
    totalActive = data.rows.reduce((acc, row) => acc + parseInt(row.metricValues[0].value), 0);
}
```
