import { useContext } from "react";
import { KeywordsContext } from "./KeywordsContext";

export function useKeywords() {
  const context = useContext(KeywordsContext);

  if (!context) {
    throw new Error("useKeywords must be used inside KeywordsProvider");
  }

  return context;
}