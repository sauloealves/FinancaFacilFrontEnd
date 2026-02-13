import { createContext } from "react";
import type { LaunchRow } from "../../features/launches/types";

export type LaunchesContextType = {
  launches: LaunchRow[];
  updateLaunch: (updated: LaunchRow) => void;
};

export const LaunchesContext =
  createContext<LaunchesContextType | undefined>(undefined);
