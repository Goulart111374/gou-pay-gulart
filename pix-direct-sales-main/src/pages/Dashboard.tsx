import { useEffect, useRef, useState } from "react";
import "@/styles/ascent-dashboard.css";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, HelpCircle, LogOut, CreditCard, Settings as SettingsIcon, Users, Facebook } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { filterByTimeframe, Timeframe, aggregateSeries } from "@/utils/dashboard";
import { getCurrentSubscription, isSubscriptionActive, markExpiredIfNeeded } from "@/utils/subscription";

interface Product {
  id: string;
  name: string;
  price: number;
  content_type: string;
  is_active: boolean;
  created_at: string;
}

interface Stats {
  totalSales: number;
  totalRevenue: number;
  productsCount: number;
}

interface Sale {
  id: string;
  amount: number;
  payment_status: string;
  product_id?: string;
  created_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSales: 0, totalRevenue: 0, productsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("monthly");
  const [periodStats, setPeriodStats] = useState<{ sales: number; revenue: number }>({ sales: 0, revenue: 0 });
  const [chartLoading, setChartLoading] = useState(false);
  const [series, setSeries] = useState<Array<{ date: string; value: number }>>([]);
  const navigate = useNavigate();
  const salesSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!SUPABASE_CONFIGURED) {
        toast.error("Configuração do Supabase ausente");
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadDashboardData(session.user.id);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadDashboardData = async (userId: string) => {
    let hadError = false;
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (productsError) {
        hadError = true;
        console.error(productsError);
      }
      setProducts(productsData || []);
    } catch (e) {
      hadError = true;
      console.error(e);
    }

    try {
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("id,amount,created_at,payment_status,product_id")
        .eq("seller_id", userId)
        .eq("payment_status", "approved")
        .order("created_at", { ascending: false });
      if (salesError) {
        hadError = true;
        console.error(salesError);
      }

      const salesArr: Sale[] = salesData || [];
      const totalRevenue = salesArr.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
      const totalSales = salesArr.length || 0;
      setStats((prev) => ({ totalSales, totalRevenue, productsCount: prev.productsCount || 0 }));

      const filtered = filterByTimeframe(salesArr, timeframe);
      setPeriodStats({
        sales: filtered.length,
        revenue: filtered.reduce((sum, s) => sum + Number(s.amount), 0),
      });
      setSeries(aggregateSeries(filtered, timeframe));
      setRecentSales(
        salesArr
          .slice(0, 10)
      );
    } catch (e) {
      hadError = true;
      console.error(e);
    }

    if (hadError) {
      toast.error("Erro ao carregar dados");
    }
    setLoading(false);
  };


  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      try {
        setChartLoading(true);
        const { data: salesData } = await supabase
          .from("sales")
          .select("id,amount,created_at,payment_status,product_id")
          .eq("seller_id", user.id)
          .eq("payment_status", "approved");
        const salesArr: Sale[] = salesData || [];
        const filtered = filterByTimeframe(salesArr, timeframe);
        setSeries(aggregateSeries(filtered, timeframe));
        const totalRevenue = salesArr.reduce((sum, s) => sum + Number(s.amount), 0);
        const totalSales = salesArr.length;
        try {
          const { data: productsData } = await supabase
            .from("products")
            .select("id")
            .eq("user_id", user.id);
          setStats({ totalSales, totalRevenue, productsCount: productsData?.length || 0 });
    } catch (e) {
      console.error(e);
    }
        setPeriodStats({
          sales: filtered.length,
          revenue: filtered.reduce((sum, s) => sum + Number(s.amount), 0),
        });
        setRecentSales(
          salesArr
            .slice()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10)
        );
        setChartLoading(false);
      } catch (e) {
        console.error(e);
      }
    };
    refresh();
  }, [user, timeframe]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const copyProductLink = (productId: string) => {
    const origin = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
    const link = `${origin}/pay/${productId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const handleGoToSales = () => {
    navigate("/dashboard/sales");
  };
  const pieColor = "#8A2BE2";
  const formatXAxis = (value: string) => {
    if (!value) return value;
    if (timeframe === "monthly") {
      const [y, m] = value.split("-");
      const d = new Date(Number(y), Number(m) - 1, 1);
      return d.toLocaleDateString("pt-BR", { month: "short" });
    }
    try {
      const d = new Date(value);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    } catch {
      return value;
    }
  };
  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const [mobileSidebarExpanded, setMobileSidebarExpanded] = useState<boolean>(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" data-ui="ascent-dashboard">
      <div className="w-full bg-card/80 border-b border-border/50 z-20">
        <div className={`mx-auto max-w-6xl py-4 flex items-center justify-between px-4 md:px-6 ${mobileSidebarExpanded ? "pl-[232px]" : "pl-[76px]"} ${desktopSidebarCollapsed ? "md:pl-[80px]" : "md:pl-[250px]"}`}>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">R$ {periodStats.revenue.toFixed(2)} / R$ 10,00K</div>
            <div className="w-24 md:w-40 h-2 bg-muted rounded">
              <div
                className="h-2 rounded"
                style={{ width: `${Math.min((periodStats.revenue / 10000) * 100, 100)}%`, backgroundColor: "#800080" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/settings")} className="gap-2 hidden md:flex">
              <CreditCard className="h-4 w-4" />
              Pagamentos
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center justify-center">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <div className="px-3 py-2 text-xs text-muted-foreground">{user?.email}</div>
                <DropdownMenuItem onClick={() => navigate("/members")}>
                  <Users className="mr-2 h-4 w-4" />
                  Área de Membros
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <main className={`mx-auto max-w-6xl px-4 md:px-6 py-6 ${desktopSidebarCollapsed ? "md:pl-[80px]" : "md:pl-[250px]"} ${mobileSidebarExpanded ? "pl-[232px]" : "pl-[76px]"}`}>
        <div className="block w-full mb-5">
          <img
            src="https://i.imgur.com/rR72NBL.jpeg"
            alt="Banner promocional"
            className="w-full h-auto rounded-xl border border-white/10 shadow-md transition-opacity duration-200 hover:opacity-90"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" data-dashboard="stats">
          <Card className="bg-card border rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Vendas Realizadas</CardTitle>
                <HelpCircle className="h-4 w-4 text-[#800080]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{periodStats.sales}</div>
              <p className="text-xs text-muted-foreground">Período: {timeframe}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Produtos Criados</CardTitle>
                <Package className="h-4 w-4 text-[#800080]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.productsCount}</div>
              <p className="text-xs text-muted-foreground">Unidade: itens</p>
            </CardContent>
          </Card>

          <Card className="bg-card border rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Saldo Acumulado</CardTitle>
                <DollarSign className="h-4 w-4 text-[#800080]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {periodStats.revenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Período: {timeframe}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8" data-dashboard="chart">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-sm">Estatísticas de Vendas</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setTimeframe("daily")}>Diária</Button>
              <Button variant="outline" size="sm" onClick={() => setTimeframe("weekly")}>Semanal</Button>
              <Button variant="outline" size="sm" onClick={() => setTimeframe("monthly")}>Mensal</Button>
            </div>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {chartLoading ? (
              <div className="h-full w-full animate-pulse rounded bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 16, left: 24, bottom: 8 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatXAxis} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <YAxis tickFormatter={formatCurrency} tick={{ fill: "#9CA3AF", fontSize: 12 }} width={72} />
                  <Tooltip formatter={(value: number) => formatCurrency(Number(value))} labelFormatter={(v) => String(formatXAxis(String(v)))} />
                  <Legend />
                  <Line type="linear" dataKey="value" name="Total de vendas" stroke="#800080" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} style={{ filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.15))" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        

        <div ref={salesSectionRef}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Transações Recentes</CardTitle>
            <CardDescription>Últimas vendas aprovadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 text-xs text-muted-foreground">
              <div>Order ID</div>
              <div>Produto</div>
              <div>Valor</div>
              <div>Status</div>
            </div>
            {recentSales.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground">Sem dados</div>
            ) : (
              <div className="mt-2 divide-y">
                {recentSales.map((s) => (
                  <div key={s.id} className="grid grid-cols-4 py-2 text-sm">
                    <div className="truncate">{s.id}</div>
                    <div className="truncate">{s.product_id || "-"}</div>
                    <div>R$ {Number(s.amount).toFixed(2)}</div>
                    <div className={s.payment_status === "approved" ? "text-success" : "text-muted-foreground"}>{s.payment_status}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </main>
      <aside data-ui="ascent-sidebar" className={`hidden md:flex fixed left-0 top-0 h-screen bg-transparent p-4 flex-col gap-3 transition-[width] duration-300 ease-out ${desktopSidebarCollapsed ? "w-[64px]" : "w-[250px]"}`}>
        <button
          aria-label="Alternar menu"
          className="hidden md:flex h-10 w-10 items-center justify-center rounded-md bg-card border border-border/60 mb-2"
          onClick={() => setDesktopSidebarCollapsed((v) => !v)}
        >
          <span className="text-xl">☰</span>
        </button>
        <Button 
          variant="ghost"
          className="justify-start gap-2 bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-10 px-2"
          onClick={() => navigate("/dashboard")}
        >
          <Package className="h-4 w-4" /> {desktopSidebarCollapsed ? null : <span className="text-foreground">Produtos</span>}
        </Button>
        {!desktopSidebarCollapsed && (
          <div className="pl-6 flex flex-col gap-2">
            <Button 
              variant="ghost" 
              className="justify-start bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-9 px-2"
              onClick={() => navigate("/dashboard/new-product")}
            >
              <span className="text-foreground">Criar Produto</span>
            </Button>
            <Button 
              variant="ghost" 
              className="justify-start bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-9 px-2"
              onClick={() => navigate("/dashboard/products")}
            >
              <span className="text-foreground">Produtos Criados</span>
            </Button>
          </div>
        )}
        <Button 
          variant="ghost" 
          className="justify-start gap-2 bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-10 px-2"
          onClick={handleGoToSales}
        >
          <DollarSign className="h-4 w-4" /> {desktopSidebarCollapsed ? null : <span className="text-foreground">Vendas</span>}
        </Button>
        <Button 
          variant="ghost" 
          className="justify-start gap-2 bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-10 px-2"
          onClick={() => navigate("/dashboard/settings")}
        >
          <CreditCard className="h-4 w-4" /> {desktopSidebarCollapsed ? null : <span className="text-foreground">Pagamentos</span>}
        </Button>
        <Button 
          variant="ghost" 
          className="justify-start gap-2 bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-10 px-2"
          onClick={() => navigate("/dashboard/integration")}
        >
          <Facebook className="h-4 w-4" /> {desktopSidebarCollapsed ? null : <span className="text-foreground">Integração</span>}
        </Button>
        <Button 
          variant="ghost" 
          className="justify-start gap-2 bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-10 px-2"
          onClick={() => navigate("/dashboard/terms")}
        >
          {desktopSidebarCollapsed ? null : <span className="text-foreground">Termos</span>}
        </Button>
        {!desktopSidebarCollapsed && (
          <Button
            variant="ghost"
            className="justify-start gap-2 bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-10 px-2 text-foreground"
            onClick={() => navigate("/dashboard/subscription")}
          >
            Upgrade
          </Button>
        )}
      </aside>
      <button
        aria-label="Abrir menu"
        className="md:hidden fixed left-4 top-4 z-40 h-10 w-10 rounded-full bg-card border border-border/60 flex items-center justify-center"
        onClick={() => setMobileSidebarExpanded((v) => !v)}
      >
        <span className="text-xl">☰</span>
      </button>
      <aside data-ui="ascent-sidebar"
        className={`md:hidden fixed left-0 top-0 h-screen bg-card border-r border-border/50 pt-16 transition-[width] duration-300 ease-out overflow-hidden z-30 ${mobileSidebarExpanded ? "w-[220px]" : "w-[64px]"}`}
      >
        <nav className="flex flex-col gap-2 px-3">
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { navigate("/dashboard"); setMobileSidebarExpanded(false); }}>
            <Package className="h-5 w-5" />
            {mobileSidebarExpanded && <span>Produtos</span>}
          </Button>
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { navigate("/dashboard/products"); setMobileSidebarExpanded(false); }}>
            <Package className="h-5 w-5" />
            {mobileSidebarExpanded && <span>Produtos Criados</span>}
          </Button>
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { navigate("/dashboard/new-product"); setMobileSidebarExpanded(false); }}>
            <Package className="h-5 w-5" />
            {mobileSidebarExpanded && <span>Criar Produto</span>}
          </Button>
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { handleGoToSales(); setMobileSidebarExpanded(false); }}>
            <DollarSign className="h-5 w-5" />
            {mobileSidebarExpanded && <span>Vendas</span>}
          </Button>
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { navigate("/dashboard/settings"); setMobileSidebarExpanded(false); }}>
            <CreditCard className="h-5 w-5" />
            {mobileSidebarExpanded && <span>Pagamentos</span>}
          </Button>
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { navigate("/dashboard/integration"); setMobileSidebarExpanded(false); }}>
            <Facebook className="h-5 w-5" />
            {mobileSidebarExpanded && <span>Integração</span>}
          </Button>
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { navigate("/dashboard/terms"); setMobileSidebarExpanded(false); }}>
            {mobileSidebarExpanded && <span>Termos</span>}
          </Button>
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { navigate("/dashboard/subscription"); setMobileSidebarExpanded(false); }}>
            {mobileSidebarExpanded && <span>Upgrade</span>}
          </Button>
        </nav>
      </aside>
    </div>
  );
};

export default Dashboard;
const SUPABASE_CONFIGURED = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
