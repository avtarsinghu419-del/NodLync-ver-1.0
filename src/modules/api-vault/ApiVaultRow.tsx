import type { ApiVaultItem } from "../../api/apiVaultApi";
import { formatDateTime } from "../../utils/format";
import ApiVaultActions from "./ApiVaultActions";

interface ApiVaultRowProps {
  item: ApiVaultItem;
  decryptedKey?: string;
  isSelected: boolean;
  isVisible: boolean;
  copyFeedback: string | null;
  onToggleSelect: () => void;
  onToggleReveal: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

const ApiVaultRow = ({
  item,
  decryptedKey,
  isSelected,
  isVisible,
  copyFeedback,
  onToggleSelect,
  onToggleReveal,
  onCopy,
  onDelete,
}: ApiVaultRowProps) => {
  return (
    <tr className="border-t border-stroke align-top group hover:bg-surface/40 transition-colors">
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4 accent-primary"
          aria-label={`Select ${item.key_name}`}
        />
      </td>
      <td className="px-4 py-4 text-sm font-semibold text-fg-secondary">{item.key_name}</td>
      <td className="px-4 py-4">
        <span className="text-[10px] px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full font-bold uppercase tracking-wider">
          {item.provider}
        </span>
      </td>
      <td className="px-4 py-4 text-sm text-fg-muted">
        <div className="max-w-xs overflow-hidden">
          <p className="line-clamp-1 opacity-70 mb-2">{item.description || "No description."}</p>
          <div className="font-mono text-xs break-all flex items-center gap-2">
            {isVisible ? (
              <span className="text-emerald-400">{decryptedKey || "Decrypting..."}</span>
            ) : (
              <span className="tracking-widest opacity-40">••••••••••••••••</span>
            )}
            {copyFeedback ? (
               <span className="text-[10px] text-emerald-500 font-bold uppercase">{copyFeedback}</span>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-xs font-mono text-fg-muted">
        {formatDateTime(item.created_at ?? undefined)}
      </td>
      <td className="px-4 py-4">
        <ApiVaultActions
          isVisible={isVisible}
          onToggleReveal={onToggleReveal}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
};

export default ApiVaultRow;
