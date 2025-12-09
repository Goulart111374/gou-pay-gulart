import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";

function Protected({ children }: { children: JSX.Element }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email?.toLowerCase() || "";
      const allowedRaw = (import.meta.env.VITE_ADMIN_EMAILS as string) || "";
      const allowed = allowedRaw.split(",").map((s) => s.trim().toLowerCase());
      setOk(!!email && allowed.includes(email));
    })();
  }, []);
  if (ok === null) return <div style={{ padding: 24 }}>Verificando acesso...</div>;
  return ok ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <Link to="/" style={{ color: "#eee", textDecoration: "none", fontWeight: 700 }}>Admin</Link>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ height: 32, padding: "0 12px", borderRadius: 8, background: "#2a2a2e", color: "#eee", border: "1px solid #3a3a3e", cursor: "pointer" }}
          >
            Sair
          </button>
        </div>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
