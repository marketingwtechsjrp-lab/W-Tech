
import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema(tableName) {
    console.log(`Checking schema for ${tableName}...`);
    try {
        const { data, error } = await supabase.from(tableName).select('*').limit(1);
        if (error) {
            console.error(`Error fetching ${tableName}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`Columns for ${tableName}:`, Object.keys(data[0]));
        } else {
            // If empty, try to fetch one record without limit just in case
            const { data: data2, error: error2 } = await supabase.from(tableName).select('*');
            if (data2 && data2.length > 0) {
                 console.log(`Columns for ${tableName} (from full select):`, Object.keys(data2[0]));
            } else {
                 console.log(`No data in ${tableName}. Cannot determine columns via select.`);
            }
        }
    } catch (e) {
        console.error(`Exception checking ${tableName}:`, e.message);
    }
}

async function main() {
    await checkSchema('SITE_Sales');
    await checkSchema('SITE_SaleItems');
    await checkSchema('SITE_Orders');
    await checkSchema('SITE_Transactions');
}

main();
