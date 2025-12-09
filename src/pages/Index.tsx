import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, QrCode, TrendingUp, Zap, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = Array.from(document.querySelectorAll<HTMLElement>('.fade-on-scroll'));
    items.forEach((el, i) => {
      el.style.setProperty('--stagger', `${Math.min(i * 80, 400)}ms`);
      if (reduce) el.classList.add('in-view');
    });
    if (reduce || !(window as any).IntersectionObserver) {
      items.forEach((el) => el.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          el.classList.add('in-view');
        } else {
          el.classList.remove('in-view');
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="container mx-auto px-4 py-20 text-center text-primary-foreground relative">
          <h1 className="fade-on-scroll text-4xl md:text-6xl font-bold mb-6">
            Faça suas vendas sem pagar taxas Venda com a GouPay.
          </h1>
          <p className="fade-on-scroll text-xl md:text-2xl mb-8 opacity-90 max-w-2xl mx-auto">
            Uma plataforma feita para quem quer alta conversão, aprovação automática e venda imediata direto no banco, sem depender da plataforma.
          </p>
          <div className="mt-10 flex justify-center">
            <img src="https://i.imgur.com/vtcLGj6.png" alt="Visão geral da plataforma" className="fade-on-scroll w-full max-w-4xl h-auto rounded-xl border border-primary/30 shadow-lg" loading="lazy" referrerPolicy="no-referrer" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Como Funciona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="fade-on-scroll border-primary/20 bg-gradient-card hover:shadow-purple transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Cadastre Produtos</CardTitle>
                <CardDescription>
                  Adicione seus e-books, PDFs ou vídeos do YouTube em minutos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="fade-on-scroll border-primary/20 bg-gradient-card hover:shadow-purple transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Compartilhe o Link</CardTitle>
                <CardDescription>
                  Gere e compartilhe links únicos com QR Code PIX automático
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="fade-on-scroll border-primary/20 bg-gradient-card hover:shadow-purple transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-success/20 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
                <CardTitle>Receba Instantâneo</CardTitle>
                <CardDescription>
                  Pagamentos via PIX caem direto na sua conta do Mercado Pago
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <h2 className="fade-on-scroll text-3xl md:text-4xl font-bold text-center mb-12">
            Por Que Escolher Nossa Plataforma?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="fade-on-scroll flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Pagamento Instantâneo</h3>
                <p className="text-muted-foreground">
                  Sem checkout complexo. Seus clientes veem o QR Code PIX direto na tela.
                </p>
              </div>
            </div>

            <div className="fade-on-scroll flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Seguro e Confiável</h3>
                <p className="text-muted-foreground">
                  Integração direta com Mercado Pago. Seus dados e pagamentos 100% seguros.
                </p>
              </div>
            </div>

            <div className="fade-on-scroll flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Acompanhe Vendas</h3>
                <p className="text-muted-foreground">
                  Dashboard completo com faturamento diário, semanal e mensal.
                </p>
              </div>
            </div>

            <div className="fade-on-scroll flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Múltiplos Produtos</h3>
                <p className="text-muted-foreground">
                  Venda PDFs, e-books e aulas em vídeo. Tudo em um só lugar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-success relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L2c+PC9zdmc+')] opacity-10"></div>
        <div className="container mx-auto px-4 text-center text-primary-foreground relative">
          <h2 className="fade-on-scroll text-3xl md:text-4xl font-bold mb-6">
            Pronto para Começar a Vender?
          </h2>
          <p className="fade-on-scroll text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Crie sua conta grátis e comece a receber pagamentos via PIX hoje mesmo
          </p>
          <Button 
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white text-primary hover:bg-white/90 shadow-purple"
          >
            Criar Conta Gratuita
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-card/50">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Plataforma de Vendas. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
