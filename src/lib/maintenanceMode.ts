// ============================================================
//  Maintenance plan status — same pub-sub pattern as accessMode.ts,
//  but purely informational (no read-only semantics). Published by
//  SubscriptionProvider on the same poll cycle as the hosting plan, so the
//  header/sidebar widgets don't each run their own fetch.
//  Ported from the same mechanism running in Shyam Enterprise's frontend.
// ============================================================

export interface MaintenanceModeState {
  loading: boolean;
  hasPlan: boolean;
  planName?: string | null;
  isFree?: boolean;
  daysRemaining?: number | null;
  isExpired?: boolean;
  /**
   * SolvSutra's own decision on whether to prompt this project to buy a
   * maintenance plan. Kept as a server verdict rather than derived here, so
   * the rule stays in one place — but published through this store so the
   * banner doesn't run a second poll of its own.
   */
  showPrompt?: boolean;
}

let state: MaintenanceModeState = { loading: true, hasPlan: false };

type Listener = (s: MaintenanceModeState) => void;
const listeners = new Set<Listener>();

export const getMaintenanceModeState = (): MaintenanceModeState => state;

export const setMaintenanceModeState = (next: MaintenanceModeState) => {
  state = next;
  listeners.forEach((fn) => fn(state));
};

export const subscribeMaintenanceMode = (fn: Listener) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
