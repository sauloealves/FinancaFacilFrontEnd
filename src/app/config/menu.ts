export type MenuItem = {
  label: string;
  path: string;
  children?: MenuItem[];
};

export const menu: MenuItem[] = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Lançamentos", path: "/launches" },
  // { label: "Compromissos", path: "/commitments" },
  { label: "Contas", path: "/accounts" },
  { label: "Orçamentos", path: "/budgets" },
  {
    label: "Relatórios",
    path: "/reports",
    children: [
      { label: "Relatório de despesa mensal", path: "/reports/monthly" },
      { label: "Gráfico comparativo", path: "/reports/comparison" },
    ],
  },
  // { label: "Integrações", path: "/integrations" },
  // { label: "Configurações", path: "/settings/profile" },
  { label: "Categorias", path: "/categories" },
];
