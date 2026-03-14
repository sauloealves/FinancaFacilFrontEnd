import api from "./api";
import type { Category } from "../features/categories/types";

type CategoryPayload = {
  id?: string;
  name?: string;
  parentId?: string | null;
  isDeleted?: boolean;
};

function isValidCategoryPayload(value: unknown): value is CategoryPayload {
  return typeof value === "object" && value !== null;
}

function normalizeCategory(
  payload: CategoryPayload | null | undefined,
  fallback?: Partial<Category>,
): Category {
  return {
    id: payload?.id ?? fallback?.id ?? "",
    name: payload?.name ?? fallback?.name ?? "",
    parentId: payload?.parentId ?? fallback?.parentId ?? null,
  };
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await api.get<unknown[]>("/categories");

  return data
    .filter(isValidCategoryPayload)
    .filter((category) => !category.isDeleted)
    .map((category) => normalizeCategory(category))
    .filter((category) => category.id);
}

export async function createCategory(payload: {
  name: string;
  parentId?: string | null;
}) {
  const { data } = await api.post<CategoryPayload | null>("/categories", payload);
  return normalizeCategory(data, payload);
}

export async function updateCategory(
  id: string,
  payload: {
    name: string;
    parentId?: string | null;
  }
) {
  const { data } = await api.put<CategoryPayload | null>(`/categories/${id}`, payload);
  return normalizeCategory(data, {
    id,
    name: payload.name,
    parentId: payload.parentId,
  });
}

export async function deleteCategory(id: string) {
  await api.delete(`/categories/${id}`);
}
