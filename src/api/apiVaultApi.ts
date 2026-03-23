import { supabase } from "./supabaseClient";
import { encryptValue } from "./encryptionHelper";
import { handleApiResponse, type ApiResponse } from "./apiHelper";

export interface ApiVaultItem {
  id: string;
  user_id: string;
  key_name: string;
  provider: string;
  api_key: string;
  initialization_vector: string;
  description: string | null;
  tags: string | null;
  created_at: string | null;
}

export interface CreateApiVaultInput {
  userId: string;
  name: string;
  provider: string;
  apiKey: string;
  description?: string;
  tags?: string;
}

const TABLE_NAME = "api_key_items";

const selectColumns =
  "Id,UserId,Name,Provider,EncryptedValue,InitializationVector,Description,Tags,CreatedAt";

function normalizeItem(row: Record<string, unknown>): ApiVaultItem {
  return {
    id: String(row.Id ?? row.id ?? ""),
    user_id: String(row.UserId ?? row.user_id ?? ""),
    key_name: String(row.Name ?? row.key_name ?? row.name ?? ""),
    provider: String(row.Provider ?? row.provider ?? ""),
    api_key: String(
      row.EncryptedValue ?? row.api_key ?? row.apiKey ?? row.secret ?? ""
    ),
    initialization_vector: String(row.InitializationVector ?? row.initialization_vector ?? "plain-text"),
    description:
      typeof row.Description === "string"
        ? row.Description
        : typeof row.description === "string"
          ? row.description
          : row.description == null && row.Description == null
            ? null
            : String(row.Description ?? row.description),
    tags:
      typeof row.Tags === "string"
        ? row.Tags
        : typeof row.tags === "string"
          ? row.tags
          : row.tags == null && row.Tags == null
            ? null
            : String(row.Tags ?? row.tags),
    created_at:
      typeof row.CreatedAt === "string"
        ? row.CreatedAt
        : typeof row.created_at === "string"
          ? row.created_at
          : row.created_at == null && row.CreatedAt == null
            ? null
            : String(row.CreatedAt ?? row.created_at),
  };
}

function isJwtExpiredError(error: any) {
  return error?.message?.toLowerCase().includes("jwt expired") ?? false;
}

async function withAuthRetry<T>(
  operation: () => Promise<{ data: T | null; error: any | null }>
): Promise<ApiResponse<T>> {
  let result = await operation();

  if (isJwtExpiredError(result.error)) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshData.session) {
      result = await operation();
    }
  }

  // Use handleApiResponse for standardize logging and error wrapper
  const standard = await handleApiResponse<T>(Promise.resolve(result as any));
  return standard;
}

export async function getApiVaultItems(userId: string): Promise<ApiResponse<ApiVaultItem[]>> {
  const op = () => supabase
    .from(TABLE_NAME)
    .select(selectColumns)
    .eq("UserId", userId)
    .order("CreatedAt", { ascending: false });

  const res = await withAuthRetry<any[]>(op as any);
  if (res.data) {
     return {
        data: res.data.map(item => normalizeItem(item as Record<string, unknown>)),
        error: null
     };
  }
  return { data: null, error: res.error };
}

export async function createApiVaultItem(input: CreateApiVaultInput): Promise<ApiResponse<ApiVaultItem>> {
  const { encrypted, iv } = await encryptValue(input.apiKey);

  const payload = {
    UserId: input.userId,
    Name: input.name,
    Provider: input.provider,
    EncryptedValue: encrypted,
    InitializationVector: iv,
    Description: input.description?.trim() || null,
    Tags: input.tags?.trim() || null,
  };

  const op = () => supabase.from(TABLE_NAME).insert(payload).select(selectColumns).single();
  const res = await withAuthRetry<any>(op as any);
  
  if (res.data) {
    return {
      data: normalizeItem(res.data),
      error: null
    };
  }
  return { data: null, error: res.error };
}

export async function deleteApiVaultItem(id: string): Promise<ApiResponse<null>> {
  const op = () => supabase.from(TABLE_NAME).delete().eq("Id", id);
  return await withAuthRetry<null>(op as any);
}
