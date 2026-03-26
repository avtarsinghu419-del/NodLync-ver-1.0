import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCategories,
  createCategory,
  deleteCategory,
  updateCategory,
  getItems,
  createItem,
  updateItem,
  deleteItem,
} from "../api/myStuffApi";

const MY_STUFF_CATEGORIES_KEY = ["my-stuff-categories"];
const MY_STUFF_ITEMS_KEY = ["my-stuff-items"];

export function useMyStuff(userId: string | null) {
  const queryClient = useQueryClient();

  // Categories
  const categoriesQuery = useQuery({
    queryKey: [...MY_STUFF_CATEGORIES_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await getCategories(userId);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!userId,
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_STUFF_CATEGORIES_KEY });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string } }) => updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_STUFF_CATEGORIES_KEY });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_STUFF_CATEGORIES_KEY });
    },
  });

  // Items (by Category)
  const getItemsForCategory = async (categoryId: string) => {
    const { data, error } = await getItems(categoryId);
    if (error) throw new Error(error.message);
    return data ?? [];
  };

  const createItemMutation = useMutation({
    mutationFn: createItem,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...MY_STUFF_ITEMS_KEY, variables.category_id] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateItem(id, payload),
    onSuccess: () => {
      // We don't have category_id in variables directly sometimes if we only partial update
      // But we can invalidate all items or use a specific pattern
      queryClient.invalidateQueries({ queryKey: MY_STUFF_ITEMS_KEY });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ id }: { id: string; categoryId: string }) => deleteItem(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...MY_STUFF_ITEMS_KEY, variables.categoryId] });
    },
  });

  return {
    categories: categoriesQuery.data ?? [],
    loadingCategories: categoriesQuery.isLoading,
    categoriesError: categoriesQuery.error ? (categoriesQuery.error as Error).message : null,

    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    busyCreatingCategory: createCategoryMutation.isPending,

    createItem: createItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,
    busyCreatingItem: createItemMutation.isPending,
    busyUpdatingItem: updateItemMutation.isPending,

    getItemsForCategory,
  };
}

export function useMyStuffItems(categoryId: string | null) {
  return useQuery({
    queryKey: [...MY_STUFF_ITEMS_KEY, categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data, error } = await getItems(categoryId);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!categoryId,
  });
}
