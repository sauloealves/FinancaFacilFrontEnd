import { createContext, useContext, useState } from "react";

type AccountFilterContextType = {
  selectedAccounts: string[];
  toggleAccount: (id: string) => void;
};

const AccountFilterContext = createContext<
  AccountFilterContextType | undefined
>(undefined);

export function AccountFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedAccounts, setSelectedAccounts] =
    useState<string[]>([]);

  function toggleAccount(accountId: string) {
    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  }

  return (
    <AccountFilterContext.Provider
      value={{ selectedAccounts, toggleAccount }}
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
