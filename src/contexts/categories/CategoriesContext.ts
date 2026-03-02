import { createContext } from "react";
import type { Category } from "../../features/categories/types";

export type CategoriesContextType = {
  categories: Category[];
  reloadCategories: () => Promise<void>;
  addCategory: (c: Category) => void;
  editCategory: (c: Category) => void;
  removeCategory: (id: string) => void;
};

export const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);
