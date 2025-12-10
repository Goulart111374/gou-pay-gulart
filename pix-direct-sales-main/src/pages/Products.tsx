import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, Eye } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { getCurrentSubscription, isSubscriptionActive, markExpiredIfNeeded } from "@/utils/subscription";

type Product = {
  id: string;
  name: string;
  description: string | null;
  content_type: string;
  content_url: string;
  image_url?: string | null;
  user_id: string;
};

const Products = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [assocs, setAssocs] = useState<Tables<"fb_product_configs">[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const userId = session.user.id;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Erro ao carregar produtos");
      }
      setProducts(data || []);
      const { data: links } = await supabase
        .from("fb_product_configs")
        .select("product_id,is_active")
        .eq("user_id", userId)
        .eq("is_active", true);
      setAssocs(links || []);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const copyProductLink = (productId: string) => {
    const base = import.meta.env.BASE_URL || "/";
    const origin = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
    const link = `${origin}${base}pay/${productId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const previewProduct = async (productId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id,order_index")
        .eq("product_id", productId)
        .order("order_index", { ascending: true });
      const firstLessonId = (lessons || [])[0]?.id;
      if (firstLessonId) {
        navigate(`/members/product/${productId}/lesson/${firstLessonId}?preview=1`);
      } else {
        toast.info("Nenhuma aula cadastrada");
      }
    } catch {
      toast.error("Erro ao abrir visualização");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Produtos Criados</h1>
          <Button onClick={() => navigate("/dashboard/new-product")}>Criar Produto</Button>
        </div>
        {products.length === 0 ? (
          <Card className="border-primary/20">
            <CardContent className="py-8">
              <p className="text-muted-foreground">Nenhum produto criado.</p>
              <Button className="mt-4" onClick={() => navigate("/dashboard/new-product")}>Criar novo produto</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p) => {
              const active = assocs.some((a) => a.product_id === p.id && a.is_active);
              return (
              <Card key={p.id} className="border-primary/20 hover:border-primary/40 transition relative">
                <CardHeader className="pb-0 flex items-center justify-between">
                  <CardTitle className="text-sm truncate">{p.name}</CardTitle>
                  {active && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-600 text-white">Pixel Ativo</span>
                      </TooltipTrigger>
                      <TooltipContent>Este produto possui Pixel vinculado e ativo</TooltipContent>
                    </Tooltip>
                  )}
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="w-full h-[180px] bg-muted rounded overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">180×180</div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/product/${p.id}`)} className="gap-1">
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => copyProductLink(p.id)}>Copiar link</Button>
                    <Button variant="outline" size="sm" onClick={() => previewProduct(p.id)} className="gap-1">
                      <Eye className="h-4 w-4" /> Exibir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );})}
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;
