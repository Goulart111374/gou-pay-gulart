import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, SUPABASE_CONFIGURED } from "../integrations/supabase/client";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!SUPABASE_CONFIGURED) return;
      const { data } = await supabase.auth.getSession();
      const current = data.session?.user?.email?.toLowerCase() || "";
      const allowedRaw = (import.meta.env.VITE_ADMIN_EMAILS as string) || "";
      const allowed = allowedRaw.split(",").map((s) => s.trim().toLowerCase());
      if (current && allowed.includes(current)) navigate("/", { replace: true });
    })();
  }, [navigate]);

  const signIn = async () => {
    setError("");
    if (!email || !password) {
      setError("Informe e-mail e senha");
      return;
    }
    if (!SUPABASE_CONFIGURED) {
      setError("Configuração do Supabase ausente");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message || "Falha no login");
      setLoading(false);
      return;
    }
    const logged = data.session?.user?.email?.toLowerCase() || "";
    const allowedRaw = (import.meta.env.VITE_ADMIN_EMAILS as string) || "";
    const allowed = allowedRaw.split(",").map((s) => s.trim().toLowerCase());
    if (!logged || !allowed.includes(logged)) {
      await supabase.auth.signOut();
      setError("Acesso não autorizado");
      setLoading(false);
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 360, padding: 24, background: "#151517", borderRadius: 12, boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Login Administrativo</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!SUPABASE_CONFIGURED && (
            <div style={{ color: "#ffb86b", fontSize: 13 }}>
              Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> nas variáveis do projeto.
            </div>
          )}
          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#bdbdbd" }}>E-mail</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="admin@empresa.com"
              style={{ height: 40, borderRadius: 8, border: "1px solid #2a2a2e", background: "#0f0f10", color: "#eee", padding: "0 12px" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#bdbdbd" }}>Senha</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              style={{ height: 40, borderRadius: 8, border: "1px solid #2a2a2e", background: "#0f0f10", color: "#eee", padding: "0 12px" }}
            />
          </label>
          {error && <div style={{ color: "#ff6b6b", fontSize: 13 }}>{error}</div>}
          <button
            onClick={signIn}
            disabled={loading || !SUPABASE_CONFIGURED}
            style={{ height: 40, borderRadius: 8, background: "#6A2FE0", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
