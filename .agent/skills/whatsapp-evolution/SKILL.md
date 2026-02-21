---
name: whatsapp-evolution
description: Expert in WhatsApp integration using Evolution API. Handles instance lifecycle (create, connect, delete), QR Code management, connection state monitoring, and sending messages (text and media). Use when implementing WhatsApp automations, debugging connection issues, or managing Evolution API instances.
---

# WhatsApp Evolution Skill

Instructional guide for managing WhatsApp integrations via Evolution API within the W-Tech ecosystem.

## Key Capabilities

1.  **Instance Management**: Creating, deleting, and fetching connection states for Baileys-based WhatsApp instances.
2.  **Authentication**: Managing the initial pairing process via Base64 QR Codes.
3.  **Messaging**: Supporting text, images, videos, and documents with retry logic and phone number normalization.
4.  **Multi-user Support**: Routing messages through specific user instances stored in `SITE_UserIntegrations`.

## Core Workflows

### 🏗️ Instance Lifecycle
Before sending messages, an instance must be active.
- **Create**: `POST /instance/create` (Token: empty, qrcode: true, integration: 'WHATSAPP-BAILEYS').
- **Connect**: `GET /instance/connect/{instanceName}` returns the Base64 QR Code.
- **Status Check**: `GET /instance/connectionState/{instanceName}` to verify if state is `open`.
- **Delete**: `DELETE /instance/delete/{instanceName}` to wipe the instance.

### ✉️ Sending Messages
Phone numbers are normalized to the `55DD9XXXXXXXX` format before sending.
- **Text**: `POST /message/sendText/{instanceName}`.
- **Media**: `POST /message/sendMedia/{instanceName}` (Supports image, video, document).

## Implementation Reference

- **[API_ENDPOINTS.md](references/api-endpoints.md)**: Detailed API paths, headers, and request bodies.
- **[USER_INTEGRATION.md](references/user-integration.md)**: How instances are mapped to users in the database.
- **[TROUBLESHOOTING.md](references/troubleshooting.md)**: Common connection errors and status handling.

## Code Resources

- **`scripts/test-whatsapp.js`**: Helper script to test instance connectivity.
