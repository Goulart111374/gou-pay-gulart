import { Link, useLocation } from "react-router-dom";
import { LogOut, Package, Users, Rocket } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { Toaster } from "sonner";

export default function Layout({ children }: { children: JSX.Element }) {
  const { pathname } = useLocation();
  const nav = [
    { to: "/", label: "Dashboard" },
    { to: "/produtos", label: "Todos os Produtos", icon: Package },
    { to: "/contas", label: "Todas as Contas", icon: Users },
    { to: "/assinaturas", label: "Assinaturas", icon: Rocket },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <aside style={{ background: "#121214", borderRight: "1px solid #27272a", padding: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 16 }}>Admin</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {nav.map((n) => {
            const active = pathname === n.to;
            const Icon = n.icon as any;
            return (
              <Link key={n.to} to={n.to} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: 8,
                color: active ? "#fff" : "#c9c9d1",
                background: active ? "#1f1f22" : "transparent",
                textDecoration: "none",
              }}>
                {Icon ? <Icon size={16} /> : null}
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={() => supabase.auth.signOut()} style={{
          marginTop: 24, width: "100%", display: "flex", alignItems: "center", gap: 8,
          height: 36, borderRadius: 8, background: "#2a2a2e", color: "#eee", border: "1px solid #3a3a3e", cursor: "pointer"
        }}>
          <LogOut size={16} /> Sair
        </button>
      </aside>
      <main style={{ padding: 16 }}>
        <Toaster richColors closeButton position="top-right" />
        {children}
      </main>
    </div>
  );
}
