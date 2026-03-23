import { supabase } from "./supabaseClient";
import { handleApiResponse, type ApiResponse } from "./apiHelper";

export interface MeetingLink {
  id: string;
  user_id: string;
  title: string;
  platform: string;
  meeting_url: string;
  scheduled_at: string;
  description?: string;
  created_at: string;
}

const SELECT_FIELDS = "id, user_id, title, platform, meeting_url, scheduled_at, description, created_at";

export async function getMeetings(userId: string): Promise<ApiResponse<MeetingLink[]>> {
  const promise = supabase
    .from("meeting_links")
    .select(SELECT_FIELDS)
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: true });
  return handleApiResponse<MeetingLink[]>(promise as any);
}

export async function createMeeting(payload: Omit<MeetingLink, "id" | "created_at">): Promise<ApiResponse<MeetingLink>> {
  const promise = supabase
    .from("meeting_links")
    .insert(payload)
    .select(SELECT_FIELDS)
    .single();
  return handleApiResponse<MeetingLink>(promise as any);
}

export async function updateMeeting(id: string, payload: Partial<Omit<MeetingLink, "id" | "user_id" | "created_at">>): Promise<ApiResponse<MeetingLink>> {
  const promise = supabase
    .from("meeting_links")
    .update(payload)
    .eq("id", id)
    .select(SELECT_FIELDS)
    .single();
  return handleApiResponse<MeetingLink>(promise as any);
}

export async function deleteMeeting(id: string): Promise<ApiResponse<null>> {
  const promise = supabase.from("meeting_links").delete().eq("id", id);
  return handleApiResponse<null>(promise as any);
}
