import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Accounts from "./pages/Accounts";
import Subscriptions from "./pages/Subscriptions";
import Layout from "./components/Layout";
import { useEffect, useState } from "react";
import { supabase, SUPABASE_CONFIGURED } from "./integrations/supabase/client";

function Protected({ children }: { children: JSX.Element }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      if (!SUPABASE_CONFIGURED) {
        setOk(false);
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        const email = data.session?.user?.email?.toLowerCase() || "";
        const allowedRaw = (import.meta.env.VITE_ADMIN_EMAILS as string) || "";
        const allowed = allowedRaw.split(",").map((s) => s.trim().toLowerCase());
        setOk(!!email && allowed.includes(email));
      } catch {
        setOk(false);
      }
    })();
  }, []);
  if (!SUPABASE_CONFIGURED) return <div style={{ padding: 24 }}>Configuração do Supabase ausente</div>;
  if (ok === null) return <div style={{ padding: 24 }}>Verificando acesso...</div>;
  return ok ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const baseUrl = (import.meta.env.BASE_URL as string) || "/";
  const basename = new URL(baseUrl, window.location.origin).pathname.replace(/\/$/, "");
  return (
    <BrowserRouter basename={basename}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <Layout>
                <Dashboard />
              </Layout>
            </Protected>
          }
        />
        <Route
          path="/produtos"
          element={
            <Protected>
              <Layout>
                <Products />
              </Layout>
            </Protected>
          }
        />
        <Route
          path="/contas"
          element={
            <Protected>
              <Layout>
                <Accounts />
              </Layout>
            </Protected>
          }
        />
        <Route
          path="/assinaturas"
          element={
            <Protected>
              <Layout>
                <Subscriptions />
              </Layout>
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
