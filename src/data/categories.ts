import type { Category } from "../features/categories/types";

export const categories: Category[] = [
  { id: "1", name: "Receitas", parentId: null },
  { id: "2", name: "Salário", parentId: "1" },
  { id: "3", name: "Outras Receitas", parentId: "1" },
  { id: "4", name: "Despesas", parentId: null },
  { id: "5", name: "Alimentação", parentId: "4" },
];

export default categories;
