import api from "./api";
import type { Tag, TagCategory, TagDetail, UpsertTagPayload } from "../features/tags/types";

type TagPayload = {
  id?: string;
  name?: string;
  color?: string;
  createdAt?: string;
  categoryCount?: number;
  isDeleted?: boolean;
};

type TagCategoryPayload = {
  id?: string;
  name?: string;
  associatedAt?: string;
};

type TagDetailPayload = Omit<TagPayload, "categoryCount"> & {
  categories?: TagCategoryPayload[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeTag(payload: TagPayload | null | undefined): Tag {
  return {
    id: payload?.id ?? "",
    name: payload?.name ?? "",
    color: payload?.color ?? "#64748B",
    createdAt: payload?.createdAt ?? new Date(0).toISOString(),
    categoryCount: payload?.categoryCount ?? 0,
  };
}

function normalizeTagCategory(payload: TagCategoryPayload | null | undefined): TagCategory {
  return {
    id: payload?.id ?? "",
    name: payload?.name ?? "",
    associatedAt: payload?.associatedAt ?? new Date(0).toISOString(),
  };
}

function normalizeTagDetail(payload: TagDetailPayload | null | undefined): TagDetail {
  return {
    id: payload?.id ?? "",
    name: payload?.name ?? "",
    color: payload?.color ?? "#64748B",
    createdAt: payload?.createdAt ?? new Date(0).toISOString(),
    categories: Array.isArray(payload?.categories)
      ? payload.categories
          .filter((item) => isRecord(item))
          .map((item) => normalizeTagCategory(item))
          .filter((item) => item.id)
      : [],
  };
}

export async function getTags(): Promise<Tag[]> {
  const { data } = await api.get<unknown[]>("/tags");

  return data
    .filter((item): item is TagPayload => isRecord(item))
    .filter((item) => !item.isDeleted)
    .map((item) => normalizeTag(item))
    .filter((item) => item.id);
}

export async function getTagById(id: string): Promise<TagDetail> {
  const { data } = await api.get<TagDetailPayload | null>(`/tags/${id}`);
  return normalizeTagDetail(data);
}

export async function createTag(payload: UpsertTagPayload): Promise<Tag> {
  const { data } = await api.post<TagPayload | null>("/tags", payload);
  return normalizeTag(data);
}

export async function updateTag(id: string, payload: UpsertTagPayload): Promise<void> {
  await api.put(`/tags/${id}`, payload);
}

export async function deleteTag(id: string): Promise<void> {
  await api.delete(`/tags/${id}`);
}

export async function associateTagToCategory(payload: { categoryId: string; tagId: string }): Promise<void> {
  await api.post("/tags/associate", payload);
}

export async function disassociateTagFromCategory(payload: { categoryId: string; tagId: string }): Promise<void> {
  await api.post("/tags/disassociate", payload);
}
