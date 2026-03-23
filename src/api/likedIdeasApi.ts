import { supabase } from "./supabaseClient";

export interface LikedIdea {
  id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: string;
}

export async function getLikedIdeas(userId: string) {
  const { data, error } = await supabase
    .from("liked_ideas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data: (data ?? []) as LikedIdea[], error };
}

export async function saveLikedIdea(payload: {
  userId: string;
  title: string;
  description: string;
}) {
  const { data, error } = await supabase
    .from("liked_ideas")
    .insert({
      user_id: payload.userId,
      title: payload.title,
      description: payload.description,
    })
    .select()
    .single();
  return { data: data as LikedIdea | null, error };
}

export async function deleteLikedIdea(id: string) {
  const { error } = await supabase.from("liked_ideas").delete().eq("id", id);
  return { error };
}
