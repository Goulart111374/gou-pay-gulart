import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Banknote, ArrowRightLeft, Library, Download, QrCode, Shield, User, Palette, CheckCircle, PlayCircle, Users, Ban, RefreshCcw, Lock, Check, X, TrendingUp, ArrowRight } from "lucide-react";

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

    // Lightweight parallax driven by requestAnimationFrame
    if (!reduce && typeof window.requestAnimationFrame === 'function') {
      const parallaxes = Array.from(document.querySelectorAll<HTMLElement>('.parallax-el'));
      let rafId: number | null = null;
      let lastY = window.scrollY;
      let lastX = 0;
      const onMouseMove = (e: MouseEvent) => { lastX = (e.clientX / window.innerWidth - 0.5) * 8; };
      const loop = () => {
        const y = window.scrollY;
        if (Math.abs(y - lastY) > 0.5 || Math.abs(lastX) > 0.1) {
          parallaxes.forEach((el) => {
            const speed = Number(el.dataset.parallaxSpeed || '0.06');
            const ty = y * speed;
            const tx = lastX * speed;
            el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
          });
          lastY = y;
        }
        rafId = window.requestAnimationFrame(loop);
      };
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      rafId = window.requestAnimationFrame(loop);
      return () => {
        io.disconnect();
        window.removeEventListener('mousemove', onMouseMove);
        if (rafId) cancelAnimationFrame(rafId);
      };
    }
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen text-white overflow-x-hidden site-primary-bg">
      <header className="w-full sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <nav className="flex items-center justify-between header-glass px-3 py-2">
            <div className="px-4 py-2">
              <span className="text-white text-xl font-semibold tracking-wide">GouPay</span>
            </div>
            <div className="flex items-center gap-2 px-2">
              <button onClick={() => navigate("/auth")} className="px-4 py-2 rounded-full text-[#CFCFCF] hover:text-white transition">
                Login
              </button>
              <Button className="btn-register font-semibold rounded-full" onClick={() => navigate("/auth?signup=1")}> 
                Cadastre-se
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden pt-20 md:pt-24 pb-16 checkerboard-hero">
          <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-[#8A2BE2]/25 blur-[110px] z-0 parallax-el hero-ambient" data-parallax-speed="0.06"></div>
          <div className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-[#5E2DBE]/25 blur-[110px] z-0 parallax-el hero-ambient" data-parallax-speed="0.10"></div>
          <div className="absolute inset-0 glass-hero z-10"></div>
          <div className="absolute inset-0 checkerboard-hero-overlay z-15"></div>

          <div className="mx-auto max-w-6xl px-4 relative z-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div className="order-1 md:order-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#232323]/80 border border-[#8A2BE2]/30 text-[#CFCFCF] mb-6">
                  <div className="h-2 w-2 rounded-full bg-[#8A2BE2]"></div>
                  <span>Plataforma em crescimento</span>
                </div>
                <h1 className="fade-on-scroll text-4xl md:text-6xl font-extrabold leading-tight">
                  <span className="block">Faça suas vendas sem pagar taxas Venda com a GouPay.</span>
                </h1>
                <p className="fade-on-scroll text-lg md:text-xl text-[#CFCFCF] mt-6 max-w-xl">
                  Uma plataforma feita para quem quer alta conversão, aprovação automática e venda imediata direto no banco, sem depender da plataforma.
                </p>
                <div className="mt-8 hidden md:flex flex-col sm:flex-row gap-4">
                  <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#D34FE2] text-black font-semibold hover:opacity-90 px-6 py-6 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A2BE2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A] active:scale-[0.99] transition" onClick={() => navigate("/auth?signup=1")}>
                    Começar gratuitamente
                  </Button>
                </div>
                <div className="mt-8 hidden md:flex items-center gap-6 text-[#AFAFAF]">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#8A2BE2]" /> Pagamentos seguros
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4 text-[#8A2BE2]" /> 99.9% uptime
                  </div>
                </div>
                
              </div>
              <div className="order-2 md:order-2 relative mobile-hero-container">
                <div className="absolute left-8 top-0 md:left-16 md:-top-6 z-20 sales-bounce">
                  <div className="rounded-xl bg-[#232323]/90 border border-white/10 shadow-xl px-5 py-4 md:scale-[1.18] mobile-sales-card">
                    <div className="text-xs text-[#9A9A9A]">Vendas hoje</div>
                    <div className="mt-1 text-3xl font-bold">R$ 12.450</div>
                    <div className="mt-1 text-xs text-[#9A9A9A]">+23.5%</div>
                  </div>
                </div>
                <img src="https://i.imgur.com/vtcLGj6.png" alt="Visão geral da plataforma" className="fade-on-scroll w-full h-auto rounded-xl shadow-none md:scale-[1.2] transform-gpu origin-center mobile-hero-img" loading="lazy" referrerPolicy="no-referrer" />
                <div className="mt-6 flex md:hidden flex-col gap-4 items-stretch">
                  <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#D34FE2] text-black font-semibold hover:opacity-90 px-6 py-6 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A2BE2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A] active:scale-[0.99] transition" onClick={() => navigate("/auth?signup=1")}>
                    Começar gratuitamente
                  </Button>
                  <div className="flex items-center justify-center gap-8 text-[#AFAFAF]">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#8A2BE2]" /> Pagamentos seguros
                    </div>
                    <div className="flex items-center gap-2">
                      <RefreshCcw className="h-4 w-4 text-[#8A2BE2]" /> 99.9% uptime
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Diferenciais</h2>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              <Card className="fade-on-scroll bg-[#232323] border-[#8A2BE2]/20 hover:border-[#8A2BE2]/40 transition transform hover:-translate-y-1 hover:shadow-2xl md:col-span-2">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-[#8A2BE2]/20 flex items-center justify-center mb-3"><ArrowRightLeft className="h-6 w-6 text-[#8A2BE2]" /></div>
                  <CardTitle>Integração Bancária Direta</CardTitle>
                  <CardDescription>Receba pagamentos sem checkout tradicional e com crédito imediato na sua conta.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mt-2 space-y-2 text-sm text-[#AFAFAF]">
                    <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-[#8A2BE2]" /> PIX compensado na hora</div>
                    <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-[#8A2BE2]" /> Zero intermediários e sem fila de repasse</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="fade-on-scroll bg-[#232323] border-[#8A2BE2]/20 hover:border-[#8A2BE2]/40 transition transform hover:-translate-y-1 hover:shadow-2xl md:col-span-2">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-[#8A2BE2]/20 flex items-center justify-center mb-3"><CheckCircle className="h-6 w-6 text-[#8A2BE2]" /></div>
                  <CardTitle>Recebimento Instantâneo</CardTitle>
                  <CardDescription>Receba seus valores sem taxas extras e sem retenção de saldo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mt-2 space-y-2 text-sm text-[#AFAFAF]">
                    <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-[#8A2BE2]" /> PIX D+0 imediato</div>
                    <div className="flex items-center gap-2"><RefreshCcw className="h-4 w-4 text-[#8A2BE2]" /> Operação simples, transparente e sem repasses manuais</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="fade-on-scroll bg-[#232323] border-[#8A2BE2]/20 hover:border-[#8A2BE2]/40 transition transform hover:-translate-y-1 hover:shadow-2xl md:col-span-2">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-[#8A2BE2]/20 flex items-center justify-center mb-3"><PlayCircle className="h-6 w-6 text-[#8A2BE2]" /></div>
                  <CardTitle>Área de Membros Premium</CardTitle>
                  <CardDescription>Ofereça uma experiência profissional estilo streaming para seus conteúdos.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mt-2 space-y-2 text-sm text-[#AFAFAF]">
                    <div className="flex items-center gap-2"><Library className="h-4 w-4 text-[#8A2BE2]" /> Biblioteca organizada e fácil de navegar</div>
                    <div className="flex items-center gap-2"><Download className="h-4 w-4 text-[#8A2BE2]" /> Downloads controlados com segurança</div>
                    <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#8A2BE2]" /> Acesso liberado automaticamente após o pagamento</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="fade-on-scroll bg-[#232323] border-[#8A2BE2]/20 hover:border-[#8A2BE2]/40 transition transform hover:-translate-y-1 hover:shadow-2xl md:col-span-3">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-[#8A2BE2]/20 flex items-center justify-center mb-3"><QrCode className="h-6 w-6 text-[#8A2BE2]" /></div>
                  <CardTitle>Venda Sem Checkout</CardTitle>
                  <CardDescription>Crie links diretos ou QR Codes PIX para pagamentos instantâneos.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mt-2 space-y-2 text-sm text-[#AFAFAF]">
                    <div className="flex items-center gap-2"><QrCode className="h-4 w-4 text-[#8A2BE2]" /> Pagamento gerado em segundos</div>
                    <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#8A2BE2]" /> Fluxo direto que aumenta a conversão</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="fade-on-scroll bg-[#232323] border-[#8A2BE2]/20 hover:border-[#8A2BE2]/40 transition transform hover:-translate-y-1 hover:shadow-2xl md:col-span-3">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-[#8A2BE2]/20 flex items-center justify-center mb-3"><Ban className="h-6 w-6 text-[#8A2BE2]" /></div>
                  <CardTitle>Sem Bloqueios ou Retenção</CardTitle>
                  <CardDescription>Conexão bancária real: o dinheiro vai direto para sua conta sem travas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mt-2 space-y-2 text-sm text-[#AFAFAF]">
                    <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-[#8A2BE2]" /> PIX D+0 sem espera</div>
                    <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-[#8A2BE2]" /> Sem congelamentos, reservas ou trancas de saldo</div>
                  </div>
                </CardContent>
              </Card>

              
            </div>
          </div>
        </section>


        <section className="py-20 members-bg rounded-2xl">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-20 items-center">
              <div>
                <h2 className="fade-on-scroll text-5xl md:text-6xl font-bold mb-4">
                  Área de Membros <span className="text-[#D34FE2]">Premium</span>
                </h2>
                <p className="fade-on-scroll text-[#CFCFCF] text-xl md:text-2xl mb-8">
                  Ofereça aos seus clientes uma experiência de acesso profissional e organizada, similar às principais plataformas de streaming.
                </p>
                <div className="space-y-4 text-[#CFCFCF] text-lg">
                  <div className="flex items-center gap-4"><div className="w-7 h-7 rounded-full bg-[#8A2BE2]/25 flex items-center justify-center"><CheckCircle className="h-4 w-4 text-[#D34FE2]" /></div> Acesso a produtos adquiridos</div>
                  <div className="flex items-center gap-4"><div className="w-7 h-7 rounded-full bg-[#8A2BE2]/25 flex items-center justify-center"><CheckCircle className="h-4 w-4 text-[#D34FE2]" /></div> Biblioteca de conteúdos digitais</div>
                  <div className="flex items-center gap-4"><div className="w-7 h-7 rounded-full bg-[#8A2BE2]/25 flex items-center justify-center"><CheckCircle className="h-4 w-4 text-[#D34FE2]" /></div> Gerenciamento de downloads</div>
                  <div className="flex items-center gap-4"><div className="w-7 h-7 rounded-full bg-[#8A2BE2]/25 flex items-center justify-center"><CheckCircle className="h-4 w-4 text-[#D34FE2]" /></div> Interface intuitiva e moderna</div>
                  <div className="flex items-center gap-4"><div className="w-7 h-7 rounded-full bg-[#8A2BE2]/25 flex items-center justify-center"><CheckCircle className="h-4 w-4 text-[#D34FE2]" /></div> Acesso liberado automaticamente</div>
                  <div className="flex items-center gap-4"><div className="w-7 h-7 rounded-full bg-[#8A2BE2]/25 flex items-center justify-center"><CheckCircle className="h-4 w-4 text-[#D34FE2]" /></div> Suporte a múltiplos formatos</div>
                </div>
                <Button className="mt-10 bg-gradient-to-r from-[#8A2BE2] to-[#D34FE2] text-black font-semibold hover:opacity-90 px-6 py-6 rounded-full shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A2BE2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A] active:scale-[0.99]" onClick={() => navigate("/auth")}> 
                  Conhecer plataforma
                </Button>
              </div>
              <div className="relative">
                <div className="fade-on-scroll members-card rounded-2xl border border-white/10 shadow-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold">Meus Produtos</span>
                    <span className="px-3 py-1 rounded-full bg-[#8A2BE2]/25 text-[#D34FE2] text-xs">3 ativos</span>
                  </div>
                  <div className="space-y-4">
                    <div className="fade-on-scroll members-item flex items-center justify-between p-4 rounded-xl border border-white/10 bg-gradient-to-br from-[#181818] to-[#1F1F1F]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#8A2BE2]/20 flex items-center justify-center"><PlayCircle className="h-6 w-6 text-[#D34FE2]" /></div>
                        <div>
                          <div className="font-semibold">Curso Completo 2024</div>
                          <div className="text-xs text-[#AFAFAF]">2.4 GB</div>
                        </div>
                      </div>
                      <button className="text-[#CFCFCF] font-medium">Acessar</button>
                    </div>
                    <div className="fade-on-scroll members-item flex items-center justify-between p-4 rounded-xl border border-white/10 bg-gradient-to-br from-[#181818] to-[#1F1F1F]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#8A2BE2]/20 flex items-center justify-center"><Download className="h-6 w-6 text-[#D34FE2]" /></div>
                        <div>
                          <div className="font-semibold">E-book Premium</div>
                          <div className="text-xs text-[#AFAFAF]">45 MB</div>
                        </div>
                      </div>
                      <button className="text-[#CFCFCF] font-medium">Acessar</button>
                    </div>
                    <div className="fade-on-scroll members-item flex items-center justify-between p-4 rounded-xl border border-white/10 bg-gradient-to-br from-[#181818] to-[#1F1F1F]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#8A2BE2]/20 flex items-center justify-center"><Lock className="h-6 w-6 text-[#D34FE2]" /></div>
                        <div>
                          <div className="font-semibold">Material Exclusivo</div>
                          <div className="text-xs text-[#AFAFAF]">890 MB</div>
                        </div>
                      </div>
                      <button className="text-[#CFCFCF] font-medium">Acessar</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 section-ambient pointer-events-none parallax-el" data-parallax-speed="0.04"></div>
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
                <span className="text-white">Por que pagar </span>
                <span className="bg-gradient-to-r from-[#8A2BE2] to-[#D34FE2] bg-clip-text text-transparent">taxa em cada venda</span>
                <span className="text-white"> se você pode pagar </span>
                <span className="bg-gradient-to-r from-[#8A2BE2] to-[#D34FE2] bg-clip-text text-transparent">só uma mensalidade?</span>
              </h2>
              <p className="mt-4 text-[#CFCFCF] text-lg max-w-3xl mx-auto">
                Aqui na GouPay você vende e o dinheiro vai direto para seu banco. Você não depende da plataforma para nada. Não paga taxa nas suas vendas porque a grana vai direto para seu banco.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="fade-on-scroll border-[#8A2BE2]/20 shadow-purple bg-[#232323]">
                <CardHeader>
                  <div className="flex items-center gap-2 text-[#CFCFCF]"><Palette className="h-5 w-5 text-[#8A2BE2]" /> Plano Único</div>
                </CardHeader>
                <CardContent>
                  <div className="text-6xl md:text-7xl font-extrabold mb-2">R$ 37<span className="text-4xl align-top">,90</span> <span className="text-2xl font-medium text-foreground">/ mês</span></div>
                  <div className="text-sm text-[#AFAFAF] mb-6">Melhor pagar R$ 37,90/mês do que uma taxa em cima de todas as vendas</div>
                  <ul className="space-y-3 text-sm text-[#CFCFCF]">
                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-[#8A2BE2]" /> Zero taxa em todas as suas vendas</li>
                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-[#8A2BE2]" /> Dinheiro direto no seu banco</li>
                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-[#8A2BE2]" /> Recebimento instantâneo via PIX</li>
                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-[#8A2BE2]" /> Área de membros premium inclusa</li>
                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-[#8A2BE2]" /> Sem limites de vendas</li>
                    <li className="flex items-center gap-3"><Check className="h-5 w-5 text-[#8A2BE2]" /> Suporte prioritário</li>
                  </ul>
                  <div className="mt-8">
                    <Button className="w-full bg-gradient-to-r from-[#C635E8] to-[#8A2BE2] text-white font-semibold hover:opacity-90 px-6 py-6 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A2BE2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A] active:scale-[0.99] transition-transform duration-200 flex items-center justify-center gap-2 group" onClick={() => navigate("/auth?signup=1")}>
                      Começar agora <ArrowRight className="h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                    <p className="text-center text-xs text-[#AFAFAF] mt-3">Cancele quando quiser - Sem fidelidade</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="fade-on-scroll border-[#8A2BE2]/20 shadow-purple bg-[#232323]">
                <CardHeader>
                  <div className="flex items-center gap-2 text-[#CFCFCF]"><TrendingUp className="h-5 w-5 text-[#8A2BE2]" /> Compare e economize</div>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="py-2 font-normal text-[#AFAFAF]"></th>
                        <th className="py-2 font-semibold text-[#D34FE2]">GouPay</th>
                        <th className="py-2 font-semibold text-[#AFAFAF]">Outros</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-white/10 transition-colors group hover:bg-white/5">
                        <td className="py-4 text-[#CFCFCF] pl-2">Taxa por venda</td>
                        <td className="py-4 font-semibold text-emerald-400"><div className="flex items-center gap-2"><Check className="h-4 w-4" /> 0%</div></td>
                        <td className="py-4 text-destructive pr-2 text-right"><div className="flex items-center gap-2 justify-end w-full"><X className="h-4 w-4" /> 4% a 12%</div></td>
                      </tr>
                      <tr className="border-t border-white/10 transition-colors group hover:bg-white/5">
                        <td className="py-4 text-[#CFCFCF] pl-2">Recebimento</td>
                        <td className="py-4 font-semibold text-emerald-400"><div className="flex items-center gap-2"><Check className="h-4 w-4" /> Instantâneo</div></td>
                        <td className="py-4 text-destructive pr-2 text-right"><div className="flex items-center gap-2 justify-end w-full"><X className="h-4 w-4" /> D+14 ou D+30</div></td>
                      </tr>
                      <tr className="border-t border-white/10 transition-colors group hover:bg-white/5">
                        <td className="py-4 text-[#CFCFCF] pl-2">Dinheiro vai para</td>
                        <td className="py-4 font-semibold text-emerald-400"><div className="flex items-center gap-2"><Check className="h-4 w-4" /> Seu banco direto</div></td>
                        <td className="py-4 text-destructive pr-2 text-right"><div className="flex items-center gap-2 justify-end w-full"><X className="h-4 w-4" /> Wallet da plataforma</div></td>
                      </tr>
                      <tr className="border-t border-white/10 transition-colors group hover:bg-white/5">
                        <td className="py-4 text-[#CFCFCF] pl-2">Dependência da plataforma</td>
                        <td className="py-4 font-semibold text-emerald-400"><div className="flex items-center gap-2"><Check className="h-4 w-4" /> Nenhuma</div></td>
                        <td className="py-4 text-destructive pr-2 text-right"><div className="flex items-center gap-2 justify-end w-full"><X className="h-4 w-4" /> Total</div></td>
                      </tr>
                      <tr className="border-t border-white/10 transition-colors group hover:bg-white/5">
                        <td className="py-4 text-[#CFCFCF] pl-2">Bloqueio de saldo</td>
                        <td className="py-4 font-semibold text-emerald-400"><div className="flex items-center gap-2"><Check className="h-4 w-4" /> Nunca</div></td>
                        <td className="py-4 text-destructive pr-2 text-right"><div className="flex items-center gap-2 justify-end w-full"><X className="h-4 w-4" /> Comum</div></td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-6 rounded-lg px-4 py-3 text-sm bg-emerald-900/25 border border-emerald-500/30">
                    <span className="font-medium text-emerald-300">Economia média:</span>
                    <span className="text-[#CFCFCF]"> vendendo R$ 5.000/mês você economiza até </span>
                    <span className="font-semibold text-emerald-300">R$ 562</span>
                    <span className="text-[#CFCFCF]"> em taxas</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#8A2BE2]/30 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-[#9A9A9A]">
          <p>© 2025 GouPay. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
