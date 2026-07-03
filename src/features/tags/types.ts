export type Tag = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  categoryCount: number;
};

export type TagCategory = {
  id: string;
  name: string;
  associatedAt: string;
};

export type TagDetail = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  categories: TagCategory[];
};

export type UpsertTagPayload = {
  name: string;
  color: string;
};
