# Troubleshooting & Error States

## Common Connection Issues

### 1. Instance "close" or "disconnected"
- **Cause**: The phone was disconnected manually in WhatsApp settings or battery/network issues.
- **Fix**: Trigger the `/instance/connect` endpoint to generate a new QR Code.

### 2. QR Code not appearing
- **Cause**: Instance might be in a "connecting" loop.
- **Fix**: Delete the instance via `/instance/delete` and recreate it.

### 3. Number not found (404)
- **Cause**: The number is not on WhatsApp or formatting is wrong.
- **Fix**: Ensure the number starts with `55` (for Brazil) and has the correct quantity of digits (11 for mobile with 9th digit).

## Normalization Logic
The system automatically applies this logic to phone strings:
1.  Remove all non-numeric characters (`\D`).
2.  If length <= 11, prepend `55`.
3.  Target format for Evolution API: `5511999999999`.
