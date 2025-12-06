import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Info, Handshake, Wallet, ShieldCheck, UserCheck, UserPlus, ClipboardList, Undo2, ShieldAlert, Ban, Users, ShoppingCart, LifeBuoy, ThumbsUp, AlertTriangle, CheckCircle, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 md:px-6 py-6">
        <div className="mb-4">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Voltar</Button>
        </div>
        <Card className="border-primary/20 shadow-purple">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-6 w-6 text-[#8A2BE2]" /> ✅ TERMOS DE USO DA PLATAFORMA GOUPAY</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none text-foreground space-y-6">
            <div className="rounded-lg border p-4 text-sm">
              <p><strong>Última atualização:</strong> 06/12/2025</p>
              <p><strong>Razão Social:</strong> Ademir Goulart</p>
              <p><strong>CNPJ:</strong> 58.704.951/0001-21</p>
              <p><strong>Endereço:</strong> Avenida Goias 301</p>
              <p><strong>E-mail de contato:</strong> <a href="mailto:authgou@gmail.com" className="text-primary underline">authgou@gmail.com</a></p>
            </div>

            <p>
              A GOUPAY é uma plataforma digital de intermediação tecnológica que disponibiliza ferramentas para hospedagem de páginas de vendas, área de membros e meios técnicos para redirecionamento de pagamentos diretamente entre VENDEDORES e COMPRADORES, sem intermediação financeira por parte da plataforma.
            </p>
            <p>
              A GOUPAY não é fornecedora, comerciante, vendedora, revendedora ou proprietária dos produtos e serviços ofertados na plataforma, atuando exclusivamente como provedora de tecnologia.
            </p>
            <p>O aceite destes Termos é obrigatório para utilização da plataforma.</p>

            <div className="flex items-center gap-2"><Info className="h-5 w-5 text-[#8A2BE2]" /> <h2>I — DEFINIÇÕES</h2></div>
            <ul>
              <li><strong>Plataforma:</strong> Sistema digital disponibilizado pela GOUPAY.</li>
              <li><strong>Vendedor:</strong> Usuário que cadastra produtos ou serviços para venda.</li>
              <li><strong>Comprador:</strong> Usuário que adquire produtos ou serviços.</li>
              <li><strong>Produtos Digitais:</strong> Cursos, mentorias, assinaturas, arquivos, aulas e similares.</li>
            </ul>

            <div className="flex items-center gap-2"><Handshake className="h-5 w-5 text-[#8A2BE2]" /> <h2>II — NATUREZA DA INTERMEDIAÇÃO</h2></div>
            <p>A GOUPAY atua exclusivamente como intermediadora tecnológica, não participando das relações comerciais firmadas entre Vendedores e Compradores.</p>
            <p>A relação jurídica de compra e venda ocorre diretamente entre o Vendedor e o Comprador.</p>

            <div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-[#8A2BE2]" /> <h2>III — DO FLUXO FINANCEIRO</h2></div>
            <p>Os pagamentos realizados pelos Compradores são direcionados diretamente às contas bancárias ou meios de recebimento indicados pelos Vendedores.</p>
            <p className="font-medium">A GOUPAY:</p>
            <ul>
              <li>Não recebe valores;</li>
              <li>Não realiza repasses;</li>
              <li>Não retém, administra ou custodia recursos financeiros;</li>
              <li>Não realiza estornos;</li>
              <li>Não opera split de pagamentos.</li>
            </ul>
            <p>Toda a responsabilidade financeira da operação é do Vendedor.</p>

            <Separator className="my-4" />
            <div className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-[#8A2BE2]" /> <h2>IV — RESPONSABILIDADES DO VENDEDOR</h2></div>
            <p>O Vendedor declara que:</p>
            <ul>
              <li>Possui capacidade civil e legal para exercer atividade comercial.</li>
              <li>Fornece dados verdadeiros, completos e atualizados.</li>
              <li>Comercializa apenas produtos e serviços lícitos.</li>
            </ul>
            <p>O Vendedor é exclusivamente responsável por:</p>
            <ul>
              <li>Criação e veracidade do conteúdo;</li>
              <li>Entrega do produto ou serviço;</li>
              <li>Atendimento ao consumidor;</li>
              <li>Garantias legais;</li>
              <li>Política de reembolso;</li>
              <li>Cumprimento do Código de Defesa do Consumidor;</li>
              <li>Emissão de notas fiscais, quando aplicável;</li>
              <li>Tributos incidentes;</li>
              <li>Cancelamentos, devoluções e estornos;</li>
              <li>Chargebacks e disputas financeiras.</li>
            </ul>
            <p>A GOUPAY não interfere na formação de preço, oferta, prazos ou condições comerciais.</p>

            <Separator className="my-4" />
            <div className="flex items-center gap-2"><Undo2 className="h-5 w-5 text-[#8A2BE2]" /> <h2>V — REEMBOLSOS, TROCAS E ESTORNOS</h2></div>
            <p>Todas as solicitações de:</p>
            <ul>
              <li>Cancelamento;</li>
              <li>Arrependimento;</li>
              <li>Reembolso;</li>
              <li>Troca;</li>
              <li>Chargeback;</li>
            </ul>
            <p>devem ser tratadas diretamente com o Vendedor, que é o único detentor dos valores pagos.</p>
            <p>A GOUPAY não possui acesso nem controle sobre esses valores.</p>

            <Separator className="my-4" />
            <div className="flex items-center gap-2"><Users className="h-5 w-5 text-[#8A2BE2]" /> <h2>VI — RESPONSABILIDADES DO COMPRADOR</h2></div>
            <p>O Comprador compromete-se a:</p>
            <ul>
              <li>Fornecer dados verdadeiros;</li>
              <li>Utilizar a plataforma de forma lícita;</li>
              <li>Não praticar fraudes;</li>
              <li>Não utilizar indevidamente os meios de pagamento;</li>
              <li>Não realizar chargebacks indevidos como forma de fraude.</li>
            </ul>
            <p>O Comprador reconhece que está comprando diretamente do Vendedor e que a GOUPAY é apenas intermediadora tecnológica.</p>

            <Separator className="my-4" />
            <div className="flex items-center gap-2"><Handshake className="h-5 w-5 text-[#8A2BE2]" /> <h2>VII — MEDIAÇÃO FACULTATIVA</h2></div>
            <p>A GOUPAY poderá, a seu critério, atuar como mediadora de conflitos, de forma facultativa, sem assumir responsabilidades financeiras ou comerciais.</p>

            <Separator className="my-4" />
            <div className="flex items-center gap-2"><Ban className="h-5 w-5 text-[#8A2BE2]" /> <h2>VIII — SANÇÕES E BLOQUEIOS</h2></div>
            <p>A GOUPAY poderá, a qualquer momento e sem aviso prévio:</p>
            <ul>
              <li>Suspender contas;</li>
              <li>Remover páginas;</li>
              <li>Bloquear acessos;</li>
              <li>Encerrar cadastros;</li>
            </ul>
            <p>em casos de denúncias fundamentadas, fraudes, atividades ilegais ou descumprimento destes Termos.</p>

            <Separator className="my-4" />
            <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-[#8A2BE2]" /> <h2>IX — LIMITAÇÃO DE RESPONSABILIDADE</h2></div>
            <p>A GOUPAY não é responsável por:</p>
            <ul>
              <li>Qualidade dos produtos;</li>
              <li>Conteúdo das ofertas;</li>
              <li>Atrasos;</li>
              <li>Garantias;</li>
              <li>Reembolsos;</li>
              <li>Entregas;</li>
              <li>Atos dos Vendedores.</li>
            </ul>
            <p>A responsabilidade da GOUPAY se limita exclusivamente ao funcionamento técnico da plataforma, nos termos da legislação vigente.</p>
            <p>Nada neste Termo exclui direitos garantidos ao consumidor por lei.</p>

            <Separator className="my-4" />
            <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-[#8A2BE2]" /> <h2>X — RESSARCIMENTO</h2></div>
            <p>O Vendedor compromete-se a ressarcir integralmente a GOUPAY por quaisquer prejuízos, multas, condenações, custas processuais e honorários advocatícios decorrentes de sua conduta.</p>

            <Separator className="my-4" />
            <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-[#8A2BE2]" /> <h2>XI — LGPD — PROTEÇÃO DE DADOS</h2></div>
            <p>A GOUPAY realiza o tratamento de dados pessoais de acordo com a Lei nº 13.709/2018 (LGPD).</p>
            <p>Os dados são utilizados para:</p>
            <ul>
              <li>Funcionamento da plataforma;</li>
              <li>Identificação dos usuários;</li>
              <li>Comunicação operacional;</li>
              <li>Cumprimento de obrigações legais.</li>
            </ul>
            <p>O titular dos dados pode solicitar: acesso, correção, exclusão e revogação de consentimento pelo e-mail <a href="mailto:authgou@gmail.com" className="text-primary underline">authgou@gmail.com</a>.</p>

            <Separator className="my-4" />
            <div className="flex items-center gap-2"><Info className="h-5 w-5 text-[#8A2BE2]" /> <h2>XII — VIGÊNCIA E ALTERAÇÕES</h2></div>
            <p>A GOUPAY pode alterar estes Termos a qualquer tempo, mediante publicação na plataforma. O uso contínuo implica aceite automático.</p>

            <Separator className="my-4" />
            <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-[#8A2BE2]" /> <h2>XIII — ACEITE</h2></div>
            <p>Ao se cadastrar na plataforma, o usuário declara que leu, compreendeu e concorda integralmente com estes Termos.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Terms;
