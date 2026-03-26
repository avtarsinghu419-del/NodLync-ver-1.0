import { supabase } from "./supabaseClient";
import { handleApiResponse, type ApiResponse } from "./apiHelper";
import type { PostgrestError } from "@supabase/supabase-js";
import type { AppLogRow, SystemLogEntry, SystemLogType } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeModule(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text.toLowerCase() : "app";
}

function normalizeMessage(details: unknown, fallback: string) {
  if (isRecord(details)) {
    const msg = details.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  if (typeof details === "string") return details;
  try {
    return details ? JSON.stringify(details) : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeAppLogRow(row: AppLogRow): SystemLogEntry {
  const details = isRecord(row.details) ? row.details : undefined;
  const module = normalizeModule(details?.module ?? row.action);
  const message = normalizeMessage(row.details, row.action || "Log event");
  const type = (row.status ?? "info") as SystemLogType;
  return {
    id: row.id,
    type,
    module,
    message,
    timestamp: row.created_at,
    raw: row,
  };
}

export async function listAppLogs(
  userId: string,
  opts?: { limit?: number }
): Promise<ApiResponse<SystemLogEntry[]>> {
  const limit = opts?.limit ?? 100;
  const promise = supabase
    .from("app_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit) as unknown as Promise<{
      data: AppLogRow[] | null;
      error: PostgrestError | null;
    }>;
  const response = await handleApiResponse<AppLogRow[]>(
    promise
  );

  if (response.error || !response.data) return response as unknown as ApiResponse<SystemLogEntry[]>;
  return { data: response.data.map(normalizeAppLogRow), error: null };
}

export async function clearAppLogs(userId: string): Promise<ApiResponse<null>> {
  const promise = supabase
    .from("app_logs")
    .delete()
    .eq("user_id", userId) as unknown as Promise<{ data: null; error: PostgrestError | null }>;
  return handleApiResponse<null>(promise);
}

export async function createAppLog(payload: {
  userId: string;
  type: SystemLogType;
  module: string;
  message: string;
  projectId?: string;
  meta?: Record<string, unknown>;
}): Promise<ApiResponse<SystemLogEntry>> {
  const now = new Date().toISOString();
  const row = {
    user_id: payload.userId,
    action: payload.module,
    status: payload.type,
    details: {
      module: payload.module,
      message: payload.message,
      projectId: payload.projectId ?? null,
      meta: payload.meta ?? null,
      at: now,
    },
  };

  const response = await handleApiResponse<AppLogRow>(
    supabase
      .from("app_logs")
      .insert(row)
      .select("*")
      .single() as unknown as Promise<{ data: AppLogRow | null; error: PostgrestError | null }>
  );

  if (response.error || !response.data) return response as unknown as ApiResponse<SystemLogEntry>;
  return { data: normalizeAppLogRow(response.data), error: null };
}
