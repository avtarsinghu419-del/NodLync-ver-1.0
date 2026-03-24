import type { User } from "@supabase/supabase-js";

export type ProjectStatus = "draft" | "active" | "paused" | "archived";

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

export interface AppUser extends User {}
