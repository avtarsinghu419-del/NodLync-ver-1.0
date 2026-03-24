import { useEffect, useState, useRef } from "react";
import useAppStore from "../store/useAppStore";
import { supabase } from "../api/supabaseClient";
import {
  updateProfile,
  updateSettings,
  clearLogs,
} from "../api/settingsApi";
import InlineSpinner from "../components/InlineSpinner";
import PaginationControls from "../components/PaginationControls";
import { usePagination } from "../hooks/usePagination";
import { useLocation, useNavigate } from "react-router-dom";
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
  
  const [activeTab, setActiveTab] = useState<"general" | "profile" | "logs" | "ai">("general");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [savingSettingKey, setSavingSettingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  
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
    if (tab && ["general", "profile", "logs", "ai"].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [location]);

  useEffect(() => {
    if (!user) return;
    const fetchApiKeys = async () => {
      setLoadingKeys(true);
      setActionError(null);
      const { data, error } = await supabase.from("api_key_items").select("*").eq("UserId", user.id);
      if (error) {
        console.error("Failed to load API keys", error);
        setActionError(error.message ?? "Failed to load API keys.");
      }
      if (data) setApiKeys(data);
      setLoadingKeys(false);
    };
    void fetchApiKeys();
  }, [user]);

  // Realtime Logs Subscription
  useEffect(() => {
    if (!user) return;
    
    // Initial fetch of logs if empty
    if (appLogs.length === 0) {
      setLoadingLogs(true);
      supabase.from("app_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)
        .then((res: any) => {
          if (res.error) {
            console.error("Failed to load logs", res.error);
            setActionError(res.error.message ?? "Failed to load system logs.");
          }
          if (res.data) setAppLogs(res.data);
          setLoadingLogs(false);
        })
        .catch((error: any) => {
          console.error("Failed to load logs", error);
          setActionError(error?.message ?? "Failed to load system logs.");
          setLoadingLogs(false);
        });
    }

    // Subscribe to new logs
    const channel = supabase
      .channel("my-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "app_logs", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setAppLogs([payload.new as any, ...useAppStore.getState().appLogs].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, setAppLogs]); // Only run once on mount per user

  // --- Input Handlers (Immediate reflection) ---
  
  const handleSettingToggle = async (key: string, value: any) => {
    if (!user || !appSettings) return;
    
    // Optimistic update
    const previousSettings = appSettings;
    const newSettings = { ...appSettings, [key]: value };
    setAppSettings(newSettings);
    setSavingSettingKey(key);
    setActionError(null);
    
    const { error } = await updateSettings(user.id, { [key]: value });
    if (error) {
      console.error(`Error updating ${key}`, error);
      setAppSettings(previousSettings);
      setActionError(`Failed to update ${key.replace(/_/g, " ")}: ${error.message}`);
    }
    setSavingSettingKey(null);
  };

  const handleProfileNameChange = async (e: React.FocusEvent<HTMLInputElement>) => {
    if (!user || !userProfile) return;
    const val = e.target.value.trim();
    if (val !== userProfile.display_name) {
      setLoadingProfile(true);
      setActionError(null);
      const { data, error } = await updateProfile(user.id, { display_name: val });
      if (error) {
        console.error("Failed to update profile name", error);
        setActionError(error.message ?? "Failed to update your profile name.");
      }
      if (data) setUserProfile(data);
      setLoadingProfile(false);
    }
  };

  // Avatar Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user || !userProfile) return;
    const file = e.target.files[0];
    
    // Validate image
    if (!file.type.startsWith("image/")) {
      setActionError("Please upload an image file.");
      return;
    }

    setLoadingProfile(true);
    setActionError(null);
    const filePath = `${user.id}/profile.jpg`;

    // Upload / upsert
    const { error: uploadError } = await supabase.storage
      .from("Profile_image")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      console.error("Error uploading image", uploadError);
      setActionError("Error uploading image: " + uploadError.message);
      setLoadingProfile(false);
      return;
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from("Profile_image")
      .getPublicUrl(filePath);

    // Add a random query param to bust local browser caching
    // so the new image renders instantly
    const cacheBusterUrl = `${publicData.publicUrl}?t=${Date.now()}`;

    // Update DB & store
    const { data, error } = await updateProfile(user.id, { avatar_url: cacheBusterUrl });
    if (error) {
      console.error("Failed to save profile image", error);
      setActionError(error.message ?? "Failed to save your profile image.");
    }
    if (data) setUserProfile(data);
    setLoadingProfile(false);
  };

  // --- Actions ---

  const handleLogout = async () => {
    setLoggingOut(true);
    setActionError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed", error);
      setActionError(error.message ?? "Failed to log out.");
      setLoggingOut(false);
      return;
    }
    navigate("/login", { replace: true });
  };

  const handleClearLogs = async () => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to clear all logs?")) return;
    setClearingLogs(true);
    setActionError(null);
    const { error } = await clearLogs(user.id);
    if (error) {
      console.error("Failed to clear logs", error);
      setActionError(error.message ?? "Failed to clear logs.");
      setClearingLogs(false);
      return;
    }
    setAppLogs([]);
    setClearingLogs(false);
  };

  const handleExportLogs = () => {
    const blob = new Blob([JSON.stringify(appLogs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", url);
    dlAnchorElem.setAttribute("download", "nodlync_logs.json");
    dlAnchorElem.click();
    URL.revokeObjectURL(url);
  };

  // UI state for logs
  const normalizedLogs = [...appLogs]
    .filter((log) => log?.created_at && (log?.message || log?.details))
    .map((log) => ({
      id: log.id,
      type: (log.status ?? log.level ?? "info").toLowerCase(),
      module: (log.action ?? log.module ?? "app").toLowerCase(),
      message: log.message ?? (typeof log.details === "string" ? log.details : JSON.stringify(log.details)),
      timestamp: log.created_at,
    }))
    .sort((a, b) =>
      logSortDir === "desc"
        ? a.timestamp < b.timestamp ? 1 : -1
        : a.timestamp > b.timestamp ? 1 : -1
    );

  const filteredLogs = normalizedLogs.filter((log) => {
    if (logStatusFilter !== "all" && log.type !== logStatusFilter) return false;
    if (logModuleFilter !== "all" && log.module !== logModuleFilter) return false;
    return true;
  });

  const uniqueModules = Array.from(new Set(normalizedLogs.map((l) => l.module || "")));
  const logsPagination = usePagination(filteredLogs, { initialPageSize: 20 });
  const apiKeysPagination = usePagination(apiKeys);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-full flex flex-col">
      <ModuleHeader
        title="Settings Hub"
        description="MANAGE YOUR PROFILE, APPLICATION PREFERENCES, AND VIEW SYSTEM LOGS"
        icon="⚙️"
      />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-stroke">
        {[
          { id: "general", label: "General" },
          { id: "profile", label: "Profile" },
          { id: "logs", label: "System Logs" },
          { id: "ai", label: "AI Configuration" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              navigate(`/settings?tab=${tab.id}`, { replace: true });
            }}
            className={`px-6 py-3 font-medium text-sm transition border-b-2 ${
              activeTab === tab.id
                ? "text-primary border-primary bg-primary/5"
                : "text-fg-muted border-transparent hover:text-fg-secondary hover:bg-surface/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-6 rounded-2xl border border-rose-800/40 bg-rose-950/30 px-5 py-4 text-sm text-rose-200 flex items-start justify-between gap-4">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-300 hover:text-white flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar">
        
        {/* ===================== GENERAL TAB ===================== */}
        {activeTab === "general" && (
          !appSettings ? (
            <div className="glass-panel p-6 bg-rose-500/10 border-rose-500/30 text-rose-300">
              <h3 className="font-bold mb-2">Failed to load App Settings</h3>
              <p className="text-sm">We couldn't fetch your global application preferences. This typically indicates the `app_settings` table was not successfully created or RLS policies are blocking access. Please run the `supabase_settings_schema.sql` file in your Supabase SQL editor.</p>
            </div>
          ) : (
            <div className="glass-panel p-6 space-y-6 max-w-2xl animate-in fade-in">
              <h2 className="text-lg font-bold text-fg-secondary border-b border-stroke pb-2">Appearance & Behavior</h2>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-surface border border-stroke rounded-lg cursor-pointer hover:border-stroke-strong transition">
                  <div>
                    <span className="block text-sm font-semibold text-fg-secondary">Dark Theme</span>
                    <span className="text-xs text-fg-muted">Use dark mode across the application.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-primary"
                    checked={appSettings.theme === "dark"}
                    onChange={(e) => handleSettingToggle("theme", e.target.checked ? "dark" : "light")}
                    disabled={savingSettingKey === "theme"}
                  />
                </label>
  
                <label className="flex items-center justify-between p-3 bg-surface border border-stroke rounded-lg cursor-pointer hover:border-stroke-strong transition">
                  <div>
                    <span className="block text-sm font-semibold text-fg-secondary">Default Project View</span>
                    <span className="text-xs text-fg-muted">Load projects as lists or grids by default.</span>
                  </div>
                  <select
                    className="bg-surface border-none text-sm text-fg-secondary p-1.5 outline-none rounded"
                    value={appSettings.default_project_view || "list"}
                    onChange={(e) => handleSettingToggle("default_project_view", e.target.value)}
                    disabled={savingSettingKey === "default_project_view"}
                  >
                    <option value="list">List View</option>
                    <option value="grid">Grid View</option>
                  </select>
                </label>
  
                <label className="flex items-center justify-between p-3 bg-surface border border-stroke rounded-lg cursor-pointer hover:border-stroke-strong transition">
                  <div>
                    <span className="block text-sm font-semibold text-fg-secondary">Push Notifications</span>
                    <span className="text-xs text-fg-muted">Receive in-app alerts and browser notifications.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-primary"
                    checked={appSettings.notifications_enabled}
                    onChange={(e) => handleSettingToggle("notifications_enabled", e.target.checked)}
                    disabled={savingSettingKey === "notifications_enabled"}
                  />
                </label>
  
                <label className="flex items-center justify-between p-3 bg-surface border border-stroke rounded-lg cursor-pointer hover:border-stroke-strong transition">
                  <div>
                    <span className="block text-sm font-semibold text-fg-secondary">Auto Updates</span>
                    <span className="text-xs text-fg-muted">Automatically update local caches in the background.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-primary"
                    checked={appSettings.auto_update_enabled}
                    onChange={(e) => handleSettingToggle("auto_update_enabled", e.target.checked)}
                    disabled={savingSettingKey === "auto_update_enabled"}
                  />
                </label>
              </div>

              {savingSettingKey && (
                <div className="text-xs text-fg-muted flex items-center gap-2">
                  <InlineSpinner />
                  Saving {savingSettingKey.replace(/_/g, " ")}...
                </div>
              )}
            </div>
          )
        )}

        {/* ===================== PROFILE TAB ===================== */}
        {activeTab === "profile" && userProfile && (
          <div className="glass-panel p-6 space-y-8 max-w-2xl animate-in fade-in">
            <h2 className="text-lg font-bold text-fg-secondary border-b border-stroke pb-2">User Profile</h2>
            
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div 
                className="w-24 h-24 rounded-full bg-surface border-2 border-stroke overflow-hidden flex items-center justify-center relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {loadingProfile ? (
                  <InlineSpinner />
                ) : userProfile.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover group-hover:opacity-50 transition" />
                ) : (
                  <span className="text-primary font-bold text-3xl">{userProfile.display_name?.charAt(0) || "U"}</span>
                )}
                
                {!loadingProfile && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <span className="text-xs font-semibold text-white">Upload</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loadingProfile}
                  className="btn-ghost text-sm text-primary mb-1 disabled:opacity-50"
                >
                  {loadingProfile ? "Uploading..." : "Change Photo"}
                </button>
                <p className="text-xs text-fg-muted">JPG, GIF or PNG. 1MB max.</p>
              </div>
            </div>

            <div className="space-y-5">
              <label className="block space-y-1">
                <span className="text-sm text-fg-muted font-medium">Display Name</span>
                <input
                  type="text"
                  className="w-full bg-surface border border-stroke rounded-lg px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary"
                  defaultValue={userProfile.display_name}
                  onBlur={handleProfileNameChange}
                  placeholder="Your name"
                  disabled={loadingProfile}
                />
                <p className="text-xs text-fg-muted mt-1">Saves automatically when you click off the field.</p>
              </label>

              <label className="block space-y-1">
                <span className="text-sm text-fg-muted font-medium">Email Address (Read-only)</span>
                <input
                  type="email"
                  className="w-full bg-panel border border-stroke rounded-lg px-3 py-2.5 text-sm text-fg-muted cursor-not-allowed"
                  value={user?.email || ""}
                  disabled
                />
              </label>
            </div>

            <div className="pt-6 border-t border-stroke">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn-ghost text-rose-400 hover:bg-rose-500/10 w-full flex items-center justify-center gap-2 font-bold py-3 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {loggingOut ? "Logging out..." : "Securely Log Out"}
              </button>
            </div>
          </div>
        )}

        {/* ===================== LOGS TAB ===================== */}
        {activeTab === "logs" && (
          <div className="glass-panel flex flex-col min-h-[500px] animate-in fade-in">
            <div className="p-4 border-b border-stroke-strong flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-panel/95 backdrop-blur z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={logStatusFilter}
                  onChange={(e) => {
                    setLogStatusFilter(e.target.value);
                    logsPagination.setCurrentPage(1);
                  }}
                  className="bg-surface border border-stroke-strong text-fg-secondary text-sm rounded px-3 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                  <option value="info">Info</option>
                </select>

                <select
                  value={logModuleFilter}
                  onChange={(e) => {
                    setLogModuleFilter(e.target.value);
                    logsPagination.setCurrentPage(1);
                  }}
                  className="bg-surface border border-stroke-strong text-fg-secondary text-sm rounded px-3 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="all">All Modules</option>
                  {uniqueModules.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <select
                  value={logSortDir}
                  onChange={(e) => setLogSortDir(e.target.value as "asc" | "desc")}
                  className="bg-surface border border-stroke-strong text-fg-secondary text-sm rounded px-3 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-emerald-500 flex items-center gap-1.5 mr-2 tracking-widest bg-emerald-500/10 px-2 py-1 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
                <button onClick={handleExportLogs} disabled={filteredLogs.length === 0} className="btn-ghost text-xs px-4 py-1.5 font-bold disabled:opacity-50">
                  Export JSON
                </button>
                <button onClick={handleClearLogs} disabled={clearingLogs || filteredLogs.length === 0} className="btn-ghost text-rose-400 hover:text-rose-300 text-xs px-4 py-1.5 font-bold disabled:opacity-50">
                  {clearingLogs ? "Clearing..." : "Clear All"}
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {loadingLogs ? (
                <div className="flex items-center justify-center p-16 h-full gap-3 text-fg-muted">
                  <InlineSpinner />
                  <span>Loading logs...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center h-full text-fg-muted italic gap-2">
                  <span className="text-3xl opacity-50">📡</span>
                  <p>Awaiting system activity logs.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-[160px,90px,140px,1fr] gap-2 px-2 text-[11px] font-mono text-fg-muted uppercase tracking-widest">
                    <span>Time</span>
                    <span>Status</span>
                    <span>Module</span>
                    <span>Message</span>
                  </div>
                  {logsPagination.paginatedItems.map((log) => (
                    <div
                      key={log.id}
                      className="grid grid-cols-[160px,90px,140px,1fr] gap-2 items-start bg-surface border border-stroke-strong rounded-lg px-3 py-2.5 shadow-sm"
                    >
                      <div className="text-fg-muted text-[11px]" title={new Date(log.timestamp).toLocaleString()}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </div>
                      <div>
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                            log.type === "error"
                              ? "bg-rose-100 text-rose-700"
                              : log.type === "success"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="font-semibold text-fg-secondary truncate">{log.module}</div>
                      <div className="text-primary text-[13px] leading-relaxed">
                        {log.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {filteredLogs.length > 0 ? (
              <PaginationControls
                currentPage={logsPagination.currentPage}
                pageSize={logsPagination.pageSize}
                totalItems={logsPagination.totalItems}
                totalPages={logsPagination.totalPages}
                startItem={logsPagination.startItem}
                endItem={logsPagination.endItem}
                onPageChange={logsPagination.setCurrentPage}
                onPageSizeChange={logsPagination.setPageSize}
                itemLabel="logs"
              />
            ) : null}
          </div>
        )}

        {/* ===================== AI CONFIG TAB ===================== */}
        {activeTab === "ai" && (
          !appSettings ? (
            <div className="glass-panel p-6 bg-rose-500/10 border-rose-500/30 text-rose-300">
              <h3 className="font-bold mb-2">Failed to load App Settings</h3>
              <p className="text-sm">We couldn't fetch your global application preferences required for AI binding. Please execute your `supabase_settings_schema.sql`.</p>
            </div>
          ) : (
            <div className="glass-panel p-6 space-y-6 max-w-2xl animate-in fade-in">
              <h2 className="text-lg font-bold text-fg-secondary border-b border-stroke pb-2">Global AI Configuration</h2>
              
              <div className="bg-primary/10 border border-primary/20 text-blue-200 p-4 rounded-lg text-sm flex gap-3">
                <span className="text-lg">🤖</span>
                <p>Bind your exact API usage from your Vault universally across the app right here. Selecting a default provider pipes logic seamlessly into AI Playground, workflows, and intelligent project suggestions.</p>
              </div>
  
              <div className="space-y-4 pt-2">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-fg-secondary">Active Global AI Engine</span>
                  <select
                    value={appSettings.default_ai_provider || ""}
                    onChange={(e) => handleSettingToggle("default_ai_provider", e.target.value)}
                    className="w-full bg-surface border border-stroke rounded-lg px-3 py-3 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                    disabled={savingSettingKey === "default_ai_provider" || loadingKeys}
                  >
                    {loadingKeys ? (
                      <option value="" disabled>Loading APIs...</option>
                    ) : apiKeys.length === 0 ? (
                      <option value="" disabled>No APIs configured</option>
                    ) : (
                      <>
                        <option value="" disabled>Select an API...</option>
                        {apiKeysPagination.paginatedItems.map((keyObj: any) => (
                          <option key={keyObj.Id ?? keyObj.id} value={keyObj.Id ?? keyObj.id}>
                            {(keyObj.Provider ?? keyObj.provider)} - {(keyObj.Name ?? keyObj.key_name)}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </label>
  
                <div className="pt-4">
                  <h3 className="text-sm font-semibold text-fg-secondary mb-3">Loaded Provider Keys</h3>
                  {apiKeys.length === 0 ? (
                    <div className="border border-dashed border-stroke p-4 rounded text-center text-sm text-fg-muted">
                      No keys found in your API Vault.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {apiKeysPagination.paginatedItems.map((k: any) => (
                        <div key={k.Id ?? k.id} className="flex items-center justify-between p-3 bg-surface border border-stroke rounded">
                          <span className="text-sm font-medium text-fg-secondary">{k.Provider ?? k.provider}</span>
                          <span className="text-xs font-mono text-fg-muted">{k.Name ?? k.key_name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {apiKeys.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-stroke bg-panel/20">
                      <PaginationControls
                        currentPage={apiKeysPagination.currentPage}
                        pageSize={apiKeysPagination.pageSize}
                        totalItems={apiKeysPagination.totalItems}
                        totalPages={apiKeysPagination.totalPages}
                        startItem={apiKeysPagination.startItem}
                        endItem={apiKeysPagination.endItem}
                        onPageChange={apiKeysPagination.setCurrentPage}
                        onPageSizeChange={apiKeysPagination.setPageSize}
                        itemLabel="keys"
                      />
                    </div>
                  ) : null}
                  
                  <button onClick={() => navigate("/api-vault")} className="mt-4 text-sm text-primary hover:underline font-medium">
                    → Manage keys in API Vault
                  </button>
                </div>
              </div>
            </div>
          )
        )}

      </div>
    </div>
  );
};

export default SettingsPage;
