import { useContext } from "react";
import { TagsContext } from "./TagsContext";

export function useTags() {
  const context = useContext(TagsContext);

  if (!context) {
    throw new Error("useTags must be used inside TagsProvider");
  }

  return context;
}
