import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";

type Stats = { users: number; products: number; sales: number; revenue: number };

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
        const url = `${base.replace(/\/$/, "")}/api/admin/analytics`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, "X-Admin-Email": email },
          mode: "cors",
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Falha ao carregar métricas (${res.status}). ${text || url}`);
        }
        const json = await res.json();
        setStats({ users: json.users || 0, products: json.products || 0, sales: json.sales || 0, revenue: json.revenue || 0 });
      } catch (e: any) {
        setError(e?.message || "Erro inesperado");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 600 }}>Painel Administrativo</div>
      {loading && <div>Carregando...</div>}
      {error && <div style={{ color: "#ff6b6b" }}>{error}</div>}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
          <div style={{ background: "#151517", border: "1px solid #2a2a2e", borderRadius: 12, padding: 16 }}>
            <div style={{ color: "#bdbdbd", fontSize: 13 }}>Usuários</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.users}</div>
          </div>
          <div style={{ background: "#151517", border: "1px solid #2a2a2e", borderRadius: 12, padding: 16 }}>
            <div style={{ color: "#bdbdbd", fontSize: 13 }}>Produtos</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.products}</div>
          </div>
          <div style={{ background: "#151517", border: "1px solid #2a2a2e", borderRadius: 12, padding: 16 }}>
            <div style={{ color: "#bdbdbd", fontSize: 13 }}>Vendas</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.sales}</div>
          </div>
          <div style={{ background: "#151517", border: "1px solid #2a2a2e", borderRadius: 12, padding: 16 }}>
            <div style={{ color: "#bdbdbd", fontSize: 13 }}>Receita</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>R$ {stats.revenue.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
