import { supabase } from "./supabaseClient";
import { handleApiResponse } from "./apiHelper";

export interface LikedIdea {
  id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: string;
}

export async function getLikedIdeas(userId: string) {
  const response = await handleApiResponse<LikedIdea[]>(
    supabase
      .from("liked_ideas")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }) as any
  );
  return { data: (response.data ?? []) as LikedIdea[], error: response.error };
}

export async function saveLikedIdea(payload: {
  userId: string;
  title: string;
  description: string;
}) {
  const response = await handleApiResponse<LikedIdea>(
    supabase
      .from("liked_ideas")
      .insert({
        user_id: payload.userId,
        title: payload.title,
        description: payload.description,
      })
      .select()
      .single() as any
  );
  return { data: response.data as LikedIdea | null, error: response.error };
}

export async function deleteLikedIdea(id: string) {
  const response = await handleApiResponse<null>(
    supabase.from("liked_ideas").delete().eq("id", id) as any
  );
  return { error: response.error };
}
