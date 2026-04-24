# Evolution API Endpoints Guide

## Base Configuration
- **Header**: `apikey: YOUR_GLOBAL_API_KEY`
- **Content-Type**: `application/json`

## Instance Operations

### 1. Create Instance
- **Path**: `POST /instance/create`
- **Body**:
```json
{
  "instanceName": "string",
  "token": "",
  "qrcode": true,
  "integration": "WHATSAPP-BAILEYS"
}
```

### 2. Get QR Code
- **Path**: `GET /instance/connect/{instanceName}`
- **Response**: `{ "base64": "data:image/png;base64,..." }`

### 3. Connection State
- **Path**: `GET /instance/connectionState/{instanceName}`
- **Possible States**: `open`, `connecting`, `close`, `refused`.

### 4. Delete Instance
- **Path**: `DELETE /instance/delete/{instanceName}`

## Messaging

### 1. Send Text
- **Path**: `POST /message/sendText/{instanceName}`
- **Body**: `{ "number": "55...", "text": "Message Body" }`

### 2. Send Media
- **Path**: `POST /message/sendMedia/{instanceName}`
- **Body**:
```json
{
  "number": "55...",
  "mediatype": "image|video|document",
  "media": "URL_OR_BASE64",
  "fileName": "name.ext",
  "caption": "Text below media"
}
```
