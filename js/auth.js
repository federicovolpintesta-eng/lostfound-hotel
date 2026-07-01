import { supabaseClient } from "./supabaseClient.js";

export async function login(email, password) {
  return await supabaseClient.auth.signInWithPassword({ email, password });
}

export async function logout() {
  return await supabaseClient.auth.signOut();
}
