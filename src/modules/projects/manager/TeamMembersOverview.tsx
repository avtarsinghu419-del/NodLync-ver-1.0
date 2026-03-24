import InlineSpinner from "../../../components/InlineSpinner";
import { ROLE_STYLES, sortTeamMembers, type TeamMemberView } from "./teamUtils";

interface Props {
  members: TeamMemberView[];
  loading?: boolean;
  onOpenTeamTab: () => void;
}

const TeamMembersOverview = ({ members, loading = false, onOpenTeamTab }: Props) => {
  const sortedMembers = sortTeamMembers(members);
  const owner = sortedMembers.find((member) => member.role === "owner") ?? null;
  const otherMembers = sortedMembers.filter((member) => member.role !== "owner");

  const renderAvatar = (member: TeamMemberView, sizeClass: string, textClass: string) => (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-xl border border-stroke bg-panel ${sizeClass}`}
    >
      {member.avatar_url ? (
        <img src={member.avatar_url} alt={member.display_name} className="h-full w-full object-cover" />
      ) : (
        <span className={`font-bold text-fg-secondary ${textClass}`}>
          {member.display_name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );

  return (
    <div className="glass-panel p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-stroke pb-4">
        <div>
          
          <h3 className="font-semibold text-fg-secondary text-sm">
           👥 Team members
          </h3>
        </div>

        <button
          type="button"
          onClick={onOpenTeamTab}
          className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-primary transition hover:border-primary/40 hover:bg-primary/15"
        >
          Manage Team
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-32 items-center justify-center rounded-2xl border border-stroke bg-panel/20">
          <InlineSpinner />
        </div>
      ) : sortedMembers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stroke bg-panel/20 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-fg-secondary">No team members yet</p>
          <p className="mt-1 text-xs text-fg-muted">
            Add collaborators from the Team tab to start sharing this project.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {owner ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4">
              <div className="flex items-center gap-4">
                {renderAvatar(owner, "h-11 w-11 border-primary/25", "text-sm")}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-black text-fg">{owner.display_name}</p>
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.24em] text-primary">
                      Owner
                    </span>
                  </div>
                  <p className="truncate text-xs text-fg-muted">{owner.email || "Project Owner"}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="px-1 text-[10px] font-black uppercase tracking-[0.24em] text-fg-muted">
              Members
            </p>

            {otherMembers.length === 0 ? (
              <div className="rounded-2xl border border-stroke bg-panel/20 px-4 py-4 text-sm text-fg-muted">
                No additional team members yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {otherMembers.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-4 rounded-2xl border border-stroke/80 bg-panel/30 px-4 py-3"
                  >
                    {renderAvatar(member, "h-10 w-10", "text-sm")}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">
                        {member.display_name}
                      </p>
                      <p className="truncate text-xs text-fg-muted">
                        {member.email || "Project collaborator"}
                      </p>
                    </div>
                    <span
                      className={`rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] ${ROLE_STYLES[member.role]}`}
                    >
                      {member.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMembersOverview;
