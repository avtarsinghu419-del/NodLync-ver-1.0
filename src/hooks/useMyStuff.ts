import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getCategories, 
  createCategory, 
  deleteCategory, 
  getItems, 
  createItem, 
  deleteItem 
} from "../api/myStuffApi";

const STUFF_CATS_KEY = ["stuff", "categories"];
const STUFF_ITEMS_KEY = ["stuff", "items"];

export function useMyStuff(userId?: string) {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: [...STUFF_CATS_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await getCategories(userId);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!userId,
  });

  const getItemsQuery = (categoryId?: string) => useQuery({
    queryKey: [...STUFF_ITEMS_KEY, categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data, error } = await getItems(categoryId);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!categoryId,
  });

  const categoryMutation = useMutation({
    mutationFn: (name: string) => {
      if (!userId) throw new Error("No user ID");
      return createCategory({ name, user_id: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...STUFF_CATS_KEY, userId] });
    },
  });

  const itemMutation = useMutation({
    mutationFn: (payload: { categoryId: string; title: string; url: string; description: string }) => {
      if (!userId) throw new Error("No user ID");
      return createItem({
        user_id: userId,
        category_id: payload.categoryId,
        title: payload.title,
        url: payload.url,
        description: payload.description,
      });
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: [...STUFF_ITEMS_KEY, variables.categoryId] });
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...STUFF_CATS_KEY, userId] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ id }: { id: string; categoryId: string }) => deleteItem(id),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: [...STUFF_ITEMS_KEY, variables.categoryId] });
    },
  });

  return {
    categories: categoriesQuery.data ?? [],
    loadingCategories: categoriesQuery.isLoading,
    addCategory: (name: string) => categoryMutation.mutateAsync(name),
    deleteCategory: (id: string) => deleteCatMutation.mutateAsync(id),
    getItemsQuery,
    addItem: (p: any) => itemMutation.mutateAsync(p),
    deleteItem: (p: { id: string; categoryId: string }) => deleteItemMutation.mutateAsync(p),
  };
}
