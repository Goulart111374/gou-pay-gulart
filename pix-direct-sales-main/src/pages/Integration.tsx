import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ArrowLeft, Facebook, Info, Eye, EyeOff } from "lucide-react";
import { setApiToken as setFbApiToken, setPixelId as setFbPixelId, getApiToken as getFbApiToken, getPixelId as getFbPixelId, initPixel, trackPixelEvent, packApiToken } from "@/utils/fb";
import { Tables } from "@/integrations/supabase/types";

const Integration = () => {
  const navigate = useNavigate();
  const PLACEHOLDER = "••••••••••••••••";
  const [fbPixelId, setFbPixelIdInput] = useState("");
  const [fbToken, setFbTokenInput] = useState("");
  const [products, setProducts] = useState<Tables<"products">[]>([]);
  const [assocs, setAssocs] = useState<Tables<"fb_product_configs">[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

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
      if (savedTok) setFbTokenInput(PLACEHOLDER);
      await loadData(session.user.id);
    };
    init();
  }, [navigate]);

  const loadData = async (userId: string) => {
    const { data: prods } = await supabase.from("products").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setProducts(prods || []);
    const { data: links } = await supabase.from("fb_product_configs").select("product_id,is_active").eq("user_id", userId).eq("is_active", true);
    setAssocs(links || []);
  };

  const handleSaveIntegration = async () => {
    const pixelValid = /^[0-9]{8,20}$/.test(fbPixelId);
    const tokenMasked = fbToken === PLACEHOLDER;
    const tokenToUse = tokenMasked ? (await getFbApiToken()) : fbToken;
    const tokenValid = !!tokenToUse && tokenToUse.length >= 20;
    if (!selectedProductId) { toast.error("Selecione um produto"); return; }
    if (!pixelValid) { toast.error("ID do Pixel inválido"); return; }
    if (!tokenValid) { toast.error("Token API inválido"); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Você precisa estar logado"); navigate("/auth"); return; }
      await setFbPixelId(fbPixelId);
      await setFbApiToken(tokenToUse!);
      const name = `Pixel ${fbPixelId}`;
      const packed = await packApiToken(tokenToUse!);
      const { data: existing } = await supabase.from("fb_configs").select("id").eq("user_id", session.user.id).eq("pixel_id", fbPixelId).limit(1).maybeSingle();
      let cfgId = existing?.id as string | undefined;
      if (!cfgId) {
        const { data: created, error: insErr } = await supabase.from("fb_configs").insert({ user_id: session.user.id, name, pixel_id: fbPixelId, token_enc: packed, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select("id").single();
        if (insErr) throw insErr;
        cfgId = created?.id as string;
      } else {
        const { error: updErr } = await supabase.from("fb_configs").update({ token_enc: packed, updated_at: new Date().toISOString() }).eq("id", cfgId).eq("user_id", session.user.id);
        if (updErr) throw updErr;
      }
      await supabase.from("fb_product_configs").update({ is_active: false, updated_at: new Date().toISOString() }).eq("user_id", session.user.id).eq("product_id", selectedProductId).eq("campaign_name", null).eq("is_active", true);
      const { error: linkErr } = await supabase.from("fb_product_configs").insert({ user_id: session.user.id, product_id: selectedProductId, fb_config_id: cfgId!, campaign_name: null, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (linkErr) throw linkErr;
      initPixel();
      trackPixelEvent({ name: "PageView", time: Date.now(), sourceUrl: window.location.href });
      toast.success("Integração ativada");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setLoading(false);
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-primary/20 shadow-purple">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-primary" />
              <CardTitle>Integração do Facebook</CardTitle>
            </div>
            <CardDescription>Fluxo simplificado em três etapas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="text-sm font-medium">1. Seleção do produto</div>
                <div className="space-y-2">
                  {products.map((p) => {
                    const active = assocs.some((a) => a.product_id === p.id && a.is_active);
                    return (
                      <button key={p.id} className={`w-full text-left p-3 border rounded ${selectedProductId === p.id ? "bg-muted border-primary" : "bg-background"}`} onClick={() => setSelectedProductId(p.id)}>
                        <div className="flex items-center justify-between">
                          <div className="truncate">{p.name}</div>
                          {active && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs px-2 py-0.5 rounded bg-emerald-600 text-white">Pixel Ativo</span>
                              </TooltipTrigger>
                              <TooltipContent>Este produto possui Pixel vinculado e ativo</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {products.length === 0 && <div className="text-sm text-muted-foreground">Nenhum produto</div>}
                </div>
                <div className={`text-xs ${selectedProductId ? 'text-success' : 'text-muted-foreground'}`}>{selectedProductId ? "Produto selecionado" : "Selecione um produto"}</div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="fb_pixel_id">2. Pixel ID</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>Encontre o Pixel ID no Events Manager do Facebook</TooltipContent>
                  </Tooltip>
                </div>
                <Input id="fb_pixel_id" placeholder="ex: 165121022896834653" value={fbPixelId} onChange={(e) => setFbPixelIdInput(e.target.value)} />
                <div className={`text-xs ${/^[0-9]{8,20}$/.test(fbPixelId) ? 'text-success' : 'text-destructive'}`}>{/^[0-9]{8,20}$/.test(fbPixelId) ? "ID válido" : "ID inválido"}</div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="fb_token">3. Token API de Conversão</Label>
                </div>
                <div className="flex gap-2">
                  <Input id="fb_token" type={showToken ? "text" : "password"} placeholder="EA..." value={fbToken} onChange={(e) => setFbTokenInput(e.target.value)} />
                  <Button type="button" variant="outline" onClick={() => setShowToken((v) => !v)}>{showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                </div>
                <div className={`text-xs ${(fbToken === PLACEHOLDER || (fbToken && fbToken.length >= 20)) ? 'text-success' : 'text-destructive'}`}>{fbToken === PLACEHOLDER ? "Token salvo" : ((fbToken && fbToken.length >= 20) ? "Token válido" : "Token inválido")}</div>
              </div>

              <Button onClick={handleSaveIntegration} disabled={loading} className="w-full">Salvar e ativar integração</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Integration;
