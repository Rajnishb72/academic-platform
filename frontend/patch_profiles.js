require("dotenv").config({ path: "../backend/.env" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function patchProfiles() {
    console.log("Fetching profiles with null display_name...");
    const { data: profiles, error } = await supabase
        .from("user_profiles")
        .select("id, display_name");

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    // Also fetch auth users to try to get their name
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    const authUserMap = {};
    if (!authError && authUsers?.users) {
        for (const u of authUsers.users) {
            authUserMap[u.id] = u;
        }
    }

    let updatedCount = 0;

    for (const p of profiles) {
        if (!p.display_name) {
            console.log(`Patching profile ${p.id}`);

            const authU = authUserMap[p.id];
            const meta = authU?.raw_user_meta_data || {};

            let newName = meta.display_name || meta.username || meta.firstName || meta.name || `User ${p.id.slice(0, 5)}`;

            const { error: updateError } = await supabase
                .from("user_profiles")
                .update({ display_name: newName })
                .eq("id", p.id);

            if (updateError) {
                console.error(`Error updating profile ${p.id}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`Successfully patched ${updatedCount} profiles.`);
}

patchProfiles()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
