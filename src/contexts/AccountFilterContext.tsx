import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type AccountFilterContextType = {
  selectedAccounts: string[];
  toggleAccount: (id: string) => void;
  pruneSelectedAccounts: (validIds: string[]) => void;
};

const AccountFilterContext = createContext<
  AccountFilterContextType | undefined
>(undefined);

export function AccountFilterProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [selectedAccounts, setSelectedAccounts] =
    useState<string[]>([]);

  function toggleAccount(accountId: string) {
    setSelectedAccounts((prev) =>
      prev[0] === accountId ? [] : [accountId]
    );
  }

  function pruneSelectedAccounts(validIds: string[]) {
    setSelectedAccounts((prev) => {
      const next = prev.filter((id) => validIds.includes(id)).slice(0, 1);
      return next.length === prev.length ? prev : next;
    });
  }

  const contextValue = useMemo(() => ({
    selectedAccounts,
    toggleAccount,
    pruneSelectedAccounts,
  }), [selectedAccounts]);

  return (
    <AccountFilterContext.Provider
      value={contextValue}
    >
      {children}
    </AccountFilterContext.Provider>
  );
}

export function useAccountFilter() {
  const context = useContext(AccountFilterContext);
  if (!context) {
    throw new Error(
      "useAccountFilter must be used inside AccountFilterProvider"
    );
  }
  return context;
}
