import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Facebook } from "lucide-react";
import { setApiToken as setFbApiToken, setPixelId as setFbPixelId, getApiToken as getFbApiToken, getPixelId as getFbPixelId, getLog, initPixel, trackPixelEvent, packApiToken } from "@/utils/fb";
import { Tables } from "@/integrations/supabase/types";

type FbLogEntry = { name?: string; status?: "success" | "failed"; via?: string; time?: number; sourceUrl?: string; customData?: Record<string, unknown>; value?: number; currency?: string };

const Integration = () => {
  const navigate = useNavigate();
  const [fbPixelId, setFbPixelIdInput] = useState("");
  const [fbToken, setFbTokenInput] = useState("");
  const [fbStatus, setFbStatus] = useState<"idle" | "connected" | "connected_pixel_only" | "failed">("idle");
  const [fbLog, setFbLog] = useState<FbLogEntry[]>([]);
  const [fbSummary, setFbSummary] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const [campaigns, setCampaigns] = useState<Record<string, { sent: number; purchases: number }>>({});
  const [products, setProducts] = useState<Tables<"products">[]>([]);
  const [configs, setConfigs] = useState<Tables<"fb_configs">[]>([]);
  const [assocs, setAssocs] = useState<Tables<"fb_product_configs">[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [campaignName, setCampaignName] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const savedPid = getFbPixelId();
      const savedTok = await getFbApiToken();
      if (savedPid) setFbPixelIdInput(savedPid);
      if (savedTok) setFbTokenInput("••••••••••••••••");
      await loadData(session.user.id);
      try {
        const log = getLog();
        setFbLog(log);
        const success = log.filter((x) => x.status === "success").length;
        const failed = log.filter((x) => x.status === "failed").length;
        setFbSummary({ success, failed });
        const byCamp: Record<string, { sent: number; purchases: number }> = {};
        for (const item of log) {
          const camp = (item?.customData?.campaign as string) || "-";
          if (!byCamp[camp]) byCamp[camp] = { sent: 0, purchases: 0 };
          byCamp[camp].sent += item.status === "success" ? 1 : 0;
          if (item.name === "Purchase" && item.status === "success") byCamp[camp].purchases += 1;
        }
        setCampaigns(byCamp);
      } catch { void 0; }
    };
    init();
  }, [navigate]);

  const handleSaveFacebook = async () => {
    try {
      if (!fbPixelId || !/^[0-9]{8,20}$/.test(fbPixelId)) {
        toast.error("ID do Pixel inválido");
        return;
      }
      if (fbToken && fbToken !== "••••••••••••••••" && fbToken.length < 20) {
        toast.error("Token API inválido");
        return;
      }
      await setFbPixelId(fbPixelId);
      if (fbToken !== "••••••••••••••••") await setFbApiToken(fbToken);
      toast.success("Facebook Pixel configurado");
      setFbTokenInput("••••••••••••••••");
      setFbStatus("idle");
      const token = await getFbApiToken();
      const pid = getFbPixelId();
      try {
        initPixel();
        trackPixelEvent({ name: "PageView", time: Date.now(), sourceUrl: window.location.href });
        setFbStatus("connected");
      } catch { /* noop */ }
      if (token && pid) {
        try {
          const base = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_PUBLIC_API_BASE || "";
          const url = base ? `${base}/api/fb-events` : "/api/fb-events";
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pixel_id: pid, token, event: { name: "PageView", time: Date.now(), sourceUrl: window.location.href } }),
          });
          if (!resp.ok) {
            let msg = "";
            try { const j = await resp.json(); msg = j?.error || ""; } catch {}
            if (resp.status === 404 || resp.status === 503) setFbStatus("connected_pixel_only");
            else {
              setFbStatus("failed");
              if (msg) toast.error(String(msg));
            }
          }
        } catch {
          setFbStatus("connected_pixel_only");
        }
      }
    } catch (e) {
      setFbStatus("failed");
      toast.error("Falha ao conectar ao Facebook");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm border-primary/20">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-2 hover:bg-primary/10">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">Integração</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/20 shadow-purple">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-primary" />
              <CardTitle>Gerenciar Pixels/Tokens</CardTitle>
            </div>
            <CardDescription>Cadastre, edite e remova suas configurações do Facebook</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fb_pixel_id">ID Pixel</Label>
              <Input id="fb_pixel_id" placeholder="ex: 165121022896834653" value={fbPixelId} onChange={(e) => setFbPixelIdInput(e.target.value)} className="border-primary/20" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fb_token">Token Pixel API</Label>
              <Input id="fb_token" type="password" placeholder="EA..." value={fbToken} onChange={(e) => setFbTokenInput(e.target.value)} className="border-primary/20" />
            </div>
            <Button onClick={handleCreateConfig} disabled={loading} className="w-full bg-gradient-hero hover:opacity-90 shadow-purple">Salvar</Button>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Minhas Configurações</h4>
              <div className="space-y-2">
                {configs.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma configuração</p>}
                {configs.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="text-sm">{c.name} — Pixel {c.pixel_id}</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setFbPixelIdInput(c.pixel_id); setSelectedConfigId(c.id); setFbTokenInput("••••••••••••••••"); }}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteConfig(c.id)}>Remover</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-purple">
          <CardHeader>
            <CardTitle>Associar a Produtos</CardTitle>
            <CardDescription>Vincule Pixel/Token a produtos e campanhas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <select className="border rounded h-10 px-3" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                <option value="">Selecione</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Configuração</Label>
              <select className="border rounded h-10 px-3" value={selectedConfigId} onChange={(e) => setSelectedConfigId(e.target.value)}>
                <option value="">Selecione</option>
                {configs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Campanha (opcional)</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="utm_campaign" />
            </div>
            <Button onClick={handleAssociate} disabled={loading} className="w-full">Associar</Button>

            <div className="pt-2 border-t border-primary/20">
              <h4 className="text-sm font-semibold">Status por Produto</h4>
              <div className="space-y-2">
                {products.map((p) => {
                  const links = assocs.filter((a) => a.product_id === p.id && a.is_active);
                  return (
                    <div key={p.id} className="p-2 border rounded">
                      <div className="text-sm font-medium">{p.name}</div>
                      {links.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Sem Pixel/Token</div>
                      ) : (
                        <div className="text-sm">{links.map((l) => {
                          const c = configs.find((x) => x.id === l.fb_config_id);
                          return (<div key={l.id}>{c?.name} — campanha {l.campaign_name || "(todas)"}</div>);
                        })}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
        <Card className="border-primary/20 shadow-purple">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-primary" />
              <CardTitle>Facebook Pixel</CardTitle>
            </div>
            <CardDescription>
              Configure o ID do Pixel e o Token da API para rastrear eventos e enviar via Conversions API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fb_pixel_id">ID Pixel</Label>
              <Input id="fb_pixel_id" placeholder="ex: 165121022896834653" value={fbPixelId} onChange={(e) => setFbPixelIdInput(e.target.value)} className="border-primary/20" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fb_token">Token Pixel API</Label>
              <Input id="fb_token" type="password" placeholder="EA..." value={fbToken} onChange={(e) => setFbTokenInput(e.target.value)} className="border-primary/20" />
            </div>
            <Button onClick={handleSaveFacebook} className="w-full bg-gradient-hero hover:opacity-90 shadow-purple">
              {fbStatus === "idle" && "Instalar"}
              {fbStatus === "connected" && "Conectado"}
              {fbStatus === "connected_pixel_only" && "Conectado (Pixel)"}
              {fbStatus === "failed" && "Tentar novamente"}
            </Button>
            {fbStatus === "connected" && (
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm text-success">✓ Pixel conectado</p>
              </div>
            )}
            {fbStatus === "failed" && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">Falha ao enviar evento de teste. Verifique o Token e ID.</p>
              </div>
            )}
            {fbStatus === "connected_pixel_only" && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning">Pixel ativo. Conversions API indisponível no deploy atual.</p>
              </div>
            )}
            <div className="pt-2 border-t border-primary/20">
              <h3 className="font-medium mb-2">Relatórios de Integração</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 border rounded">
                  <div className="text-muted-foreground">Eventos enviados</div>
                  <div className="font-semibold">{fbSummary.success}</div>
                </div>
                <div className="p-3 border rounded">
                  <div className="text-muted-foreground">Eventos com falha</div>
                  <div className="font-semibold">{fbSummary.failed}</div>
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-sm font-semibold">Taxa de conversão por campanha</h4>
                <div className="space-y-2 mt-2">
                  {Object.keys(campaigns).length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
                  {Object.entries(campaigns).map(([camp, stats]) => {
                    const rate = stats.sent > 0 ? Math.round((stats.purchases / stats.sent) * 100) : 0;
                    return (
                      <div key={camp} className="flex items-center justify-between p-2 border rounded">
                        <div className="text-sm">{camp}</div>
                        <div className="text-sm">{rate}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Integration;
  const loadData = async (userId: string) => {
    const { data: prods } = await supabase.from("products").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setProducts(prods || []);
    const { data: cfgs } = await supabase.from("fb_configs").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setConfigs(cfgs || []);
    const { data: links } = await supabase.from("fb_product_configs").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setAssocs(links || []);
  };

  const handleCreateConfig = async () => {
    if (!fbPixelId || !/^[0-9]{8,20}$/.test(fbPixelId)) { toast.error("ID do Pixel inválido"); return; }
    if (fbToken && fbToken !== "••••••••••••••••" && fbToken.length < 20) { toast.error("Token API inválido"); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Você precisa estar logado"); navigate("/auth"); return; }
      const name = `Pixel ${fbPixelId}`;
      const packed = fbToken !== "••••••••••••••••" ? await packApiToken(fbToken) : (await packApiToken(await getFbApiToken() || ""));
      if (!packed) { toast.error("Forneça o token"); return; }
      const { error } = await supabase.from("fb_configs").insert({ user_id: session.user.id, name, pixel_id: fbPixelId, token_enc: packed, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (error) throw error;
      await loadData(session.user.id);
      await setFbPixelId(fbPixelId);
      if (fbToken !== "••••••••••••••••") await setFbApiToken(fbToken);
      setFbTokenInput("••••••••••••••••");
      toast.success("Pixel/Token cadastrado");
    } catch (e) { const msg = e instanceof Error ? e.message : "Erro ao salvar"; toast.error(msg); } finally { setLoading(false); }
  };

  const handleDeleteConfig = async (id: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Você precisa estar logado"); navigate("/auth"); return; }
      const { error } = await supabase.from("fb_configs").delete().eq("id", id).eq("user_id", session.user.id);
      if (error) throw error;
      await loadData(session.user.id);
      toast.success("Configuração removida");
    } catch (e) { const msg = e instanceof Error ? e.message : "Erro ao remover"; toast.error(msg); } finally { setLoading(false); }
  };

  const handleAssociate = async () => {
    if (!selectedProductId || !selectedConfigId) { toast.error("Selecione produto e configuração"); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Você precisa estar logado"); navigate("/auth"); return; }
      await supabase.from("fb_product_configs").update({ is_active: false, updated_at: new Date().toISOString() }).eq("user_id", session.user.id).eq("product_id", selectedProductId).eq("campaign_name", campaignName || null).eq("is_active", true);
      const { error } = await supabase.from("fb_product_configs").insert({ user_id: session.user.id, product_id: selectedProductId, fb_config_id: selectedConfigId, campaign_name: campaignName || null, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (error) throw error;
      await loadData(session.user.id);
      toast.success("Associação criada");
    } catch (e) { const msg = e instanceof Error ? e.message : "Erro ao associar"; toast.error(msg); } finally { setLoading(false); }
  };
