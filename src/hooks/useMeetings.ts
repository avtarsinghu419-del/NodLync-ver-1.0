import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMeetings, createMeeting, updateMeeting, deleteMeeting, type MeetingLink } from "../api/meetingsApi";
import useAppStore from "../store/useAppStore";

const MEETINGS_KEY = ["meetings"];

export function useMeetings() {
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);

  const {
    data: meetingsSize = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [...MEETINGS_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await getMeetings(user.id);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: (payload: Omit<MeetingLink, "id" | "user_id" | "created_at"> & { user_id: string }) => {
      return createMeeting(payload);
    },
    onMutate: async (newMeeting) => {
      await queryClient.cancelQueries({ queryKey: [...MEETINGS_KEY, user?.id] });
      const previous = queryClient.getQueryData<MeetingLink[]>([...MEETINGS_KEY, user?.id]);
      
      const optimistic: MeetingLink = {
        ...newMeeting,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<MeetingLink[]>([...MEETINGS_KEY, user?.id], (old) => [
        ...(old || []),
        optimistic,
      ]);

      return { previous };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData([...MEETINGS_KEY, user?.id], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...MEETINGS_KEY, user?.id] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MeetingLink> }) => 
      updateMeeting(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: [...MEETINGS_KEY, user?.id] });
      const previous = queryClient.getQueryData<MeetingLink[]>([...MEETINGS_KEY, user?.id]);

      queryClient.setQueryData<MeetingLink[]>([...MEETINGS_KEY, user?.id], (old) =>
        old?.map((m) => (m.id === id ? { ...m, ...payload } : m))
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData([...MEETINGS_KEY, user?.id], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...MEETINGS_KEY, user?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMeeting(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [...MEETINGS_KEY, user?.id] });
      const previous = queryClient.getQueryData<MeetingLink[]>([...MEETINGS_KEY, user?.id]);

      queryClient.setQueryData<MeetingLink[]>([...MEETINGS_KEY, user?.id], (old) =>
        old?.filter((m) => m.id !== id)
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData([...MEETINGS_KEY, user?.id], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...MEETINGS_KEY, user?.id] });
    },
  });

  return {
    meetings: meetingsSize,
    loading: isLoading,
    fetching: isFetching,
    error: error ? (error as Error).message : null,
    fetchMeetings: refetch,
    addMeeting: (p: any) => createMutation.mutateAsync(p),
    updateMeeting: (id: string, p: any) => updateMutation.mutateAsync({ id, payload: p }),
    removeMeeting: (id: string) => deleteMutation.mutateAsync(id),
  };
}
