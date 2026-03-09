/**
 * Supabase browser client — returns the SAME singleton as @/lib/supabase.
 *
 * This file exists so that components importing from "@/lib/supabase/client"
 * (e.g. useUser, ProfileDropdown) get the exact same SupabaseClient instance
 * used everywhere else, preventing the "Multiple GoTrueClient instances" warning.
 */

import { supabase } from "@/lib/supabase";

export function createClient() {
    return supabase;
}
