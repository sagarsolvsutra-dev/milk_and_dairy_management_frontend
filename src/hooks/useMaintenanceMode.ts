"use client";

import { useEffect, useState } from "react";
import {
  getMaintenanceModeState,
  subscribeMaintenanceMode,
  type MaintenanceModeState,
} from "@/lib/maintenanceMode";

/** Subscribe a component to the current maintenance-plan status. */
export function useMaintenanceMode(): MaintenanceModeState {
  const [state, setState] = useState<MaintenanceModeState>(getMaintenanceModeState);

  useEffect(() => {
    setState(getMaintenanceModeState());
    return subscribeMaintenanceMode(setState);
  }, []);

  return state;
}

export default useMaintenanceMode;
