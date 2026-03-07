require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', '024_add_unique_username.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // In newer Supabase JS, executing raw SQL might not be supported natively from the client without an RPC call.
        // If there's an rpc function we can use it. Otherwise, we can try to use a dummy query or inform the user to run it from SQL panel.

        console.log("Supabase JS doesn't natively support raw arbitrary SQL execution without an RPC.\nPlease copy and paste the contents of migrations/024_add_unique_username.sql into your Supabase Dashboard SQL Editor.");
    } catch (e) {
        console.error("Error:\n", e);
    }
}
run();
