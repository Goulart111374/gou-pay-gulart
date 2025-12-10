import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Key } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [hasConfig, setHasConfig] = useState(false);
  

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
        
      </main>
    </div>
  );
};

export default Settings;
