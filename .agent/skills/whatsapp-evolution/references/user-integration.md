# User Integration Mapping

Instances are linked to users via the `SITE_UserIntegrations` table in Supabase.

## Database Schema (`SITE_UserIntegrations`)
- `user_id`: UUID (Foreign Key to users)
- `instance_name`: String (Unique ID in Evolution API)
- `instance_status`: String (`open`, `connecting`, etc.)
- `updated_at`: Timestamp

## Configuration Resolution Logic
To send a message, the system resolves settings in this order:
1.  **Global Config**: Fetches `evolution_api_url` and `evolution_api_key` from `SITE_Config`.
2.  **User Instance**: Fetches the `instance_name` linked to the `userId`.
3.  **Fallback**: If no user instance is found, checks for a system-wide legacy instance in `SITE_Config` (`evolution_instance_name`).

## Instance Naming Convention
Suggested format: `user_{initials}_{random4chars}` to avoid collisions on the Evolution server.
Example: `daniel_f92a`
