export type Category = {
  id: string;
  name: string;
  parentId?: string | null;
};

export type CategoryRef = {
  id: string;
  name: string;
};
