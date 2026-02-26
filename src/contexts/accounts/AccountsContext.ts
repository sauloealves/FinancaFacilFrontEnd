import { createContext } from "react";
import type { Account } from "../../features/accounts/types";


export type AccountsContextType = {
  accounts: Account[];
  reloadAccounts: () => Promise<void>;
  addAccount: (account: Account) => void;
  editAccount: (account: Account) => void;
  removeAccount: (id: string) => void;
};

export const AccountsContext =
  createContext<AccountsContextType | undefined>(undefined);