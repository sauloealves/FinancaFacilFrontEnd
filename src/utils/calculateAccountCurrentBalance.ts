import type { Account } from "../features/accounts/types";
import type { LaunchRow } from "../features/launches/types";

export function calculateAccountCurrentBalance(
  account: Account,
  launches: LaunchRow[]
) {
  let balance = account.initialBalance;

  launches.forEach(l => {
    if (l.type === "transfer") {
      if (l.fromAccount?.id === account.id) {
        balance -= l.value;
      }

      if (l.toAccount?.id === account.id) {
        balance += l.value;
      }

      return;
    }

    if (l.account?.id === account.id) {
      if (l.type === "income") {
        balance += l.value;
      }

      if (l.type === "expense") {
        balance -= l.value;
      }
    }
  });

  return balance;
}
