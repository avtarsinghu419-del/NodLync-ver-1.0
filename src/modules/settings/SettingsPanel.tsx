import useAppStore from "../../store/useAppStore";

const SettingsPanel = () => {
  const user = useAppStore((s) => s.user);
  return (
    <div className="glass-panel p-6 space-y-3">
      <p className="text-xl font-semibold">Settings</p>
      <p className="text-sm text-fg-muted">
        Sync this with your WPF preferences. Authenticated user is already in
        scope for saving per-account settings.
      </p>
      <div className="rounded-lg border border-stroke bg-surface px-4 py-3 text-sm text-fg-secondary space-y-1">
        <p>Email: {user?.email}</p>
        <p>User ID: {user?.id}</p>
      </div>
    </div>
  );
};

export default SettingsPanel;
