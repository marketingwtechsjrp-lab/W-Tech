/**
 * WhatsApp Evolution API Test Script
 * Use this to verify connectivity and instance status.
 */
import { getGlobalWhatsAppConfig, getUserWhatsAppConfig } from '../lib/whatsapp.ts';

async function testConnection(userId) {
    const config = userId ? await getUserWhatsAppConfig(userId) : await getGlobalWhatsAppConfig();
    
    if (!config) {
        console.error('❌ Configuration not found.');
        return;
    }

    const { serverUrl, apiKey, instanceName } = config;
    const url = `${serverUrl}/instance/connectionState/${instanceName || ''}`;

    console.log(`📡 Checking connection for: ${instanceName || 'Global Server'}`);
    
    try {
        const response = await fetch(url, {
            headers: { 'apikey': apiKey }
        });
        const data = await response.json();
        console.log('✅ Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ Network Error:', err.message);
    }
}

// Example usage: node scripts/test-whatsapp.js [userId]
const userId = process.argv[2];
testConnection(userId);
