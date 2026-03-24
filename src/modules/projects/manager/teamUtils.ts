export type ProjectRole = "owner" | "admin" | "editor" | "viewer";

export interface TeamMemberView {
  id: string;
  project_id?: string;
  user_id: string;
  display_name: string;
  avatar_url?: string;
  email?: string;
  role: ProjectRole;
  isOwner?: boolean;
}

export const ROLE_OPTIONS: ProjectRole[] = ["owner", "admin", "editor", "viewer"];

export const ROLE_STYLES: Record<ProjectRole, string> = {
  owner: "text-primary border-primary/30 bg-primary/10",
  admin: "text-emerald-400 border-emerald-700 bg-emerald-900/20",
  editor: "text-amber-400 border-amber-700 bg-amber-900/20",
  viewer: "text-fg-muted border-stroke bg-surface",
};

const ROLE_ORDER: Record<ProjectRole, number> = {
  owner: 0,
  admin: 1,
  editor: 2,
  viewer: 3,
};

export function sortTeamMembers<T extends TeamMemberView>(members: T[]): T[] {
  return [...members].sort((left, right) => {
    const roleDiff = ROLE_ORDER[left.role] - ROLE_ORDER[right.role];
    if (roleDiff !== 0) return roleDiff;
    return left.display_name.localeCompare(right.display_name);
  });
}
