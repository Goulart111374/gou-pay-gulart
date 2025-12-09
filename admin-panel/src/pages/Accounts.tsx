import { useEffect, useMemo, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

type Account = { id: string; email: string; name?: string; created_at?: string };

export default function Accounts() {
  const [items, setItems] = useState<Account[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
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
      const url = `${base.replace(/\/$/, "")}/api/admin/users`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, "X-Admin-Email": email },
        mode: "cors",
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Falha ao carregar contas (${res.status}). ${text || url}`);
      }
      const json = await res.json();
      setItems(json.users || []);
    } catch (e: any) {
      setError(e?.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((u) => [u.name || "", u.email || ""].some((s) => s.toLowerCase().includes(term)));
  }, [items, q]);

  const resetPassword = async (email: string) => {
    const step1 = window.confirm(`Enviar e-mail de redefinição para ${email}?`);
    if (!step1) return;
    const step2 = window.prompt("Digite RESETAR para confirmar");
    if ((step2 || "").toUpperCase() !== "RESETAR") return;
    try {
      await supabase.auth.resetPasswordForEmail(email);
      toast.success("Link de redefinição enviado");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar link");
    }
  };

  const remove = async (id: string) => {
    const step1 = window.confirm("Tem certeza que deseja excluir esta conta?");
    if (!step1) return;
    const step2 = window.prompt("Digite EXCLUIR para confirmar");
    if ((step2 || "").toUpperCase() !== "EXCLUIR") return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || "";
    const email = data.session?.user?.email || "";
    const base = (import.meta.env.VITE_ADMIN_API_BASE as string) || "";
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/api/admin/delete-user`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "X-Admin-Email": email, "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        mode: "cors",
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Falha ao excluir conta");
      }
      toast.success("Conta excluída");
      setItems((prev) => prev.filter((u) => u.id !== id));
    } catch (e: any) {
      toast.error(e?.message || "Falha ao excluir conta");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Todas as Contas</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou e-mail"
          style={{ height: 36, borderRadius: 8, border: "1px solid #2a2a2e", background: "#0f0f10", color: "#eee", padding: "0 12px", width: 320 }}
        />
      </div>
      {loading && <div>Carregando...</div>}
      {error && <div style={{ color: "#ff6b6b" }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        {filtered.map((u) => (
          <div key={u.id} style={{ background: "#151517", border: "1px solid #2a2a2e", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: 600 }}>{u.name || u.email}</div>
              <div style={{ color: "#bdbdbd", fontSize: 13 }}>{u.email}</div>
              {u.created_at && <div style={{ color: "#8a8a8f", fontSize: 12 }}>Cadastro: {new Date(u.created_at).toLocaleString()}</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => resetPassword(u.email)} style={{ height: 32, borderRadius: 8, background: "#2a2a2e", color: "#eee", border: "1px solid #3a3a3e", cursor: "pointer" }}>Resetar Senha</button>
              <button disabled style={{ height: 32, borderRadius: 8, background: "#2a2a2e", color: "#aaa", border: "1px solid #3a3a3e", cursor: "not-allowed" }}>Banir</button>
              <button onClick={() => remove(u.id)} style={{ height: 32, borderRadius: 8, background: "#2a2a2e", color: "#eee", border: "1px solid #3a3a3e", cursor: "pointer" }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
