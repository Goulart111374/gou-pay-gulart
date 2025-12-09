import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Rocket, Check, QrCode, Copy } from "lucide-react";
import { toast } from "sonner";
import { getReminderSchedule, shouldSchedule, markScheduled } from "@/utils/subscription";

const Subscription = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("inactive");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [qrCode, setQrCode] = useState<string>("");
  const [qrCodeBase64, setQrCodeBase64] = useState<string>("");
  const [paymentId, setPaymentId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "trial">("monthly");
  const enableTrial = false;

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const userId = session.user.id;
      const { data } = await supabase
        .from("subscriptions")
        .select("status,expires_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setStatus(data.status);
        setExpiresAt(data.expires_at);
      }
      const maybeEmail = session.user.email;
      setBuyerEmail(typeof maybeEmail === "string" ? maybeEmail : "");
      const meta = session.user.user_metadata as Record<string, unknown> | null | undefined;
      const maybeName = meta && typeof meta["name"] === "string" ? (meta["name"] as string) : "";
      setBuyerName(maybeName);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleCreate = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const userId = session.user.id;
      const resp = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, buyerEmail, buyerName, planType: enableTrial && selectedPlan === "trial" ? "trial" : undefined }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data?.error || "Erro ao gerar assinatura");
        return;
      }
      setPaymentId(data.payment_id || "");
      setStatus(data.status || "pending");
      setQrCode(data.qr_code || "");
      setQrCodeBase64(data.qr_code_base64 || "");
    } catch {
      toast.error("Erro ao iniciar assinatura");
    }
  };

  const handleRefresh = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;
      const resp = await fetch(`/api/check-subscription-status?userId=${encodeURIComponent(userId)}`);
      const data = await resp.json();
      if (resp.ok && data?.status) {
        setStatus(data.status);
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("expires_at")
          .eq("user_id", userId)
          .maybeSingle();
        setExpiresAt(sub?.expires_at || null);
        if (data.status === "approved" || data.status === "active") toast.success("Assinatura ativa"); else toast.info(`Status: ${data.status}`);
      } else {
        toast.error((data && typeof data.error === "string" ? data.error : undefined) || "Erro ao atualizar status");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao atualizar status";
      toast.error(message);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!paymentId || status === "active") return;
    const id = setInterval(() => { handleRefresh(); }, 10_000);
    return () => clearInterval(id);
  }, [paymentId, status]);

  useEffect(() => {
    if (!expiresAt) return;
    const expired = new Date(expiresAt) <= new Date();
    const isActive = status === "active" && !expired;
    if (!isActive) return;
    if (!shouldSchedule(expiresAt)) return;
    const schedule = getReminderSchedule(expiresAt);
    const timers = schedule.map((i) => {
      const ms = i.at - Date.now();
      if (ms <= 0) return -1 as number;
      return window.setTimeout(() => toast.info(i.label), ms);
    }).filter((id) => id !== -1);
    markScheduled(expiresAt);
    return () => { for (const id of timers) clearTimeout(id); };
  }, [expiresAt, status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const expired = expiresAt ? new Date(expiresAt) <= new Date() : true;
  const active = status === "active" && !expired;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Assinatura</h1>
        {active ? (
          <Card className="border-primary/20 shadow-purple">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Rocket className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="uppercase">Plano Mensal</CardTitle>
                  <CardDescription>Duração: 30 dias</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-5xl font-extrabold bg-gradient-hero bg-clip-text text-transparent">R$ 37,90 <span className="text-base align-top text-foreground">/ mês</span></div>
              <div className="text-sm text-muted-foreground">Sua assinatura está ativa.</div>
              <div className="text-sm">Expira em: {expiresAt ? new Date(expiresAt).toLocaleString() : "-"}</div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button className="bg-primary" onClick={() => { setSelectedPlan("monthly"); handleCreate(); }}>Renovar Assinatura</Button>
                {enableTrial && (
                  <Button variant="outline" onClick={() => { setSelectedPlan("trial"); handleCreate(); }}>Ativar Plano de Teste (R$ 2,00 / 5 min)</Button>
                )}
              </div>
              {enableTrial && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>O plano de teste concede acesso por 5 minutos para avaliação.</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/20 shadow-purple">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Rocket className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="uppercase">Plano Mensal</CardTitle>
                  <CardDescription>Duração: 30 dias</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!qrCode && (
                <>
                  <div className="text-5xl font-extrabold bg-gradient-hero bg-clip-text text-transparent">R$ 37,90 <span className="text-base align-top text-foreground">/ mês</span></div>
                  <ul className="space-y-2 text-sm text-foreground">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Sem taxas por venda — você recebe 100%.</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> QR Code PIX instantâneo para seus clientes.</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Links de pagamento simples e rápidos.</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Dashboard com vendas e área de membros.</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Integração Mercado Pago para vendas de produtos.</li>
                  </ul>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button variant="outline" className="w-full" onClick={() => { setSelectedPlan("monthly"); handleCreate(); }}>Escolher Plano Mensal</Button>
                    {enableTrial && (
                      <Button className="w-full bg-gradient-hero hover:opacity-90" onClick={() => { setSelectedPlan("trial"); handleCreate(); }}>Plano de Teste (R$ 2,00 / 5 min)</Button>
                    )}
                  </div>
                  {enableTrial && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p>Plano de teste válido por 5 minutos. Ideal para avaliar a plataforma.</p>
                      <p>Preço: R$ 2,00. Acesso temporário liberado após confirmação do PIX.</p>
                    </div>
                  )}
                </>
              )}
              {qrCode && (
                <>
                  <CardHeader className="px-0">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-6 w-6 text-primary" />
                      <CardTitle>Pagamento via PIX</CardTitle>
                    </div>
                    <CardDescription>Escaneie o QR Code ou copie o código PIX para pagar</CardDescription>
                  </CardHeader>
                  <div className="bg-white p-6 rounded-lg flex items-center justify-center">
                    {qrCodeBase64 ? (
                      <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code PIX" className="w-64 h-64 rounded-lg" />
                    ) : (
                      <div className="w-64 h-64 bg-muted flex items-center justify-center rounded-lg">
                        <QrCode className="h-32 w-32 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Código PIX</Label>
                    <div className="flex gap-2">
                      <Input value={qrCode} readOnly className="font-mono text-xs border-primary/20" />
                      <Button variant="outline" size="icon" onClick={copyPixCode} className="border-primary/20 hover:bg-primary/10">
                        {copied ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium mb-1">Valor a pagar</p>
                    <p className="text-2xl font-bold text-primary">{selectedPlan === "trial" ? "R$ 2,00" : "R$ 37,90"}</p>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Abra o app do seu banco</p>
                    <p>• Escolha pagar via PIX</p>
                    <p>• Escaneie o QR Code ou cole o código</p>
                    <p>• Confirme o pagamento</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRefresh}>Atualizar status</Button>
                    <Button onClick={() => setQrCode("")}>Nova tentativa</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Subscription;
 
