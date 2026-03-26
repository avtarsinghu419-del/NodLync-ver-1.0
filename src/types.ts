import type { User } from "@supabase/supabase-js";

export type ProjectStatus = "draft" | "active" | "paused" | "archived";

export type SystemLogType = "info" | "error" | "success";

export interface SystemLogEntry {
  id: string;
  type: SystemLogType;
  module: string;
  message: string;
  timestamp: string;
  raw?: unknown;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  user_id: string;
  created_at?: string;
  access_role?: "owner" | "admin" | "editor" | "viewer";
  is_shared?: boolean;
}

export interface ProjectPayload {
  name: string;
  description: string;
  status: ProjectStatus;
  user_id: string;
}

export type AppUser = User;

export interface UserProfile {
  id: string; // references auth.users UUID
  display_name: string;
  avatar_url: string;
  updated_at?: string;
}

export interface AppSettings {
  id?: string;
  user_id: string;
  theme: string;
  default_project_view?: string;
  default_ai_provider: string;
  notifications_enabled: boolean;
  auto_update_enabled: boolean;
  updated_at?: string;
}

export interface AppLogRow {
  id: string;
  user_id: string;
  action: string;
  status: "success" | "error" | "info";
  details: unknown;
  created_at: string;
}
