
export type AccessStatus =
  | "active"
  | "grace_period"
  | "expired"
  | "suspended"
  | "cancelled"
  | "unknown"
  | "invalid_credentials"
  | "not_configured"
  | "check_failed"
  | "loading";

export interface AccessState {
  /** false = the app is read-only */
  allowed: boolean;
  accessStatus: AccessStatus;
  reason?: string;
  planName?: string | null;
  status?: string | null;
  expiryDate?: string | null;
  gracePeriodEndDate?: string | null;
  daysRemaining?: number | null;
  projectName?: string | null;
}

// Start permissive: we must never block the app before we know the answer,
// otherwise a slow check would make the UI look broken on every page load.
let state: AccessState = { allowed: true, accessStatus: "loading" };

type Listener = (s: AccessState) => void;
const listeners = new Set<Listener>();

export const getAccessState = (): AccessState => state;

export const setAccessState = (next: AccessState) => {
  state = next;
  listeners.forEach((fn) => fn(state));
};

export const subscribeAccess = (fn: Listener) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const resetAccessState = () => {
  setAccessState({ allowed: true, accessStatus: "loading" });
};

/** True when the subscription has lapsed and writes must be refused. */
export const isReadOnly = () => state.allowed === false;

/** Message shown wherever a write is refused. */
export const READ_ONLY_MESSAGE = "Your subscription has expired — the app is now read-only. Renew your plan to make changes.";
