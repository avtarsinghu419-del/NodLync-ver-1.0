import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTaskItems, createTaskItem, updateTaskItem, deleteTaskItem, type TaskItem } from "../api/tasksApi";
import useAppStore from "../store/useAppStore";

const TASKS_KEY = ["tasks"];

/**
 * Hook for managing tasks with React Query (caching, deduplication, optimistic updates).
 */
export function useTasks(projectId?: string | null) {
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);

  const {
    data: tasks = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...TASKS_KEY, projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await getTaskItems(projectId);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!projectId,
  });

  // Create Task Mutation
  const createMutation = useMutation({
    mutationFn: (payload: { title: string; milestone_id: string; priority?: TaskItem["priority"] }) => {
      if (!projectId || !user) throw new Error("Missing context");
      return createTaskItem({
        ...payload,
        project_id: projectId,
        status: "not_done",
        priority: payload.priority ?? "medium",
        is_completed: false,
      });
    },
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: [...TASKS_KEY, projectId] });
      const previousTasks = queryClient.getQueryData<TaskItem[]>([...TASKS_KEY, projectId]);

      const optimisticTask: TaskItem = {
        ...newTask,
        id: `temp-${Date.now()}`,
        project_id: projectId || "",
        status: "not_done",
        priority: newTask.priority ?? "medium",
        is_completed: false,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<TaskItem[]>([...TASKS_KEY, projectId], (old) => [
        ...(old || []),
        optimisticTask,
      ]);

      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData([...TASKS_KEY, projectId], context?.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...TASKS_KEY, projectId] });
    },
  });

  // Update Task Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TaskItem> }) => 
      updateTaskItem(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: [...TASKS_KEY, projectId] });
      const previousTasks = queryClient.getQueryData<TaskItem[]>([...TASKS_KEY, projectId]);

      queryClient.setQueryData<TaskItem[]>([...TASKS_KEY, projectId], (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );

      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData([...TASKS_KEY, projectId], context?.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...TASKS_KEY, projectId] });
    },
  });

  // Delete Task Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaskItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [...TASKS_KEY, projectId] });
      const previousTasks = queryClient.getQueryData<TaskItem[]>([...TASKS_KEY, projectId]);

      queryClient.setQueryData<TaskItem[]>([...TASKS_KEY, projectId], (old) =>
        old?.filter((t) => t.id !== id)
      );

      return { previousTasks };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData([...TASKS_KEY, projectId], context?.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...TASKS_KEY, projectId] });
    },
  });

  return {
    tasks,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    fetchTasks: refetch,
    addTask: (payload: { title: string; milestone_id: string; priority?: TaskItem["priority"] }) => 
      createMutation.mutateAsync(payload),
    updateTask: (id: string, updates: Partial<TaskItem>) => 
      updateMutation.mutateAsync({ id, updates }),
    removeTask: (id: string) => 
      deleteMutation.mutateAsync(id),
  };
}
