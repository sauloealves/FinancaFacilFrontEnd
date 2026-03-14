import { useState, useEffect, useMemo, type ReactNode } from "react";
import { CategoriesContext } from "./CategoriesContext";
import { getCategories } from "../../services/categoryService";
import type { Category } from "../../features/categories/types";

type Props = Readonly<{
  children: ReactNode;
}>;

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
    if (!category?.id) {
      return;
    }

    setCategories(prev => [...prev, category]);
  }

  function editCategory(updated: Category) {
    if (!updated?.id) {
      return;
    }

    setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
  }

  function removeCategory(id: string) {
    setCategories(prev => prev.filter(c => c.id !== id));
  }

  const contextValue = useMemo(() => ({
    categories,
    reloadCategories: loadCategories,
    addCategory,
    editCategory,
    removeCategory,
  }), [categories]);

  return (
    <CategoriesContext.Provider
      value={contextValue}
    >
      {children}
    </CategoriesContext.Provider>
  );
}
