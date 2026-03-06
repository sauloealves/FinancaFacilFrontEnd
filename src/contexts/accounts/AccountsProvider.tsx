import { useState, useEffect, type ReactNode } from "react";
import { AccountsContext } from "./AccountsContext";
import { getAccounts } from "../../services/accountService";
import type { Account } from "../../features/accounts/types";

type Props = {
  children: ReactNode;
};

export function AccountsProvider({ children }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);

  async function loadAccounts() {
    const data = await getAccounts();
    setAccounts(data);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function addAccount(account: Account) {
    setAccounts(prev => [...prev, account]);
  }

  function editAccount(updated: Account) {
    setAccounts(prev =>
      prev.map(a =>
        a.id === updated.id ? updated : a
      )
    );
  }

  function removeAccount(id: string) {
    setAccounts(prev =>
      prev.filter(a => a.id !== id)
    );
  }

  return (
    <AccountsContext.Provider
      value={{
        accounts,
        reloadAccounts: loadAccounts,
        addAccount,
        editAccount,
        removeAccount,
      }}
    >
      {children}
    </AccountsContext.Provider>
  );
}