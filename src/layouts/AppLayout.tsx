import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import useAppStore from "../store/useAppStore";
import { useEffect, useState } from "react";
import { getProfile, getSettings } from "../api/settingsApi";

const AppLayout = () => {
  const user = useAppStore((s) => s.user);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const setAppSettings = useAppStore((s) => s.setAppSettings);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchGlobals = async () => {
      const [pRes, sRes] = await Promise.all([
        getProfile(user.id),
        getSettings(user.id)
      ]);
      setUserProfile(pRes.data);
      setAppSettings(sRes.data);
    };
    fetchGlobals();
  }, [user, setUserProfile, setAppSettings]);

  const appSettings = useAppStore((s) => s.appSettings);

  // Apply real theme globally
  useEffect(() => {
    if (appSettings?.theme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, [appSettings?.theme]);

  return (
    <div className={`flex h-screen text-slate-100 overflow-hidden ${appSettings?.theme === "light" ? "bg-slate-50 text-slate-900" : "bg-background"}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: fixed, Mobile: drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-0`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col h-full bg-background relative z-0 min-w-0">
        {/* Mobile Header with Toggle */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-surface/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
             <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
             <span className="font-bold tracking-tight">NodLync</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-300"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
