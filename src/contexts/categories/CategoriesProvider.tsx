import { useState, useEffect, type ReactNode } from "react";
import { CategoriesContext } from "./CategoriesContext";
import { getCategories } from "../../services/categoryService";
import type { Category } from "../../features/categories/types";

type Props = {
  children: ReactNode;
};

export function CategoriesProvider({ children }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);

  async function loadCategories() {
    const data = await getCategories();
    setCategories(data);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function addCategory(category: Category) {
    setCategories(prev => [...prev, category]);
  }

  function editCategory(updated: Category) {
    setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
  }

  function removeCategory(id: string) {
    setCategories(prev => prev.filter(c => c.id !== id));
  }

  return (
    <CategoriesContext.Provider
      value={{ categories, reloadCategories: loadCategories, addCategory, editCategory, removeCategory }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}
