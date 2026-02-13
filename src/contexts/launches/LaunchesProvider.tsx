import { useState } from "react";
import { LaunchesContext } from "./LaunchesContext";
import type { LaunchRow } from "../../features/launches/types";
import { launches as mockLaunches } from "../../data/launches";

export function LaunchesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [launches, setLaunches] =
    useState<LaunchRow[]>(mockLaunches);

  function updateLaunch(updated: LaunchRow) {
    setLaunches(prev =>
      prev.map(l =>
        l.id === updated.id ? updated : l
      )
    );
  }

  return (
    <LaunchesContext.Provider
      value={{ launches, updateLaunch }}
    >
      {children}
    </LaunchesContext.Provider>
  );
}
