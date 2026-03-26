import { supabase } from "./supabaseClient";
import type { AppLogRow, AppSettings, UserProfile } from "../types";



// ── Profile ──
export async function getProfile(userId: string) {
  const { data: existingProfile, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    return { data: null, error };
  }

  let data = existingProfile;
  
  if (!data) {
    // Attempt auto-creation if not found
    const res = await supabase.from("user_profiles").insert({ id: userId, display_name: "New User", avatar_url: "" }).select().single();
    if (res.error) {
      return { data: null, error: res.error };
    }
    data = res.data;
  }
  return { data: data as UserProfile | null, error: null };
}

export async function updateProfile(userId: string, payload: Partial<UserProfile>) {
  const { data, error } = await supabase.from("user_profiles").update(payload).eq("id", userId).select().single();
  return { data: data as UserProfile | null, error };
}

// ── Settings ──
export async function getSettings(userId: string) {
  const { data: existingSettings, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    return { data: null, error };
  }

  let data = existingSettings;
  
  if (!data) {
    const defaultSettings = {
      user_id: userId,
      theme: 'dark',
      default_ai_provider: 'openai',
      notifications_enabled: true,
      auto_update_enabled: true
    };
    const res = await supabase.from("app_settings").insert(defaultSettings).select().single();
    if (res.error) {
      return { data: null, error: res.error };
    }
    data = res.data;
  }
  return { data: data as AppSettings | null, error: null };
}

export async function updateSettings(userId: string, payload: Partial<AppSettings>) {
  const { data, error } = await supabase.from("app_settings").update(payload).eq("user_id", userId).select().single();
  return { data: data as AppSettings | null, error };
}

// ── Logs ──
export async function getLogs(userId: string) {
  const { data, error } = await supabase.from("app_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  return { data: (data ?? []) as AppLogRow[], error };
}

export async function clearLogs(userId: string) {
  // Clear all logs for safety or you could just do specific ones stringently
  const { error } = await supabase.from("app_logs").delete().eq("user_id", userId);
  return { error };
}
