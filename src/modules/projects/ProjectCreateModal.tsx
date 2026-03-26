import type { ProjectStatus } from "../../types";
import ProjectForm from "./ProjectForm";

interface Props {
  isOpen: boolean;
  busy: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string;
    status: ProjectStatus;
  }) => Promise<void>;
}

const ProjectCreateModal = ({ isOpen, busy, error, onClose, onSubmit }: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-panel/80 px-4 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <ProjectForm
          key="create-project-modal"
          mode="create"
          initial={null}
          onSubmit={onSubmit}
          onCancel={onClose}
          busy={busy}
          error={error}
        />
      </div>
    </div>
  );
};

export default ProjectCreateModal;
