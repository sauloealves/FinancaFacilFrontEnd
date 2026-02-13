import type { LaunchRow } from "../launches/types";

export function calculateAccountBalances(
  launches: LaunchRow[]
) {
  const balances: Record<string, number> = {};

  launches.forEach(l => {
    if (l.type === "transfer") {
      if (l.fromAccount?.id) {
        balances[l.fromAccount.id] =
          (balances[l.fromAccount.id] || 0) - l.value;
      }

      if (l.toAccount?.id) {
        balances[l.toAccount.id] =
          (balances[l.toAccount.id] || 0) + l.value;
      }

      return;
    }

    if (l.account?.id) {
      balances[l.account.id] =
        (balances[l.account.id] || 0) +
        (l.type === "income" ? l.value : -l.value);
    }
  });

  return balances;
}
