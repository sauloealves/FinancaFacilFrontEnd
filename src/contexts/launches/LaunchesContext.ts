import { createContext } from "react";
import type {
  FailedTransactionRow,
  LaunchRow,
} from "../../features/launches/types";

export type LaunchesContextType = {
  failedTransactions: FailedTransactionRow[];
  launches: LaunchRow[];
  isLoading: boolean;
  removeFailedTransaction: (id: string) => void;
  reloadFailedTransactions: () => Promise<void>;
  updateLaunch: (updated: LaunchRow) => void;
  reloadLaunches: () => Promise<void>;
};

export const LaunchesContext =
  createContext<LaunchesContextType | undefined>(undefined);
