import type { LaunchRow } from "../features/launches/types";

export const launches: LaunchRow[] = [    
      {
        id: "1",
        date: "2026-02-01",
        description: "Salário",
        type: "income",
        value: 5000,
        account: { id: "1", name: "Conta Corrente" },
        category: { id: "1", name: "Salário" },
      },
      {
        id: "2",
        date: "2026-02-05",
        description: "Mercado",
        type: "expense",
        value: 120,
        account: { id: "2", name: "Cartão" },
        category: { id: "2", name: "Alimentação" },
      },
      {
        id: "3",
        date: "2026-02-02",
        description: "Netflix",
        type: "expense",
        value: 39.9,
        account: { id: "2", name: "Cartão" },
        category: { id: "3", name: "Lazer" },
      },
      {
        id: "4",
        date: "2026-02-02",
        description: "Transferência",
        type: "transfer",
        value: 300,
        fromAccount: { id: "1", name: "Conta Corrente" },
        toAccount: { id: "3", name: "Poupança" },
      },
      {
        id: "5",
        date: "2026-01-01",
        description: "Salario V.A.L.E",
        type: "income",
        value: 300,
        account: { id: "1", name: "Conta Corrente" },
      },
];