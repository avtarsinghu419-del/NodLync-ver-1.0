import { supabase } from "./supabaseClient";
import { handleApiResponse, type ApiResponse } from "./apiHelper";

export interface MyStuffCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface MyStuffItem {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  url?: string;
  description?: string;
  created_at: string;
}

const CAT_SELECT = "id, user_id, name, created_at";
const ITEM_SELECT = "id, user_id, category_id, title, url, description, created_at";

export async function getCategories(userId: string): Promise<ApiResponse<MyStuffCategory[]>> {
  const promise = supabase
    .from("my_stuff_categories")
    .select(CAT_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return handleApiResponse<MyStuffCategory[]>(promise as any);
}

export async function createCategory(payload: { user_id: string; name: string }): Promise<ApiResponse<MyStuffCategory>> {
  const promise = supabase
    .from("my_stuff_categories")
    .insert(payload)
    .select(CAT_SELECT)
    .single();
  return handleApiResponse<MyStuffCategory>(promise as any);
}

export async function deleteCategory(id: string): Promise<ApiResponse<null>> {
  const promise = supabase.from("my_stuff_categories").delete().eq("id", id);
  return handleApiResponse<null>(promise as any);
}

export async function updateCategory(id: string, payload: { name: string }): Promise<ApiResponse<MyStuffCategory>> {
  const promise = supabase
    .from("my_stuff_categories")
    .update(payload)
    .eq("id", id)
    .select(CAT_SELECT)
    .single();
  return handleApiResponse<MyStuffCategory>(promise as any);
}

export async function getItems(categoryId: string): Promise<ApiResponse<MyStuffItem[]>> {
  const promise = supabase
    .from("my_stuff_items")
    .select(ITEM_SELECT)
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false });
  return handleApiResponse<MyStuffItem[]>(promise as any);
}

export async function createItem(payload: Omit<MyStuffItem, "id" | "created_at">): Promise<ApiResponse<MyStuffItem>> {
  const promise = supabase
    .from("my_stuff_items")
    .insert(payload)
    .select(ITEM_SELECT)
    .single();
  return handleApiResponse<MyStuffItem>(promise as any);
}

export async function updateItem(id: string, payload: Partial<Omit<MyStuffItem, "id" | "user_id" | "created_at">>): Promise<ApiResponse<MyStuffItem>> {
  const promise = supabase
    .from("my_stuff_items")
    .update(payload)
    .eq("id", id)
    .select(ITEM_SELECT)
    .single();
  return handleApiResponse<MyStuffItem>(promise as any);
}

export async function deleteItem(id: string): Promise<ApiResponse<null>> {
  const promise = supabase.from("my_stuff_items").delete().eq("id", id);
  return handleApiResponse<null>(promise as any);
}
