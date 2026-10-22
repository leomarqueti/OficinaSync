import { useEffect, useState } from "react";
import { apiFetch } from "./api";

export type Role = "owner" | "mechanic" | "receptionist";
export type Me = { user_id: number; name: string; email: string | null; role: Role; tenant_name: string | null };

export const isOfficeRole = (role?: Role | null) => role === "owner" || role === "receptionist";

export const roleLabels: Record<Role, string> = {
  owner: "Dono",
  receptionist: "Recepção",
  mechanic: "Mecânico",
};

let cached: Me | null = null;

/** Usuário logado (cache simples por sessão da página). */
export function useMe() {
  const [me, setMe] = useState<Me | null>(cached);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    apiFetch<Me>("/users/me", { silent: true })
      .then((result) => {
        cached = result;
        if (alive) setMe(result);
      })
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { me, loading };
}

export function clearMeCache() {
  cached = null;
}
