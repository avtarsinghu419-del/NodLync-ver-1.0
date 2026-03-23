import type { ReactNode } from "react";

export interface ModuleHeaderProps {
  title: string;
  description: string;
  icon: ReactNode;
  children?: ReactNode;
}

export default function ModuleHeader({ title, description, icon, children }: ModuleHeaderProps) {
  return (
    <div className="glass-panel px-6 py-5 flex items-center justify-between border border-slate-800/50 mb-6 flex-shrink-0 flex-wrap gap-4">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="text-3xl flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-emerald-500/20 text-transparent drop-shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-emerald-400 opacity-20 mix-blend-overlay"></div>
            <span className="relative z-10 filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] bg-gradient-to-br from-blue-300 to-emerald-300 bg-clip-text text-transparent" style={{ WebkitTextFillColor: "transparent" }}>
              {icon}
            </span>
          </div>
        )}
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-emerald-100 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.25em] mt-1 max-w-lg truncate">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  );
}
