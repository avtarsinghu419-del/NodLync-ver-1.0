import { createAppLog } from "../api/appLogsApi";
import useAppStore from "../store/useAppStore";
import type { SystemLogEntry, SystemLogType } from "../types";

function localLogEntry(payload: {
  type: SystemLogType;
  module: string;
  message: string;
}): SystemLogEntry {
  const timestamp = new Date().toISOString();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `local-${Math.random().toString(36).slice(2, 10)}`;
  return { id, type: payload.type, module: payload.module, message: payload.message, timestamp };
}

export async function logAppEvent(payload: {
  type: SystemLogType;
  module: string;
  message: string;
  projectId?: string;
  meta?: Record<string, unknown>;
}) {
  const { user, addAppLog } = useAppStore.getState();
  if (!user) return;

  try {
    const { data } = await createAppLog({
      userId: user.id,
      type: payload.type,
      module: payload.module,
      message: payload.message,
      projectId: payload.projectId,
      meta: payload.meta,
    });

    if (data) {
      addAppLog(data);
      return;
    }
  } catch {
    // fall through to local
  }

  addAppLog(localLogEntry(payload));
}

