import api from "./api";
import type { Category } from "../features/categories/types";

export async function getCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/categories");
  return data.filter((c) => !(c as any).isDeleted);
}

export async function createCategory(payload: {
  name: string;
  parentId?: string | null;
}) {
  const { data } = await api.post<Category>("/categories", payload);
  return data;
}

export async function updateCategory(
  id: string,
  payload: {
    name: string;
    parentId?: string | null;
  }
) {
  const { data } = await api.put<Category>(`/categories/${id}`, payload);
  return data;
}

export async function deleteCategory(id: string) {
  await api.delete(`/categories/${id}`);
}
