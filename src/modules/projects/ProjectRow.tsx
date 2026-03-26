import { useRef } from "react";
import StatusBadge from "../../components/StatusBadge";
import type { Project } from "../../types";

interface ProjectRowProps {
  project: Project;
  selected: boolean;
  checked: boolean;
  onToggleSelected: () => void;
  onSelect: () => void;
  onOpen: () => void;
}

const ProjectRow = ({
  project,
  selected,
  checked,
  onToggleSelected,
  onSelect,
  onOpen,
}: ProjectRowProps) => {
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRowClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      onOpen();
      return;
    }

    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      onSelect();
    }, 220);
  };

  return (
    <div
      className={`group rounded-xl border px-4 py-3 transition-all duration-150 ${
        selected
          ? "border-primary/40 bg-primary/10 shadow-lg shadow-primary/10"
          : "border-stroke bg-surface/30 hover:border-stroke-strong hover:bg-surface/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleSelected}
          onClick={(event) => event.stopPropagation()}
          className="mt-1 h-4 w-4 shrink-0 accent-primary"
          aria-label={`Select ${project.name}`}
        />

        <button
          type="button"
          className="min-w-0 flex-1 text-left outline-none"
          onClick={handleRowClick}
          title="Single click to select. Double click to open full view."
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className={`truncate text-sm font-semibold ${selected ? "text-primary" : "text-fg-secondary"}`}>
              {project.name}
            </p>
            {project.is_shared ? (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-sky-300">
                Shared
              </span>
            ) : null}
            <StatusBadge status={project.status} />
          </div>

          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-fg-muted">
            {project.description?.trim() ? project.description : "No description"}
          </p>
        </button>

        <button
          type="button"
          className="btn-ghost shrink-0 whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-widest opacity-0 transition group-hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          Open
        </button>
      </div>
    </div>
  );
};

export default ProjectRow;
