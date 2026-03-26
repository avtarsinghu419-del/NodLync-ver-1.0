import { supabase } from "./supabaseClient";
import { handleApiResponse, type ApiResponse } from "./apiHelper";

export type UserItemType = "note" | "workflow" | "prompt" | "api" | "template";

export interface UserItem {
  id: string;
  user_id: string;
  type: UserItemType;
  title: string;
  description: string | null;
  data: Record<string, unknown>;
  tags: string[];
  created_at: string;
}

export interface UserItemsQuery {
  userId: string;
  search?: string;
  type?: UserItemType | null;
  tag?: string | null;
  favoritesOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface UserItemsResult {
  items: UserItem[];
  total: number;
}

interface UserItemSearchRow extends UserItem {
  total_count?: number;
}

const ITEM_SELECT = "id, user_id, type, title, description, data, tags, created_at";

function normalizeTags(tags?: string[]) {
  const values = (tags ?? [])
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(values));
}

export async function getUserItems({
  userId,
  search,
  type,
  tag,
  favoritesOnly = false,
  page = 1,
  pageSize = 24,
}: UserItemsQuery): Promise<ApiResponse<UserItemsResult>> {
  const searchValue = search?.trim() ? search.trim() : null;
  const tagValue = tag?.trim() ? tag.trim().toLowerCase() : null;

  const { data, error } = await supabase.rpc("search_user_items", {
    p_user_id: userId,
    p_search: searchValue,
    p_type: type ?? null,
    p_tag: tagValue,
    p_favorites: favoritesOnly,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) {
    const response = await handleApiResponse<UserItemSearchRow[]>(Promise.resolve({ data: null, error } as any));
    return { data: null, error: response.error };
  }

  const rows = (data ?? []) as UserItemSearchRow[];
  const total = rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0;

  return {
    data: {
      items: rows.map(({ total_count, ...item }) => ({
        ...item,
        tags: normalizeTags(item.tags),
        data: (item.data ?? {}) as Record<string, unknown>,
      })),
      total,
    },
    error: null,
  };
}

export async function listUserItemTags(userId: string): Promise<ApiResponse<string[]>> {
  const response = await handleApiResponse<Array<{ tags: string[] | null }>>(
    supabase.from("user_items").select("tags").eq("user_id", userId) as any
  );

  if (response.error || !response.data) {
    return { data: null, error: response.error };
  }

  const uniqueTags = Array.from(
    new Set(
      response.data
        .flatMap((row) => row.tags ?? [])
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  return { data: uniqueTags, error: null };
}

export async function createUserItem(payload: Omit<UserItem, "id" | "created_at">): Promise<ApiResponse<UserItem>> {
  const normalizedPayload = {
    ...payload,
    description: payload.description?.trim() || null,
    data: payload.data ?? {},
    tags: normalizeTags(payload.tags),
  };

  return handleApiResponse<UserItem>(
    supabase.from("user_items").insert(normalizedPayload).select(ITEM_SELECT).single() as any
  );
}

export async function updateUserItem(
  id: string,
  payload: Partial<Omit<UserItem, "id" | "user_id" | "created_at">>
): Promise<ApiResponse<UserItem>> {
  const nextPayload: Record<string, unknown> = {};

  if (payload.type) nextPayload.type = payload.type;
  if (payload.title !== undefined) nextPayload.title = payload.title;
  if (payload.description !== undefined) nextPayload.description = payload.description?.trim() || null;
  if (payload.data !== undefined) nextPayload.data = payload.data ?? {};
  if (payload.tags !== undefined) nextPayload.tags = normalizeTags(payload.tags);

  return handleApiResponse<UserItem>(
    supabase.from("user_items").update(nextPayload).eq("id", id).select(ITEM_SELECT).single() as any
  );
}

export async function deleteUserItem(id: string): Promise<ApiResponse<null>> {
  return handleApiResponse<null>(supabase.from("user_items").delete().eq("id", id) as any);
}
