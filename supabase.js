const { createClient } = window.supabase;

const SUPABASE_URL = "https://nfjwpsnztkihqwdbmxja.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_j5n8f34qwwukhOiWRZJqhw_eyFKtJGS";

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

