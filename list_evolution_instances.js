const EVOLUTION_API_URL = "https://api.2b.app.br";
const EVOLUTION_API_KEY = "8828462c98512411df3acfe3df4e48a1";

async function run() {
    try {
        console.log("Fetching all instances from Evolution API...");
        const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
            method: 'GET',
            headers: {
                'apikey': EVOLUTION_API_KEY
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error fetching instances:", error);
    }
}

run();
