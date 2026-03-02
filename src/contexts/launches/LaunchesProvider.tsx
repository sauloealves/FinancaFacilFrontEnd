import { useEffect, useState } from "react";
import { LaunchesContext } from "./LaunchesContext";
import type { LaunchRow } from "../../features/launches/types";
import api from "../../services/api";

export function LaunchesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [launches, setLaunches] = useState<LaunchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    api
      .get<LaunchRow[]>('/launches')
      .then(({ data }) => {
        if (mounted) setLaunches(data || []);
      })
      .catch(() => {
        if (mounted) setLaunches([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  function updateLaunch(updated: LaunchRow) {
    setLaunches(prev =>
      prev.map(l =>
        l.id === updated.id ? updated : l
      )
    );
  }

  return (
    <LaunchesContext.Provider
      value={{ launches, updateLaunch }}
    >
      {children}
    </LaunchesContext.Provider>
  );
}
