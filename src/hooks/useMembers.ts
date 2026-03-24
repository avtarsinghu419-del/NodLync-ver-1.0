import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getProjectMembers, 
  addProjectMember, 
  updateProjectMemberRole, 
  deleteProjectMember, 
  searchUsers as searchUsersApi
} from "../api/membersApi";

const MEMBERS_KEY = ["project-members"];

export function useMembers(projectId?: string) {
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: [...MEMBERS_KEY, projectId],
    queryFn: async () => {
      if (!projectId) return [];
      console.log("Fetching members for project:", projectId);
      const { data, error } = await getProjectMembers(projectId);
      if (error) {
        console.error("Fetch members error:", error);
        throw new Error(error.message);
      }
      console.log("Fetched members:", data?.length || 0);
      return data ?? [];
    },
    enabled: !!projectId,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (payload: { user_id: string; role: string }) => {
      if (!projectId) throw new Error("No project ID");
      console.log("Mutating addMember:", payload);
      const { data, error } = await addProjectMember({ project_id: projectId, ...payload });
      if (error) {
        console.error("Mutation addMember error:", error);
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: () => {
      console.log("Addition succesful, invalidating cache...");
      queryClient.invalidateQueries({ queryKey: [...MEMBERS_KEY, projectId] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => updateProjectMemberRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...MEMBERS_KEY, projectId] });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id: string) => deleteProjectMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...MEMBERS_KEY, projectId] });
    },
  });

  const addMember = useCallback(
    (payload: { user_id: string; role: string }) => addMemberMutation.mutateAsync(payload),
    [addMemberMutation]
  );

  const updateRole = useCallback(
    (payload: { id: string; role: string }) => updateRoleMutation.mutateAsync(payload),
    [updateRoleMutation]
  );

  const deleteMember = useCallback(
    (id: string) => deleteMemberMutation.mutateAsync(id),
    [deleteMemberMutation]
  );

  const searchUsers = useCallback((query: string) => searchUsersApi(query), []);

  return {
    members: membersQuery.data ?? [],
    loading: membersQuery.isLoading,
    addMember,
    updateRole,
    deleteMember,
    searchUsers,
  };
}
