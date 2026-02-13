import { useContext } from "react";
import { LaunchesContext } from "./LaunchesContext";

export function useLaunches() {
  const context = useContext(LaunchesContext);

  if (!context) {
    throw new Error(
      "useLaunches must be used inside LaunchesProvider"
    );
  }

  return context;
}
