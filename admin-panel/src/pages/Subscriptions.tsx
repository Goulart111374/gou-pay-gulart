import { useEffect, useMemo, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

type Subscription = {
  id: string;
  user_id: string;
  status: string;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function Subscriptions() {
  const [items, setItems] = useState<Subscription[]>([]);
  const [usersById, setUsersById] = useState<Record<string, { email: string; name?: string }>>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || "";
      const email = data.session?.user?.email || "";
      if (!token) {
        setError("Sessão inválida");
        setLoading(false);
        return;
      }
      const base = (import.meta.env.VITE_ADMIN_API_BASE as string) || "";
      if (!base) {
        setError("Defina VITE_ADMIN_API_BASE nas variáveis do projeto");
        setLoading(false);
        return;
      }
      try {
        const url = `${base.replace(/\/$/, "")}/api/admin/subscriptions`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, "X-Admin-Email": email },
          mode: "cors",
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Falha ao carregar assinaturas (${res.status}). ${text || url}`);
        }
        const json = await res.json();
        setItems(json.subscriptions || []);
        const usersRes = await fetch(`${base.replace(/\/$/, "")}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}`, "X-Admin-Email": email },
          mode: "cors",
          cache: "no-store",
        });
        if (usersRes.ok) {
          const uj = await usersRes.json();
          const map: Record<string, { email: string; name?: string }> = {};
          for (const u of uj.users || []) {
            map[u.id] = { email: u.email, name: u.name };
          }
          setUsersById(map);
        }
      } catch (e: any) {
        setError(e?.message || "Erro inesperado");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((s) => {
      const owner = usersById[s.user_id || ""];
      return [owner?.email || "", owner?.name || "", s.status || ""].some((t) => t.toLowerCase().includes(term));
    });
  }, [items, q, usersById]);

  const statusBadge = (s: string) => {
    const st = (s || "").toLowerCase();
    if (st === "active" || st === "approved") return { label: "Ativa", color: "#22c55e" };
    if (st === "pending") return { label: "Pendente", color: "#f59e0b" };
    if (st === "inactive" || st === "expired") return { label: "Inativa", color: "#ef4444" };
    return { label: s || "-", color: "#a1a1aa" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Assinaturas</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por status, e-mail ou nome"
          style={{ height: 36, borderRadius: 8, border: "1px solid #2a2a2e", background: "#0f0f10", color: "#eee", padding: "0 12px", width: 340 }}
        />
      </div>
      {loading && <div>Carregando...</div>}
      {error && <div style={{ color: "#ff6b6b" }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        {filtered.map((s) => {
          const owner = usersById[s.user_id || ""];
          const badge = statusBadge(s.status || "");
          return (
            <div key={s.id} style={{ background: "#151517", border: "1px solid #2a2a2e", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontWeight: 600 }}>{owner?.name || owner?.email || s.user_id}</div>
                <div style={{ color: "#bdbdbd", fontSize: 13 }}>{owner?.email || "-"}</div>
                <div style={{ color: "#8a8a8f", fontSize: 12 }}>Criada: {s.created_at ? new Date(s.created_at).toLocaleString() : "-"}</div>
                <div style={{ color: "#8a8a8f", fontSize: 12 }}>Expira: {s.expires_at ? new Date(s.expires_at).toLocaleString() : "-"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #3a3a3e", color: badge.color }}>{badge.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
