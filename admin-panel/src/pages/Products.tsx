import { useEffect, useMemo, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  price: number;
  is_active?: boolean;
  user_id?: string;
  updated_at?: string;
  description?: string;
  image_url?: string;
};

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
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
        const url = `${base.replace(/\/$/, "")}/api/admin/products`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, "X-Admin-Email": email },
          mode: "cors",
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Falha ao carregar produtos (${res.status}). ${text || url}`);
        }
        const json = await res.json();
        setItems(json.products || []);
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
    return items.filter((p) => (p.name || "").toLowerCase().includes(term));
  }, [items, q]);

  const remove = async (id: string) => {
    const step1 = window.confirm("Tem certeza que deseja excluir este produto?");
    if (!step1) return;
    const step2 = window.prompt("Digite EXCLUIR para confirmar");
    if ((step2 || "").toUpperCase() !== "EXCLUIR") return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || "";
    const email = data.session?.user?.email || "";
    const base = (import.meta.env.VITE_ADMIN_API_BASE as string) || "";
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/api/admin/products`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "X-Admin-Email": email, "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        mode: "cors",
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Falha ao excluir");
      }
      toast.success("Produto excluído");
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      toast.error(e?.message || "Falha ao excluir");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Todos os Produtos</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome"
          style={{ height: 36, borderRadius: 8, border: "1px solid #2a2a2e", background: "#0f0f10", color: "#eee", padding: "0 12px", width: 280 }}
        />
      </div>
      {loading && <div>Carregando...</div>}
      {error && <div style={{ color: "#ff6b6b" }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        {filtered.map((p) => {
          const owner = usersById[p.user_id || ""];
          return (
            <div key={p.id} style={{ background: "#151517", border: "1px solid #2a2a2e", borderRadius: 12, padding: 12, display: "flex", gap: 12 }}>
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }} />
              ) : (
                <div style={{ width: 72, height: 72, background: "#0f0f10", borderRadius: 8 }} />
              )}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: "#bdbdbd", fontSize: 13 }}>{(p.description || "").slice(0, 120)}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 700 }}>R$ {Number(p.price || 0).toFixed(2)}</div>
                  <div style={{ color: "#bdbdbd", fontSize: 12 }}>{owner ? owner.email : p.user_id}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => remove(p.id)} style={{ height: 32, borderRadius: 8, background: "#2a2a2e", color: "#eee", border: "1px solid #3a3a3e", cursor: "pointer" }}>
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
