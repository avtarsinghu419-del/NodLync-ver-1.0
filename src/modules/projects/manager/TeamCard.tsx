import { useState, useEffect } from "react";
import PaginationControls from "../../../components/PaginationControls";
import { usePagination } from "../../../hooks/usePagination";
import InlineSpinner from "../../../components/InlineSpinner";

type ProjectRole = "owner" | "admin" | "editor" | "viewer";

interface TeamMember {
  id: string; 
  user_id: string;
  display_name: string;
  email?: string;
  role: ProjectRole;
}

interface Props {
  members: TeamMember[];
  canManage: boolean;
  onAdd: (userId: string, role: ProjectRole) => Promise<void>;
  onUpdateRole: (id: string, role: ProjectRole) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onSearch: (query: string) => Promise<{ data: any[] | null; error: any | null }>;
  onAddRedirect?: () => void;
}

const ROLE_OPTIONS: ProjectRole[] = ["owner", "admin", "editor", "viewer"];

const ROLE_STYLES: Record<ProjectRole, string> = {
  owner: "text-primary border-primary/30 bg-primary/10",
  admin: "text-emerald-400 border-emerald-700 bg-emerald-900/20",
  editor: "text-amber-400 border-amber-700 bg-amber-900/20",
  viewer: "text-slate-400 border-slate-700 bg-slate-800",
};

const TeamCard = ({ members, canManage, onAdd, onUpdateRole, onRemove, onSearch, onAddRedirect }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<ProjectRole>("viewer");
  const [busy, setBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const pagination = usePagination(members);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.length >= 2 && !selectedUser) {
        setSearching(true);
        setSearchError(null);
        try {
          const { data, error } = await onSearch(searchQuery);
          if (error) {
             console.error("Search error:", error);
             setSearchError("Search failed.");
          }
          setSearchResults(data || []);
        } catch (err) {
          setSearchError("Error searching users.");
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, onSearch, selectedUser]);

  const handleAdd = async () => {
    if (!selectedUser) return;
    setBusy(true);
    try {
      console.log("Adding member:", selectedUser.id, selectedRole);
      await onAdd(selectedUser.id, selectedRole);
      setSearchQuery("");
      setSelectedUser(null);
      setSearchResults([]);
      console.log("Member added successfully");
    } catch (err: any) {
      console.error("Failed to add member:", err);
      alert("Failed to add member: " + (err.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await onRemove(id);
    } catch {
      alert("Failed to remove member.");
    }
  };

  const handleRoleChange = async (id: string, role: ProjectRole) => {
    try {
      await onUpdateRole(id, role);
    } catch {
      alert("Failed to update role.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Add Member Form (Always Open on Team Tab if canManage) ── */}
      {canManage && !onAddRedirect && (
        <div className="glass-panel p-6 sm:p-8 space-y-6 border-primary/20 bg-primary/[0.02]">
          <div className="flex items-center gap-3 border-b border-primary/10 pb-4">
             <span className="text-xl">🤝</span>
             <div>
                <h3 className="text-lg font-black text-slate-100 tracking-tight">Project Teammates</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Build your core workforce</p>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Search Input */}
            <div className="lg:col-span-5 space-y-3 relative">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Find Teammate</label>
              <div className="relative">
                <input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedUser(null);
                  }}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-5 py-3.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-slate-100 shadow-inner"
                />
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <InlineSpinner />
                  </div>
                )}
              </div>

              {searchError && <p className="text-[10px] text-rose-400 font-bold px-1">{searchError}</p>}

              {searchResults.length > 0 && !selectedUser && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-slate-800 border-2 border-slate-700 rounded-2xl shadow-2xl z-20 max-h-64 overflow-y-auto">
                  {searchResults.map(user => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchQuery(user.display_name);
                        setSearchResults([]);
                      }}
                      className="p-4 hover:bg-slate-700 cursor-pointer flex items-center justify-between border-b border-slate-700/50 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-200 truncate group-hover:text-primary transition-colors">{user.display_name}</p>
                      </div>
                      <span className="text-[9px] px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg font-black tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">PICK</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Role Radio Grid */}
            <div className="lg:col-span-5 space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Level</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`px-3 py-3 rounded-xl border-2 text-[10px] font-black transition-all uppercase tracking-widest ${selectedRole === r ? ROLE_STYLES[r] + " border-primary/50 shadow-md scale-[1.02]" : "bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-700"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="lg:col-span-2 lg:pt-7">
               <button
                  disabled={!selectedUser || busy}
                  onClick={handleAdd}
                  className="w-full py-3.5 rounded-xl bg-primary text-slate-900 font-black tracking-widest uppercase text-[10px] hover:brightness-110 shadow-lg shadow-primary/20 transition-all disabled:opacity-30 active:scale-95"
                >
                  {busy ? <InlineSpinner /> : "GRANT"}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Team List ── */}
      <div className="glass-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
           <div className="flex items-center gap-2">
             <span className="text-base text-primary">📊</span>
             <h3 className="font-black text-slate-100 text-xs tracking-widest uppercase">Member Stream</h3>
           </div>
           
           {onAddRedirect && (
             <button 
                onClick={onAddRedirect}
                className="text-xs text-primary font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
             >
                + ADD TEAMMATE ➔
             </button>
           )}

           <span className="text-[10px] text-slate-500 font-mono font-bold">{members.length} COLLABORATORS</span>
        </div>

        {members.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
             <span className="text-3xl opacity-20">👤</span>
             <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Workspace is Lonely</p>
                <p className="text-[10px] text-slate-600 font-medium">Add members above to begin team collaboration.</p>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="divide-y divide-slate-800/50">
              {pagination.paginatedItems.map((member) => (
                <li key={member.id} className="flex items-center gap-4 py-4 group hover:bg-slate-800/20 px-4 rounded-xl transition-all">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 font-bold text-primary group-hover:border-primary/40 transition-all shadow-xl">
                    {member.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate">{member.display_name}</p>
                    <p className="text-[10px] text-slate-500 font-mono tracking-tighter truncate uppercase">{member.email || "Confidential Email"}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {canManage ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as ProjectRole)}
                        className={`text-[10px] font-black border-2 rounded-xl px-3 py-2 bg-slate-900 outline-none cursor-pointer hover:border-primary/40 transition-all uppercase tracking-widest ${ROLE_STYLES[member.role]}`}
                      >
                        {ROLE_OPTIONS.map(r => <option key={r} value={r} className="bg-slate-900 text-slate-200 font-bold">{r.toUpperCase()}</option>)}
                      </select>
                    ) : (
                      <span className={`text-[10px] font-black border-2 rounded-xl px-4 py-2 uppercase tracking-widest ${ROLE_STYLES[member.role]}`}>
                        {member.role.toUpperCase()}
                      </span>
                    )}
                    
                    {canManage && (
                      <button 
                        onClick={() => handleRemove(member.id)}
                        className="text-slate-700 hover:text-rose-400 p-2.5 bg-slate-900 rounded-xl hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 shadow-xl"
                        title="Revoke Access"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <PaginationControls
              currentPage={pagination.currentPage}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              totalPages={pagination.totalPages}
              startItem={pagination.startItem}
              endItem={pagination.endItem}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
              itemLabel="members"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export { type TeamMember, type ProjectRole };
export default TeamCard;
