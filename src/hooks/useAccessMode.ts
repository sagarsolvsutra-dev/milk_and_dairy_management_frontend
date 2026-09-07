"use client";

import { useEffect, useState } from "react";
import { getAccessState, subscribeAccess, type AccessState } from "@/lib/accessMode";


export function useAccessMode(): AccessState & { readOnly: boolean } {
  const [state, setState] = useState<AccessState>(getAccessState);

  useEffect(() => {
    // Re-sync on mount in case the provider resolved before this mounted.
    setState(getAccessState());
    return subscribeAccess(setState);
  }, []);

  return { ...state, readOnly: state.allowed === false };
}

export default useAccessMode;
