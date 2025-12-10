import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Key, Facebook } from "lucide-react";
import { setApiToken as setFbApiToken, setPixelId as setFbPixelId, getApiToken as getFbApiToken, getPixelId as getFbPixelId, getLog } from "@/utils/fb";
type FbLogEntry = { name?: string; status?: "success" | "failed"; via?: string; time?: number; sourceUrl?: string; customData?: Record<string, unknown>; value?: number; currency?: string };

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [hasConfig, setHasConfig] = useState(false);
  const [fbPixelId, setFbPixelIdInput] = useState("");
  const [fbToken, setFbTokenInput] = useState("");
  const [fbStatus, setFbStatus] = useState<"idle" | "connected" | "failed">("idle");
  const [fbLog, setFbLog] = useState<FbLogEntry[]>([]);
  const [fbSummary, setFbSummary] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const [campaigns, setCampaigns] = useState<Record<string, { sent: number; purchases: number }>>({});

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status,expires_at")
        .eq("user_id", session.user.id)
        .maybeSingle();
      const expired = sub?.expires_at ? new Date(sub.expires_at) <= new Date() : true;
      if (expired && sub?.status !== "expired") {
        await supabase.from("subscriptions").update({ status: "expired" }).eq("user_id", session.user.id);
      }
      if (!sub || sub.status !== "active" || expired) {
        toast.info("Funcionalidade premium: o Access Token é usado apenas em vendas de produtos.");
      }
      await loadConfig(session.user.id);
      const savedPid = getFbPixelId();
      const savedTok = await getFbApiToken();
      if (savedPid) setFbPixelIdInput(savedPid);
      if (savedTok) setFbTokenInput("••••••••••••••••");
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

  const loadConfig = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("mercado_pago_config")
        .select("access_token")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setAccessToken("••••••••••••••••");
        setHasConfig(true);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao carregar configurações";
      toast.error(message);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        navigate("/auth");
        return;
      }
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status,expires_at")
        .eq("user_id", session.user.id)
        .maybeSingle();
      const expired = sub?.expires_at ? new Date(sub.expires_at) <= new Date() : true;
      if (expired && sub?.status !== "expired") {
        await supabase.from("subscriptions").update({ status: "expired" }).eq("user_id", session.user.id);
      }
      if (!sub || sub.status !== "active" || expired) {
        toast.error("Plano inativo: assinatura necessária para salvar o Access Token.");
        return;
      }

      if (accessToken === "••••••••••••••••") {
        toast.info("Nenhuma alteração realizada");
        return;
      }

      const prefixOk = accessToken.startsWith("APP_USR-");
      if (!prefixOk || accessToken.length < 24) {
        toast.error("Access Token inválido. Use o formato APP_USR-...");
        return;
      }

      const { error } = await supabase
        .from("mercado_pago_config")
        .upsert(
          {
            user_id: session.user.id,
            access_token: accessToken,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      toast.success("Configuração salva com sucesso!");
      setAccessToken("••••••••••••••••");
      setHasConfig(true);
    } catch (e: unknown) {
      const err = e as { message?: string; name?: string; stack?: string; code?: string; details?: string; hint?: string };
      const parts = [err.message, err.code, err.details, err.hint].filter(Boolean);
      toast.error(parts.join(" — ") || "Erro ao salvar configuração");
    } finally {
      setLoading(false);
    }
  };

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
      if (token && pid) {
        const resp = await fetch("/api/fb-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pixel_id: pid, token, event: { name: "PageView", time: Date.now(), sourceUrl: window.location.href } }),
        });
        setFbStatus(resp.ok ? "connected" : "failed");
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
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-2 hover:bg-primary/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">Configurações</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-primary/20 shadow-purple">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Integração Mercado Pago</CardTitle>
            </div>
            <CardDescription>
              Configure seu Access Token do Mercado Pago para receber pagamentos de produtos. As assinaturas mensais usam uma configuração da plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="access_token">Access Token *</Label>
              <Input
                id="access_token"
                type="password"
                placeholder="APP_USR-..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="border-primary/20"
              />
              <p className="text-sm text-muted-foreground">
                Você pode obter seu Access Token no{" "}
                <a
                  href="https://www.mercadopago.com.br/developers/panel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  painel do Mercado Pago
                </a>
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Tutorial: Como configurar seu token do Mercado Pago</h3>
          <p className="text-sm text-muted-foreground">Assista ao passo a passo para conectar sua conta e inserir o Access Token corretamente.</p>
          <AspectRatio ratio={16 / 9}>
            <iframe
              title="Tutorial: Como configurar seu token do Mercado Pago"
              src="https://player.vimeo.com/video/1141671089?autoplay=0&muted=0&playsinline=1"
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer"
            ></iframe>
          </AspectRatio>
        </div>

        {hasConfig && (
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
            <p className="text-sm text-success">
              ✓ Mercado Pago configurado com sucesso
            </p>
              </div>
            )}

            <Button 
              onClick={handleSave} 
              className="w-full bg-gradient-hero hover:opacity-90 shadow-purple"
              disabled={loading || !accessToken || accessToken === "••••••••••••••••"}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Configuração"
              )}
            </Button>

            <div className="pt-4 border-t border-primary/20">
              <h3 className="font-medium mb-2">Como funciona?</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Configure seu Access Token do Mercado Pago</li>
                <li>Crie produtos na plataforma</li>
                <li>Compartilhe os links de pagamento</li>
                <li>Os compradores verão o QR Code PIX automaticamente</li>
                <li>Receba os pagamentos diretamente na sua conta</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        <div className="h-6" />
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

export default Settings;
