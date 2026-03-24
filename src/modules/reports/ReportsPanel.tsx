const ReportsPanel = () => {
  return (
    <div className="glass-panel p-6 space-y-3">
      <p className="text-xl font-semibold">Reports</p>
      <p className="text-sm text-fg-muted">
        Keep parity with WPF analytics. Bind charts to your Supabase views once
        available.
      </p>
      <div className="rounded-lg border border-stroke bg-surface px-4 py-3 text-sm text-fg-secondary">
        Data sources are ready to plug in; reuse the existing queries you rely
        on in desktop to populate this section.
      </div>
    </div>
  );
};

export default ReportsPanel;
