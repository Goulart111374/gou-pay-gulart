import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { QrCode, Copy, Check, CheckCircle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { trackPixelEvent, sendConversionsAPI, getCampaignFromUrl } from "@/utils/fb";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  user_id: string;
}

const PaymentPage = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [emailValid, setEmailValid] = useState<boolean>(false);
  const [nameValid, setNameValid] = useState<boolean>(false);
  const [touched, setTouched] = useState<{ email: boolean; name: boolean }>({ email: false, name: false });
  const [showPayment, setShowPayment] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [qrCodeBase64, setQrCodeBase64] = useState<string>("");
  const [paymentId, setPaymentId] = useState<string>("");
  const [status, setStatus] = useState<string>("pending");
  const [sellerBlocked, setSellerBlocked] = useState<boolean>(false);
  const [paymentStartedAt, setPaymentStartedAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [purchaseTracked, setPurchaseTracked] = useState<boolean>(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      setProduct(data);
      try {
        const campaign = getCampaignFromUrl(window.location.href);
        const ev = { name: "ViewContent" as const, time: Date.now(), sourceUrl: window.location.href, customData: { product_id: data.id, price: data.price, campaign } };
        trackPixelEvent(ev);
        await sendConversionsAPI(ev);
      } catch { void 0; }
    } catch (error) {
      toast.error("Produto não encontrado");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayment = async () => {
    if (!buyerEmail || !buyerName || !emailValid || !nameValid) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Você deve aceitar os Termos da GouPay");
      return;
    }

    try {
      const resp = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product!.id,
          buyerEmail,
          buyerName,
          acceptedTerms: true,
        }),
      });

      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json() : { error: await resp.text() };
      if (!resp.ok) {
        if (resp.status === 403) {
          setSellerBlocked(true);
          toast.error("O vendedor precisa renovar a assinatura para ativar os pagamentos.");
          setShowPayment(false);
          return;
        }
        const details = typeof data?.details === "string" ? data.details : JSON.stringify(data?.details ?? {});
        throw new Error(`${data?.error || "Erro ao gerar pagamento"}${details ? `: ${details}` : ""}`);
      }

      setQrCode(data.qr_code || "");
      setQrCodeBase64(data.qr_code_base64 || "");
      setPaymentId(data.payment_id || "");
      setStatus(data.status || "pending");
      setShowPayment(true);
      setPaymentStartedAt(Date.now());
      setRemainingMs(24 * 60 * 60 * 1000);
      toast.success("Pagamento gerado! Escaneie o QR Code ou copie o código PIX");
      try {
        const campaign = getCampaignFromUrl(window.location.href);
        const ev = { name: "AddToCart" as const, time: Date.now(), sourceUrl: window.location.href, customData: { product_id: product!.id, price: product!.price, email: buyerEmail, name: buyerName, campaign } };
        trackPixelEvent(ev);
        await sendConversionsAPI(ev);
      } catch { void 0; }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao gerar pagamento";
      toast.error(message);
    }
  };

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    setEmailValid(emailRegex.test(buyerEmail.trim()));
  }, [buyerEmail]);

  useEffect(() => {
    const onlyLetters = buyerName.trim().length > 1;
    setNameValid(onlyLetters);
  }, [buyerName]);

  useEffect(() => {
    if (!paymentId) return;
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/check-payment-status?paymentId=${paymentId}`);
        const data = await resp.json();
        if (resp.ok && data?.status) {
          setStatus(data.status);
          if (data.status === "approved") {
            toast.success("Compra aprovada!");
            clearInterval(interval);
            if (!purchaseTracked && product) {
              try {
                const campaign = getCampaignFromUrl(window.location.href);
                const ev = { name: "Purchase" as const, time: Date.now(), sourceUrl: window.location.href, value: product.price, currency: "BRL", customData: { product_id: product.id, payment_id: paymentId, campaign } };
                trackPixelEvent(ev);
                await sendConversionsAPI(ev);
                setPurchaseTracked(true);
              } catch { void 0; }
            }
          }
        }
      } catch { void 0; }
    }, 5000);
    return () => clearInterval(interval);
  }, [paymentId]);

  useEffect(() => {
    if (!paymentStartedAt) return;
    const expiresAt = paymentStartedAt + 24 * 60 * 60 * 1000;
    const tick = () => setRemainingMs(Math.max(0, expiresAt - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [paymentStartedAt]);

  const fmt = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const hh = String(Math.floor(total / 3600)).padStart(2, "0");
    const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Produto não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="payment-bg p-6">
      {!showPayment ? (
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 px-1">
            <h1 className="text-[#EDE7F6] text-lg font-semibold tracking-wide">Checkout</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white shadow-sm border rounded-xl">
            <CardHeader>
              <CardTitle className="text-base tracking-wide text-[#2B2B2B]">Identifique-se</CardTitle>
              <CardDescription className="text-neutral-700">Utilizaremos seu e‑mail para identificação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buyer_email" className="text-[#6A2FE0]">Email</Label>
                <Input
                  id="buyer_email"
                  type="email"
                  placeholder="seu@email.com"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  aria-invalid={touched.email && !emailValid}
                  className="rounded-lg bg-[#F2ECFF] border-[#8A2BE2]/30 text-[#1B1426] placeholder-[#7A73A8] focus-visible:ring-2 focus-visible:ring-[#8A2BE2] focus-visible:border-[#8A2BE2]"
                />
                {touched.email && (
                  <p className={`text-xs ${emailValid ? "text-[#6A2FE0]" : "text-destructive"}`}>
                    {emailValid ? "E‑mail válido" : "Informe um e‑mail válido"}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyer_name" className="text-[#6A2FE0]">Nome completo</Label>
                <Input
                  id="buyer_name"
                  placeholder="Digite seu nome completo"
                  value={buyerName}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, "");
                    setBuyerName(v);
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  aria-invalid={touched.name && !nameValid}
                  className="rounded-lg bg-[#F2ECFF] border-[#8A2BE2]/30 text-[#1B1426] placeholder-[#7A73A8] focus-visible:ring-2 focus-visible:ring-[#8A2BE2] focus-visible:border-[#8A2BE2]"
                />
                {touched.name && (
                  <p className={`text-xs ${nameValid ? "text-[#6A2FE0]" : "text-destructive"}`}>
                    {nameValid ? "Nome válido" : "Use apenas letras e espaços"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border rounded-xl">
            <CardHeader>
              <CardTitle className="text-base tracking-wide text-[#2B2B2B]">Formas de pagamento</CardTitle>
              <CardDescription className="text-neutral-700">Para finalizar, escolha uma forma de pagamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border-2 border-emerald-600 bg-emerald-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-emerald-600" />
                  <span className="font-medium text-emerald-700">PIX</span>
                </div>
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Checkbox id="checkout_terms" checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(Boolean(v))} />
                <label htmlFor="checkout_terms" className="text-[#2B2B2B]">
                  <span className="align-middle">Declaro que li e aceito os </span>
                  <a href="/dashboard/terms" target="_blank" rel="noreferrer" className="text-[#6A2FE0] underline">Termos de Uso da Plataforma GOUPAY</a>
                </label>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:opacity-95 font-semibold"
                onClick={handleGeneratePayment}
                disabled={sellerBlocked || !emailValid || !nameValid || !acceptedTerms}
              >
                Finalizar compra
              </Button>
              {sellerBlocked && (
                <div className="text-destructive text-sm">Vendedor precisa renovar a assinatura.</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border rounded-xl">
            <CardHeader>
              <CardTitle className="text-base tracking-wide text-[#2B2B2B]">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-[#6A2BE2]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2B2B2B]">{product.name}</p>
                  <p className="text-xs text-neutral-700 break-words whitespace-normal">{product.description}</p>
                </div>
              </div>
              <div className="border-t pt-3 text-sm text-[#2B2B2B]">
                <div className="flex justify-between"><span className="text-neutral-700">Subtotal</span><span className="text-[#2B2B2B]">R$ {product.price.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold mt-2"><span className="text-[#2B2B2B]">Total</span><span className="text-[#2B2B2B]">R$ {product.price.toFixed(2)}</span></div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          <Card className="w-full bg-[#111111] border-[#2A2A2A] rounded-2xl">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
                <div className="space-y-1">
                  <p className="text-sm text-[#AFAFAF]">Produtos</p>
                  <p className="font-medium">1x {product.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-[#AFAFAF]">Total</p>
                  <p className="font-bold text-xl">R$ {product.price.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-[#AFAFAF]">Email</p>
                  <p className="font-medium">{buyerEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full bg-[#111111] border-[#2A2A2A] rounded-2xl text-white">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between text-sm text-[#AFAFAF]">
                <span>Tempo restante</span>
                <span className="font-mono text-base text-white">{fmt(remainingMs)}</span>
              </div>
              <div className="text-center text-[#AFAFAF]">QR code</div>
              <div className="relative mx-auto w-[280px] h-[280px] flex items-center justify-center">
                <span className="absolute left-0 top-0 w-8 h-1 bg-amber-400"></span>
                <span className="absolute left-0 top-0 w-1 h-8 bg-amber-400"></span>
                <span className="absolute right-0 top-0 w-8 h-1 bg-amber-400"></span>
                <span className="absolute right-0 top-0 w-1 h-8 bg-amber-400"></span>
                <span className="absolute left-0 bottom-0 w-8 h-1 bg-amber-400"></span>
                <span className="absolute left-0 bottom-0 w-1 h-8 bg-amber-400"></span>
                <span className="absolute right-0 bottom-0 w-8 h-1 bg-amber-400"></span>
                <span className="absolute right-0 bottom-0 w-1 h-8 bg-amber-400"></span>
                <div className="rounded-xl overflow-hidden bg-white p-3">
                  {qrCodeBase64 ? (
                    <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code PIX" className="w-[240px] h-[240px]" />
                  ) : (
                    <div className="w-[240px] h-[240px] bg-muted flex items-center justify-center">
                      <QrCode className="h-24 w-24 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
              <div className="text-center text-[#AFAFAF]">Ou pague com</div>
              <div className="space-y-2">
                <Label className="text-white">PIX Copia e cola</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 bg-[#191919] border border-[#2A2A2A] rounded-lg p-2">
                    <Copy className="h-4 w-4 text-[#AFAFAF]" />
                    <Input value={qrCode} readOnly className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-xs text-[#EDEDED]" />
                  </div>
                  <Button onClick={copyPixCode} className="w-full bg-[#222222] hover:bg-[#2A2A2A] text-white">
                    Copiar Código Pix
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full bg-[#111111] border-[#2A2A2A] rounded-2xl text-white">
            <CardContent className="p-6 space-y-3">
              <p className="font-semibold">Importante</p>
              <p className="text-[#AFAFAF]">Como pagar com o Pix</p>
              <div className="space-y-3 text-sm text-[#AFAFAF]">
                <div className="flex items-center gap-2"><QrCode className="h-4 w-4 text-white" /> Utilize o app de seu banco para escanear o código QR.</div>
                <div className="flex items-center gap-2"><Copy className="h-4 w-4 text-white" /> Copie o código Pix acima e cole no app do seu banco.</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-white" /> Após o pagamento será aprovado automaticamente.</div>
              </div>
              {status === "approved" && (
                <div className="mt-4 border border-[#2A2A2A] rounded-lg p-4 bg-[#161616]">
                  <p className="font-medium text-success">Compra aprovada</p>
                  <Button className="mt-3 w-full" asChild>
                    <a href={`/auth?signup=1&prefillEmail=${encodeURIComponent(buyerEmail)}`}>Criar conta e acessar</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
