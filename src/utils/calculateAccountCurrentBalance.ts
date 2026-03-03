import type { Account } from "../features/accounts/types";
import type { LaunchRow } from "../features/launches/types";
import { isTransactionType } from "./sortUtils";

export function calculateAccountCurrentBalance(
  account: Account,
  launches: LaunchRow[]
) {
  let balance = account.initialBalance;

  launches.forEach(l => {
    if (isTransactionType(l.type, "transfer")) {
      if (l.fromAccount?.id === account.id) {
        balance -= l.value;
      }

      if (l.toAccount?.id === account.id) {
        balance += l.value;
      }

      return;
    }

    if (l.account?.id === account.id) {
      if (isTransactionType(l.type, "income")) {
        balance += l.value;
      }

      if (isTransactionType(l.type, "expense")) {
        balance -= l.value;
      }
    }
  });

  return balance;
}
