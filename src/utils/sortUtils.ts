import type { Category } from "../features/categories/types";
import type { Account } from "../features/accounts/types";

/**
 * Ordena categorias hierarquicamente:
 * - Pais em ordem alfabética
 * - Filhos dentro de cada pai em ordem alfabética
 */
export function sortCategoriesHierarchically(
  categories: Category[]
): Category[] {
  // Categorias sem pai, ordenadas alfabeticamente
  const parents = categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const result: Category[] = [];

  for (const parent of parents) {
    result.push(parent);
    // Filhos do pai, ordenados alfabeticamente
    const children = categories
      .filter((c) => c.parentId === parent.id)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    result.push(...children);
  }

  return result;
}

/**
 * Ordena contas alfabeticamente
 */
export function sortAccountsAlphabetically(accounts: Account[]): Account[] {
  return [...accounts].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR")
  );
}
