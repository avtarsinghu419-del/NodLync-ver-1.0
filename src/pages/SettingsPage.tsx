import { useEffect, useState, useRef } from "react";
import useAppStore from "../store/useAppStore";
import { supabase } from "../api/supabaseClient";
import {
  updateProfile,
  updateSettings,
} from "../api/settingsApi";
import { clearAppLogs, listAppLogs, normalizeAppLogRow } from "../api/appLogsApi";
import PaginationControls from "../components/PaginationControls";
import { usePagination } from "../hooks/usePagination";
import { useLocation, useNavigate, Link } from "react-router-dom";
import ModuleHeader from "../components/ModuleHeader";

const SettingsPage = () => {
  const user = useAppStore((s) => s.user);

  // App store states
  const appSettings = useAppStore((s) => s.appSettings);
  const userProfile = useAppStore((s) => s.userProfile);
  const appLogs = useAppStore((s) => s.appLogs);
  const setAppSettings = useAppStore((s) => s.setAppSettings);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const setAppLogs = useAppStore((s) => s.setAppLogs);

  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"general" | "profile" | "logs" | "ai" | "about">("general");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [savingSettingKey, setSavingSettingKey] = useState<string | null>(null);

  // AI Keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);

  // Logs filters
  const [logStatusFilter, setLogStatusFilter] = useState<string>("all");
  const [logModuleFilter, setLogModuleFilter] = useState<string>("all");
  const [logSortDir, setLogSortDir] = useState<"desc" | "asc">("desc");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize tabs and keys
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && ["general", "profile", "logs", "ai", "about"].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchApiKeys = async () => {
      setLoadingKeys(true);
      try {
        const { data } = await supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        if (data) setApiKeys(data);
      } catch (e) {
        console.error("Failed to load keys", e);
      } finally {
        setLoadingKeys(false);
      }
    };
    void fetchApiKeys();
  }, [user]);

  // Realtime Logs Subscription
  useEffect(() => {
    if (!user) return;
    if (appLogs.length === 0) {
      setLoadingLogs(true);
      (async () => {
        try {
          const { data } = await listAppLogs(user.id, { limit: 100 });
          if (data) setAppLogs(data);
        } finally {
          setLoadingLogs(false);
        }
      })();
    }
    const channel = supabase.channel("my-logs").on("postgres_changes", { event: "INSERT", schema: "public", table: "app_logs", filter: `user_id=eq.${user.id}` }, (payload: any) => {
      const normalized = normalizeAppLogRow(payload.new as any);
      const existing = useAppStore.getState().appLogs;
      if (!existing.some(l => l.id === normalized.id)) {
        setAppLogs([normalized, ...existing].slice(0, 200));
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, setAppLogs]);

  // --- Handlers ---
  const handleSettingToggle = async (key: string, value: any) => {
    if (!user || !appSettings) return;
    const previous = appSettings;
    setAppSettings({ ...appSettings, [key]: value });
    setSavingSettingKey(key);
    try {
      const { error } = await updateSettings(user.id, { [key]: value });
      if (error) setAppSettings(previous);
    } catch {
      setAppSettings(previous);
    }
    setSavingSettingKey(null);
  };

  const handleProfileNameChange = async (e: React.FocusEvent<HTMLInputElement>) => {
    if (!user || !userProfile) return;
    const val = e.target.value.trim();
    if (val !== userProfile.display_name) {
      setLoadingProfile(true);
      try {
        const { data } = await updateProfile(user.id, { display_name: val });
        if (data) setUserProfile(data);
      } finally {
        setLoadingProfile(false);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !user || !userProfile) return;
    const file = e.target.files[0];
    setLoadingProfile(true);
    const filePath = `${user.id}/profile.jpg`;
    await supabase.storage.from("Profile_image").upload(filePath, file, { upsert: true });
    const { data: publicData } = supabase.storage.from("Profile_image").getPublicUrl(filePath);
    const { data } = await updateProfile(user.id, { avatar_url: `${publicData.publicUrl}?t=${Date.now()}` });
    if (data) setUserProfile(data);
    setLoadingProfile(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleClearLogs = async () => {
    if (user && window.confirm("Clear all logs?")) {
      setClearingLogs(true);
      await clearAppLogs(user.id);
      setAppLogs([]);
      setClearingLogs(false);
    }
  };

  const handleExportLogs = () => {
    const blob = new Blob([JSON.stringify(appLogs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nodlync_logs.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const normalizedLogs = [...appLogs].sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return logSortDir === "desc" ? bTime - aTime : aTime - bTime;
  });
  const filteredLogs = normalizedLogs.filter(log => {
    if (logStatusFilter !== "all" && log.type !== logStatusFilter) return false;
    if (logModuleFilter !== "all" && log.module !== logModuleFilter) return false;
    return true;
  });
  const uniqueModules = Array.from(new Set(normalizedLogs.map(l => l.module || "")));
  const logsPagination = usePagination(filteredLogs, { initialPageSize: 20 });
  const apiKeysPagination = usePagination(apiKeys);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-full flex flex-col">
      <ModuleHeader title="Settings Hub" description="MANAGE YOUR PROFILE AND SYSTEM LOGS" icon="⚙️" />

      <div className="flex items-center gap-1 mb-6 border-b border-stroke overflow-x-auto custom-scrollbar">
        {["general", "profile", "logs", "ai", "about"].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab as any); navigate(`/settings?tab=${tab}`, { replace: true }); }}
            className={`px-6 py-3 font-medium text-sm transition border-b-2 capitalize whitespace-nowrap ${activeTab === tab ? "text-primary border-primary bg-primary/5" : "text-fg-muted border-transparent hover:text-fg-secondary hover:bg-surface/50"}`}
          >
            {tab === "ai" ? "AI Configuration" : tab === "logs" ? "System Logs" : tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar">
        {activeTab === "general" && appSettings && (
          <div className="glass-panel p-6 space-y-6 max-w-2xl animate-in fade-in">
            <h2 className="text-lg font-bold text-fg-secondary border-b pb-2">Appearance & Behavior</h2>
            <div className="space-y-4">
              {[
                { label: "Dark Theme", key: "theme", checked: appSettings.theme === "dark", toggle: (v: boolean) => handleSettingToggle("theme", v ? "dark" : "light") },
                { label: "Push Notifications", key: "notifications_enabled", checked: appSettings.notifications_enabled, toggle: (v: boolean) => handleSettingToggle("notifications_enabled", v) },
                { label: "Auto Updates", key: "auto_update_enabled", checked: appSettings.auto_update_enabled, toggle: (v: boolean) => handleSettingToggle("auto_update_enabled", v) },
              ].map(item => (
                <label key={item.key} className="flex items-center justify-between p-3 bg-surface border border-stroke rounded-lg cursor-pointer">
                  <span className="text-sm font-semibold">{item.label}</span>
                  <input type="checkbox" className="w-5 h-5 accent-primary" checked={item.checked} onChange={(e) => item.toggle(e.target.checked)} disabled={savingSettingKey === item.key} />
                </label>
              ))}
            </div>
          </div>
        )}

        {activeTab === "profile" && userProfile && (
          <div className="glass-panel p-6 space-y-8 max-w-2xl animate-in fade-in">
            <h2 className="text-lg font-bold text-fg-secondary border-b pb-2">User Profile</h2>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-surface border-2 border-stroke overflow-hidden flex items-center justify-center relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {userProfile.avatar_url ? <img src={userProfile.avatar_url} className="w-full h-full object-cover" /> : <span className="text-primary text-3xl font-bold">{userProfile.display_name?.charAt(0)}</span>}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"><span className="text-xs text-white">Upload</span></div>
              </div>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
              <button onClick={handleLogout} disabled={loggingOut} className="btn-ghost text-rose-400 font-bold px-6">{loggingOut ? "..." : "Logout"}</button>
            </div>
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-sm text-fg-muted font-medium">Display Name</span>
                <input type="text" className="w-full bg-surface border border-stroke rounded-lg px-4 py-2.5 text-sm" defaultValue={userProfile.display_name} onBlur={handleProfileNameChange} disabled={loadingProfile} />
              </label>
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="glass-panel flex flex-col min-h-[500px] animate-in fade-in">
            <div className="p-4 border-b border-stroke flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-panel/95 backdrop-blur z-10">
              <div className="flex gap-2">
                <select value={logStatusFilter} onChange={(e) => setLogStatusFilter(e.target.value)} className="bg-surface border border-stroke text-sm rounded px-3 py-1.5 outline-none">
                  <option value="all">Statuses</option>
                  <option value="success">Success</option><option value="error">Error</option><option value="info">Info</option>
                </select>
                <select value={logModuleFilter} onChange={(e) => setLogModuleFilter(e.target.value)} className="bg-surface border border-stroke text-sm rounded px-3 py-1.5 outline-none">
                  <option value="all">Modules</option>
                  {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={logSortDir} onChange={(e) => setLogSortDir(e.target.value as any)} className="bg-surface border border-stroke text-sm rounded px-3 py-1.5 outline-none">
                  <option value="desc">Newest</option><option value="asc">Oldest</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleExportLogs} className="btn-ghost text-xs font-bold px-3 py-1">JSON</button>
                <button onClick={handleClearLogs} disabled={clearingLogs} className="btn-ghost text-rose-400 text-xs font-bold px-3 py-1">{clearingLogs ? "..." : "Clear"}</button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {loadingLogs ? <div className="p-8 text-center text-sm text-fg-muted">Loading logs...</div> : filteredLogs.length === 0 ? <div className="p-8 text-center text-sm text-fg-muted">No logs recorded.</div> :
                logsPagination.paginatedItems.map(log => (
                  <div key={log.id} className="grid grid-cols-[120px,80px,1fr] gap-3 text-[11px] font-mono p-2 border-b border-stroke/50 hover:bg-surface/30 transition">
                    <span className="text-fg-muted">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={log.type === "error" ? "text-rose-400 font-bold" : log.type === "success" ? "text-emerald-400 font-bold" : "text-blue-400 font-bold"}>{log.type}</span>
                    <span className="text-fg-secondary truncate">{log.message}</span>
                  </div>
                ))
              }
            </div>
            {filteredLogs.length > 0 && (
              <PaginationControls
                {...logsPagination}
                onPageChange={logsPagination.setCurrentPage}
                onPageSizeChange={logsPagination.setPageSize}
                itemLabel="logs"
              />
            )}
          </div>
        )}

        {activeTab === "ai" && appSettings && (
          <div className="glass-panel p-6 space-y-6 max-w-2xl animate-in fade-in">
            <h2 className="text-lg font-bold text-fg-secondary border-b pb-2">Global AI Configuration</h2>
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg text-sm text-blue-200">Bind your API usage from your Vault universally.</div>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Active Global AI Engine</span>
              <select value={appSettings.default_ai_provider || ""} onChange={(e) => handleSettingToggle("default_ai_provider", e.target.value)} className="w-full bg-surface border border-stroke rounded-lg px-3 py-3 text-sm focus:ring-1 focus:ring-primary appearance-none" disabled={loadingKeys}>
                <option value="">{loadingKeys ? "Loading APIs..." : "Select an API..."}</option>
                {apiKeys.map((key: any) => <option key={key.id} value={key.id}>{key.provider} - {key.name}</option>)}
              </select>
            </label>
            {apiKeys.length > 0 && (
              <PaginationControls
                {...apiKeysPagination}
                onPageChange={apiKeysPagination.setCurrentPage}
                onPageSizeChange={apiKeysPagination.setPageSize}
                itemLabel="keys"
              />
            )}
            <button onClick={() => navigate("/api-vault")} className="text-sm text-primary hover:underline font-medium">→ Manage keys in API Vault</button>
          </div>
        )}

        {activeTab === "about" && (
          <div className="glass-panel p-8 space-y-10 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-6 shadow-xl shadow-primary/5">
                <img src="/favicon.svg" alt="NodLync" className="w-16 h-16 object-contain" />
              </div>
              <h2 className="text-3xl font-black text-fg tracking-tight">NodLync</h2>
              <p className="text-xs font-bold text-primary uppercase tracking-[0.25em] mt-2">Versatile AI Ops Workspace</p>
              <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-surface border border-stroke text-[10px] font-mono text-fg-muted">v1.0.0 Stable Build</div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-fg-muted">The Developers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "Shubham Jakhmola", role: "", icon: "S", color: "bg-primary/20 text-primary" },
                  { name: "Avtar Singh", role: "", icon: "A", color: "bg-emerald-400/20 text-emerald-400" },
                ].map(dev => (
                  <div key={dev.name} className="flex items-center gap-4 p-4 bg-surface/50 border border-stroke rounded-2xl group hover:border-primary/30 transition-all">
                    <div className="w-12 h-12 rounded-full border-2 border-stroke-strong flex items-center justify-center overflow-hidden">
                      <div className={`w-full h-full ${dev.color} flex items-center justify-center font-black`}>{dev.icon}</div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-fg group-hover:text-primary transition-colors">{dev.name}</h4>
                      <p className="text-[10px] text-fg-muted uppercase font-bold">{dev.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-stroke/50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-fg-muted text-center mb-4">Legal & Support</h3>
              <div className="grid grid-cols-2 gap-4">
                <Link to="/privacy" className="p-4 bg-surface/40 border border-stroke rounded-2xl text-center hover:bg-primary/5 hover:border-primary/30 transition-all"><span className="text-sm font-bold text-fg-secondary">Privacy</span></Link>
                <Link to="/terms" className="p-4 bg-surface/40 border border-stroke rounded-2xl text-center hover:bg-primary/5 hover:border-primary/30 transition-all"><span className="text-sm font-bold text-fg-secondary">Terms</span></Link>
              </div>
              <div className="text-center text-[10px] text-fg-muted pt-6">© 2026 NodLync. Built for Intelligent Workflows.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
