import { useEffect, useState } from "react";
import useAppStore from "../store/useAppStore";
import { type MyStuffCategory, type MyStuffItem } from "../api/myStuffApi";
import BulkDeleteBar from "../components/BulkDeleteBar";
import InlineSpinner from "../components/InlineSpinner";
import PaginationControls from "../components/PaginationControls";
import { useBulkSelection } from "../hooks/useBulkSelection";
import { usePagination } from "../hooks/usePagination";
import ModuleHeader from "../components/ModuleHeader";
import { useMyStuff } from "../hooks/useMyStuff";

const MyStuffPage = () => {
  const user = useAppStore((s) => s.user);
  const { 
    categories, 
    loadingCategories, 
    addCategory, 
    deleteCategory: deleteCatHook, 
    getItemsQuery,
    addItem: addItemHook,
    deleteItem: deleteItemHook
  } = useMyStuff(user?.id);

  const [selectedCategory, setSelectedCategory] = useState<MyStuffCategory | null>(null);
  const { data: items = [], isLoading: loadingItems } = getItemsQuery(selectedCategory?.id);

  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [catAdding, setCatAdding] = useState(false);

  const [showItemForm, setShowItemForm] = useState(false);
  const [itemAdding, setItemAdding] = useState(false);
  const [deletingCategories, setDeletingCategories] = useState(false);
  const [deletingItems, setDeletingItems] = useState(false);
  const [itemForm, setItemForm] = useState({ title: "", url: "", description: "" });

  const categoriesPagination = usePagination(categories);
  const itemsPagination = usePagination(items);
  const categorySelection = useBulkSelection(categories, (category: MyStuffCategory) => category.id);
  const itemSelection = useBulkSelection(items, (item: MyStuffItem) => item.id);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setCatAdding(true);
    try {
      const res = await addCategory(catName);
      if (res.data) {
        setSelectedCategory(res.data);
        setCatName("");
        setShowCatForm(false);
      }
    } catch {
       alert("Failed to add category.");
    } finally {
      setCatAdding(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !itemForm.title.trim()) return;
    setItemAdding(true);
    try {
      await addItemHook({
        categoryId: selectedCategory.id,
        ...itemForm,
      });
      setItemForm({ title: "", url: "", description: "" });
      setShowItemForm(false);
    } catch {
       alert("Failed to add item.");
    } finally {
      setItemAdding(false);
    }
  };

  const handleDeleteCategory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete category and ALL items?")) return;
    try {
      await deleteCatHook(id);
      if (selectedCategory?.id === id) setSelectedCategory(null);
    } catch {
       alert("Failed to delete category.");
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this bookmark?")) return;
    if (!selectedCategory) return;
    try {
      await deleteItemHook({ id, categoryId: selectedCategory.id });
    } catch {
       alert("Failed to delete item.");
    }
  };

  const handleBulkDeleteCategories = async () => {
    if (!window.confirm(`Delete ${categorySelection.selectedCount} categories?`)) return;
    setDeletingCategories(true);
    try {
      await Promise.all(Array.from(categorySelection.selectedIds).map((id) => deleteCatHook(id)));
      categorySelection.clearSelection();
      setSelectedCategory(null);
    } finally {
      setDeletingCategories(false);
    }
  };

  const handleBulkDeleteItems = async () => {
    if (!selectedCategory || !window.confirm(`Delete ${itemSelection.selectedCount} items?`)) return;
    setDeletingItems(true);
    try {
      const ids = Array.from(itemSelection.selectedIds);
      await Promise.all(ids.map((id) => deleteItemHook({ id, categoryId: selectedCategory.id })));
      itemSelection.clearSelection();
    } finally {
      setDeletingItems(false);
    }
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col lg:flex-row gap-6">
      {/* Categories Sidebar */}
      <div className="w-full lg:w-72 flex flex-col bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-sm shrink-0">
        <ModuleHeader
          title="Categories"
          description="SORT YOUR RESOURCES"
          icon="📂"
        >
          <button
            onClick={() => setShowCatForm(true)}
            className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-300 transition-colors"
          >
            +
          </button>
        </ModuleHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loadingCategories ? (
            <div className="py-12 flex justify-center"><InlineSpinner /></div>
          ) : (
            <>
               <BulkDeleteBar 
                 count={categorySelection.selectedCount} 
                 label="categories"
                 onDelete={handleBulkDeleteCategories} 
                 onClear={categorySelection.clearSelection}
                 busy={deletingCategories}
               />
               {categoriesPagination.paginatedItems.map((cat) => (
                 <div
                   key={cat.id}
                   onClick={() => setSelectedCategory(cat)}
                   className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${selectedCategory?.id === cat.id ? "bg-primary border-primary text-slate-900" : "bg-slate-800/20 border-slate-700/50 text-slate-400 hover:border-slate-600"}`}
                 >
                   <div className="flex items-center gap-3">
                     <input
                       type="checkbox"
                       checked={categorySelection.isSelected(cat.id)}
                       onChange={() => categorySelection.toggleOne(cat.id)}
                       onClick={(e) => e.stopPropagation()}
                       className={`rounded border-slate-700 bg-slate-900 text-slate-900 focus:ring-slate-900/10 ${selectedCategory?.id === cat.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                     />
                     <span className="text-sm font-semibold truncate">{cat.name}</span>
                   </div>
                   <button
                     onClick={(e) => handleDeleteCategory(cat.id, e)}
                     className={`text-xs opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-900/20 rounded ${selectedCategory?.id === cat.id ? "text-slate-900" : "text-rose-400"}`}
                   >
                     🗑️
                   </button>
                 </div>
               ))}
               <PaginationControls
                  currentPage={categoriesPagination.currentPage}
                  pageSize={categoriesPagination.pageSize}
                  totalItems={categoriesPagination.totalItems}
                  totalPages={categoriesPagination.totalPages}
                  startItem={categoriesPagination.startItem}
                  endItem={categoriesPagination.endItem}
                  onPageChange={categoriesPagination.setCurrentPage}
                  onPageSizeChange={categoriesPagination.setPageSize}
                  itemLabel="cats"
               />
            </>
          )}
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="flex-1 flex flex-col bg-surface rounded-2xl border border-slate-800 shadow-2xl overflow-hidden min-h-0">
        <ModuleHeader
          title={selectedCategory?.name || "My Stuff"}
          description="ALL YOUR LINKS AND RESOURCES IN ONE PLACE"
          icon="⭐"
        >
          {selectedCategory && (
            <button
              onClick={() => setShowItemForm(true)}
              className="btn-primary py-2 px-4 text-xs font-bold"
            >
              Add Shortcut
            </button>
          )}
        </ModuleHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {!selectedCategory ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <span className="text-4xl text-slate-700">📚</span>
              <p className="text-sm font-medium">Select a category to see your bookmarks.</p>
            </div>
          ) : loadingItems && items.length === 0 ? (
            <div className="h-full flex items-center justify-center"><InlineSpinner /></div>
          ) : (
            <div className="space-y-6">
              <BulkDeleteBar 
                 count={itemSelection.selectedCount} 
                 label="items"
                 onDelete={handleBulkDeleteItems} 
                 onClear={itemSelection.clearSelection}
                 busy={deletingItems}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {itemsPagination.paginatedItems.map((item) => (
                   <div
                     key={item.id}
                     className="group glass-panel-light p-5 hover:border-primary/30 transition-all border border-slate-800/50 bg-slate-800/10 relative overflow-hidden"
                   >
                     <div className="flex items-start justify-between">
                       <input
                         type="checkbox"
                         checked={itemSelection.isSelected(item.id)}
                         onChange={() => itemSelection.toggleOne(item.id)}
                         className="rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary/20"
                       />
                       <button
                         onClick={(e) => handleDeleteItem(item.id, e)}
                         className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-rose-400 p-1.5"
                       >
                         🗑️
                       </button>
                     </div>
                     <a
                       href={item.url ? (item.url.startsWith("http") ? item.url : `https://${item.url}`) : "#"}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="block mt-4"
                     >
                       <h4 className="text-slate-100 font-bold truncate text-sm group-hover:text-primary transition-colors">{item.title}</h4>
                       <p className="text-xxs text-slate-500 mt-1 truncate font-mono">{item.url || "no-url"}</p>
                       <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">{item.description || "No description provided."}</p>
                     </a>
                     
                     <div className="mt-4 flex justify-end">
                       <span className="text-[10px] text-slate-600 uppercase tracking-tighter">View Source ➔</span>
                     </div>
                   </div>
                 ))}
              </div>

               {items.length === 0 && (
                 <div className="py-24 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                    <p className="text-slate-500 text-sm">No shortcuts in this category yet.</p>
                 </div>
               )}

               <PaginationControls
                  currentPage={itemsPagination.currentPage}
                  pageSize={itemsPagination.pageSize}
                  totalItems={itemsPagination.totalItems}
                  totalPages={itemsPagination.totalPages}
                  startItem={itemsPagination.startItem}
                  endItem={itemsPagination.endItem}
                  onPageChange={itemsPagination.setCurrentPage}
                  onPageSizeChange={itemsPagination.setPageSize}
                  itemLabel="bookmarks"
               />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel p-8 shadow-2xl relative">
             <button onClick={() => setShowCatForm(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300">×</button>
             <h3 className="text-xl font-bold text-slate-100 mb-6">New Category</h3>
             <form onSubmit={handleAddCategory} className="space-y-6">
                <input
                  autoFocus
                  required
                  placeholder="Category Name..."
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-5 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-100"
                />
                <button
                  type="submit"
                  disabled={catAdding}
                  className="w-full py-4 rounded-xl bg-primary text-slate-900 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {catAdding ? "Adding..." : "Create Category"}
                </button>
             </form>
          </div>
        </div>
      )}

      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel p-8 shadow-2xl relative">
             <button onClick={() => setShowItemForm(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300">×</button>
             <h3 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                <span>➕ New Shortcut</span>
                <span className="text-xxs px-2 py-1 bg-primary/10 text-primary rounded-full uppercase tracking-tighter">to {selectedCategory?.name}</span>
             </h3>
             <form onSubmit={handleAddItem} className="space-y-5">
                <div className="space-y-1.5">
                   <label className="text-xxs uppercase tracking-widest text-slate-500 font-bold ml-1">Label</label>
                   <input
                    required
                    placeholder="Short title..."
                    value={itemForm.title}
                    onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-5 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                   <label className="text-xxs uppercase tracking-widest text-slate-500 font-bold ml-1">Web Address</label>
                   <input
                    required
                    placeholder="https://quixly.app"
                    value={itemForm.url}
                    onChange={(e) => setItemForm({ ...itemForm, url: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-5 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                   <label className="text-xxs uppercase tracking-widest text-slate-500 font-bold ml-1">Short Context</label>
                   <textarea
                    placeholder="Why this matters..."
                    rows={3}
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-5 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-100 resize-none"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={itemAdding}
                    className="w-full py-4 rounded-xl bg-primary text-slate-900 font-bold hover:shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                  >
                    {itemAdding ? "Saving..." : "Save Benchmark"}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyStuffPage;
