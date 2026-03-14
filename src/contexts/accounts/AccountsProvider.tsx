import { useState, useEffect, useMemo, type ReactNode } from "react";
import { AccountsContext } from "./AccountsContext";
import { getAccounts } from "../../services/accountService";
import type { Account } from "../../features/accounts/types";

type Props = Readonly<{
  children: ReactNode;
}>;

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
    if (!account?.id) {
      return;
    }

    setAccounts(prev => [...prev, account]);
  }

  function editAccount(updated: Account) {
    if (!updated?.id) {
      return;
    }

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

  const contextValue = useMemo(() => ({
    accounts,
    reloadAccounts: loadAccounts,
    addAccount,
    editAccount,
    removeAccount,
  }), [accounts]);

  return (
    <AccountsContext.Provider
      value={contextValue}
    >
      {children}
    </AccountsContext.Provider>
  );
}