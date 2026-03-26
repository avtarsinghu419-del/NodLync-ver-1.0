import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUserItem,
  deleteUserItem,
  getUserItems,
  listUserItemTags,
  updateUserItem,
  type UserItem,
  type UserItemsQuery,
} from "../api/userItemsApi";

const USER_ITEMS_KEY = ["user-items"];
const USER_ITEM_TAGS_KEY = ["user-item-tags"];

export function useUserItems(filters: UserItemsQuery | null) {
  const queryClient = useQueryClient();
  const userId = filters?.userId;

  const itemsQuery = useQuery({
    queryKey: [...USER_ITEMS_KEY, filters],
    queryFn: async () => {
      if (!filters) return { items: [], total: 0 };
      const { data, error } = await getUserItems(filters);
      if (error) throw new Error(error.message);
      return data ?? { items: [], total: 0 };
    },
    enabled: !!filters?.userId,
    placeholderData: (previousData) => previousData,
  });

  const tagsQuery = useQuery({
    queryKey: [...USER_ITEM_TAGS_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await listUserItemTags(userId);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: createUserItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ITEMS_KEY });
      queryClient.invalidateQueries({ queryKey: [...USER_ITEM_TAGS_KEY, userId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<UserItem, "id" | "user_id" | "created_at">> }) =>
      updateUserItem(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ITEMS_KEY });
      queryClient.invalidateQueries({ queryKey: [...USER_ITEM_TAGS_KEY, userId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUserItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ITEMS_KEY });
      queryClient.invalidateQueries({ queryKey: [...USER_ITEM_TAGS_KEY, userId] });
    },
  });

  return {
    items: itemsQuery.data?.items ?? [],
    total: itemsQuery.data?.total ?? 0,
    loading: itemsQuery.isLoading,
    fetching: itemsQuery.isFetching,
    error: itemsQuery.error ? (itemsQuery.error as Error).message : null,
    tags: tagsQuery.data ?? [],
    tagsLoading: tagsQuery.isLoading,
    createItem: createMutation.mutateAsync,
    updateItem: updateMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync,
    busyCreating: createMutation.isPending,
    busyUpdating: updateMutation.isPending,
    busyDeleting: deleteMutation.isPending,
  };
}
