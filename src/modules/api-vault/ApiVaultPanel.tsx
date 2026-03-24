import { useEffect, useMemo, useState } from "react";
import {
  createApiVaultItem,
  deleteApiVaultItem,
  getApiVaultItems,
  type ApiVaultItem,
} from "../../api/apiVaultApi";
import { decryptValue } from "../../api/encryptionHelper";
import BulkDeleteBar from "../../components/BulkDeleteBar";
import InlineSpinner from "../../components/InlineSpinner";
import PaginationControls from "../../components/PaginationControls";
import ModuleHeader from "../../components/ModuleHeader";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import { usePagination } from "../../hooks/usePagination";
import useAppStore from "../../store/useAppStore";
import ApiVaultModal, { type ApiVaultFormValues } from "./ApiVaultModal";
import ApiVaultPopup from "./ApiVaultPopup";
import ApiVaultTable from "./ApiVaultTable";

const ApiVaultPanel = () => {
  const user = useAppStore((s) => s.user);
  const projectName = useAppStore((s) => s.selectedProject?.name);

  const [items, setItems] = useState<ApiVaultItem[]>([]);
  const [decryptedKeys, setDecryptedKeys] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savePopupMessage, setSavePopupMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const loadItems = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      const { data, error } = await getApiVaultItems(user.id);
      if (error) setErrorMessage(error.message ?? "Unable to load API keys.");
      else setItems(data ?? []);
      setIsLoading(false);
    };

    loadItems();
  }, [user]);

  useEffect(() => {
    if (!copiedId) return;
    const timeout = window.setTimeout(() => setCopiedId(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedId]);

  const filteredItems = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const tagQuery = tagFilter.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !search || item.key_name.toLowerCase().includes(search) || item.provider.toLowerCase().includes(search);
      const matchesTag = !tagQuery || (item.tags ?? "").toLowerCase().includes(tagQuery);
      return matchesSearch && matchesTag;
    });
  }, [items, searchTerm, tagFilter]);

  const pagination = usePagination(filteredItems);
  const selection = useBulkSelection(filteredItems, (item) => item.id);
  const pageState = selection.getPageState(pagination.paginatedItems);

  const handleCreate = async (values: ApiVaultFormValues): Promise<boolean> => {
    if (!user) return false;
    setIsSubmitting(true);
    setErrorMessage(null);

    const { data, error } = await createApiVaultItem({
      userId: user.id,
      name: values.name,
      provider: values.provider,
      apiKey: values.apiKey,
      description: values.description,
      tags: values.tags,
    });

    if (error) {
      setErrorMessage(error.message ?? "Failed to save API key.");
      setIsSubmitting(false);
      return false;
    } else if (data) {
      setItems((current) => [data, ...current]);
      setSavePopupMessage(`"${values.name}" saved to vault.`);
      setIsModalOpen(false);
      setIsSubmitting(false);
      return true;
    }
    setIsSubmitting(false);
    return false;
  };

  const handleDelete = async (item: ApiVaultItem) => {
    if (!window.confirm(`Delete key "${item.key_name}"?`)) return;
    setErrorMessage(null);
    const { error } = await deleteApiVaultItem(item.id);
    if (error) {
      setErrorMessage(error.message ?? "Failed to delete API key.");
      return;
    }
    setItems((current) => current.filter((i) => i.id !== item.id));
    setVisibleIds((current) => current.filter((id) => id !== item.id));
    setDecryptedKeys((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selection.selectedCount} selected API keys?`)) return;
    setErrorMessage(null);
    setBulkDeleting(true);
    const ids = Array.from(selection.selectedIds);
    const results = await Promise.all(ids.map((id) => deleteApiVaultItem(id)));
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      setErrorMessage(failed.error.message ?? "Unable to delete selected API keys.");
      setBulkDeleting(false);
      return;
    }

    setItems((current) => current.filter((item) => !selection.selectedIds.has(item.id)));
    setVisibleIds((current) => current.filter((id) => !selection.selectedIds.has(id)));
    setDecryptedKeys((prev) => {
        const next = { ...prev };
        ids.forEach(id => delete next[id]);
        return next;
    });
    selection.clearSelection();
    setBulkDeleting(false);
  };

  const handleToggleReveal = async (id: string) => {
    const isVisible = visibleIds.includes(id);
    if (isVisible) {
      setVisibleIds((current) => current.filter((entry) => entry !== id));
    } else {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      try {
        const decoded = await decryptValue(item.api_key, item.initialization_vector);
        setDecryptedKeys((prev) => ({ ...prev, [id]: decoded }));
        setVisibleIds((current) => [...current, id]);
      } catch (err) {
        setErrorMessage("Decryption failed. The key might be incompatible.");
      }
    }
  };

  const handleCopy = async (item: ApiVaultItem) => {
    try {
      let value = decryptedKeys[item.id];
      if (!value) {
        value = await decryptValue(item.api_key, item.initialization_vector);
        setDecryptedKeys((prev) => ({ ...prev, [item.id]: value }));
      }
      await navigator.clipboard.writeText(value);
      setCopiedId(item.id);
    } catch {
      setErrorMessage("Copy failed. Try revealing and copying manually.");
    }
  };

  // Map items for table to use decrypted values where revealed
  const displayItems = pagination.paginatedItems.map(item => ({
      ...item,
      api_key: decryptedKeys[item.id] || item.api_key
  }));

  return (
    <>
      <div className="space-y-6">
        <ModuleHeader
          title="API Vault"
          description="STORE, SEARCH, REVEAL, AND MANAGE PROVIDER KEYS"
          icon="🔑"
        >
          <span className="text-xs text-fg-muted mr-2">Project context: {projectName ?? "Pick a project"}</span>
          <button type="button" className="btn-primary py-2 text-sm font-bold" onClick={() => setIsModalOpen(true)}>
            Add API Key
          </button>
        </ModuleHeader>

        <div className="glass-panel p-6 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid flex-1 gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-fg-muted">Search</span>
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    pagination.setCurrentPage(1);
                  }}
                  placeholder="Search by name or provider"
                  className="w-full rounded-lg border border-stroke bg-surface px-3 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-fg-muted">Tag Filter</span>
                <input
                  value={tagFilter}
                  onChange={(e) => {
                    setTagFilter(e.target.value);
                    pagination.setCurrentPage(1);
                  }}
                  placeholder="Filter by tag text"
                  className="w-full rounded-lg border border-stroke bg-surface px-3 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
                />
              </label>
            </div>

            <div className="text-sm text-fg-muted">{filteredItems.length} of {items.length} keys shown</div>
          </div>

          <BulkDeleteBar
            count={selection.selectedCount}
            label="keys"
            onDelete={handleBulkDelete}
            onClear={selection.clearSelection}
            busy={bulkDeleting}
          />

          {errorMessage ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center">
              <InlineSpinner />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-stroke bg-panel/30 px-6 text-center">
              <p className="text-lg font-medium text-fg-secondary">{items.length === 0 ? "No API keys saved yet." : "No keys match your filters."}</p>
              <p className="mt-2 max-w-md text-sm text-fg-muted">
                {items.length === 0
                  ? "Add your first provider credential to start managing keys here."
                  : "Try a broader search or clear the tag filter to see more results."}
              </p>
            </div>
          ) : (
            <ApiVaultTable
              items={displayItems}
              visibleIds={new Set(visibleIds)}
              selectedIds={selection.selectedIds}
              allSelected={pageState.checked}
              indeterminate={pageState.indeterminate}
              deletingId={null}
              copiedId={copiedId}
              onToggleAll={() => selection.togglePage(pagination.paginatedItems)}
              onToggleSelect={selection.toggleOne}
              onToggleReveal={handleToggleReveal}
              onCopy={handleCopy}
              onDelete={handleDelete}
            />
          )}

          {filteredItems.length > 0 ? (
            <PaginationControls
              currentPage={pagination.currentPage}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              totalPages={pagination.totalPages}
              startItem={pagination.startItem}
              endItem={pagination.endItem}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
              itemLabel="keys"
            />
          ) : null}
        </div>
      </div>

      <ApiVaultModal isOpen={isModalOpen} isSubmitting={isSubmitting} onClose={() => setIsModalOpen(false)} onSubmit={handleCreate} />

      {savePopupMessage ? <ApiVaultPopup message={savePopupMessage} onClose={() => setSavePopupMessage(null)} /> : null}
    </>
  );
};

export default ApiVaultPanel;
