import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trackPixelEvent, sendConversionsAPI, getCampaignFromUrl } from "@/utils/fb";

type Product = { id: string; user_id?: string; name: string; description: string | null };
type Module = { id: string; product_id: string; title: string };
type Lesson = { id: string; module_id: string | null; title: string; description: string | null; content_type: string | null; content_url: string | null };

const LessonView = () => {
  const navigate = useNavigate();
  const { productId, lessonId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      let ok = false;
      try {
        const email = session.user.email as string;
        const userId = session.user.id as string;
        if (isPreview) {
          const { data: pOwner } = await supabase.from("products").select("user_id").eq("id", productId).maybeSingle();
          if (pOwner?.user_id && pOwner.user_id === userId) ok = true;
        }
        if (!ok) {
          const { data: membership } = await supabase
            .from("memberships")
            .select("id,status")
            .eq("product_id", productId)
            .or(`buyer_user_id.eq.${userId},buyer_email.eq.${email}`)
            .maybeSingle();
          ok = Boolean(membership && membership.status === "approved");
        }
        setHasAccess(ok);
        if (!ok) { setLoading(false); return; }
      } catch (e) {
        console.error(e);
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const { data: p } = await supabase.from("products").select("id,user_id,name,description").eq("id", productId).maybeSingle();
      setProduct(p || null);

      const { data: l } = await supabase.from("lessons").select("*").eq("product_id", productId).order("order_index", { ascending: true });
      const { data: m } = await supabase.from("modules").select("*").eq("product_id", productId).order("order_index", { ascending: true });
      if ((l || []).length === 0) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const resp = await fetch('/api/member-lessons', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, buyerEmail: session?.user?.email, buyerUserId: session?.user?.id }),
          });
          const json = await resp.json();
          setLessons(json?.lessons || []);
          setModules(json?.modules || []);
        } catch {
          setLessons([]);
          setModules([]);
        }
      } else {
        setLessons(l || []);
        setModules(m || []);
      }

      const current = (l || []).find(x => x.id === lessonId) || null;
      setLesson(current);
      setLoading(false);
    };
    init();
  }, [navigate, productId, lessonId]);

  useEffect(() => {
    if (!hasAccess || !lesson || !product) return;
    const run = async () => {
      try {
        const campaign = getCampaignFromUrl(window.location.href);
        const ev = { name: "ViewContent" as const, time: Date.now(), sourceUrl: window.location.href, customData: { product_id: product.id, lesson_id: lesson.id, campaign } };
        trackPixelEvent(ev);
        await sendConversionsAPI(ev);
      } catch { void 0; }
    };
    run();
  }, [hasAccess, lesson?.id, product?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md"><CardContent className="pt-6"><p className="text-center text-muted-foreground">Acesso restrito ao conteúdo. Verifique sua compra.</p></CardContent></Card>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md"><CardContent className="pt-6"><p className="text-center text-muted-foreground">Aula não encontrada</p></CardContent></Card>
      </div>
    );
  }

  const moduleLessons = lessons.filter(x => x.module_id === lesson.module_id);

  const normalizeVideo = (url: string) => {
    if (!url) return null as null | { kind: "iframe" | "video"; src: string };
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (host.includes("youtube.com")) {
        const id = u.searchParams.get("v");
        if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
      }
      if (host.includes("youtu.be")) {
        const id = u.pathname.replace("/", "");
        if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
      }
      if (host.includes("vimeo.com")) {
        const id = u.pathname.split("/").filter(Boolean)[0];
        if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
      }
      if (host.includes("drive.google.com") && u.pathname.includes("/file/d/")) {
        const parts = u.pathname.split("/");
        const idx = parts.indexOf("d");
        const id = idx >= 0 ? parts[idx + 1] : "";
        if (id) return { kind: "iframe", src: `https://drive.google.com/file/d/${id}/preview` };
      }
      if (/[.]mp4($|[?])/i.test(url) || /[.]webm($|[?])/i.test(url) || /[.]ogg($|[?])/i.test(url)) {
        return { kind: "video", src: url };
      }
      return { kind: "iframe", src: url };
    } catch {
      return { kind: "iframe", src: url };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isPreview && (
          <div className="lg:col-span-3 mb-4">
            <Button variant="outline" onClick={() => window.history.back()}>Voltar à lista de produtos</Button>
          </div>
        )}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>{lesson.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {lesson.content_type === "video" && lesson.content_url ? (
                (() => {
                  const embed = normalizeVideo(lesson.content_url);
                  if (!embed) return <p className="text-muted-foreground">Sem conteúdo associado.</p>;
                  if (embed.kind === "video") {
                    return (
                      <div className="w-full">
                        <video src={embed.src} controls className="w-full h-auto" />
                      </div>
                    );
                  }
                  return (
                    <div className="aspect-video w-full bg-black">
                      <iframe title={lesson.title} src={embed.src} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                    </div>
                  );
                })()
              ) : lesson.content_type === "pdf" && lesson.content_url ? (
                <div className="w-full h-[70vh]">
                  <iframe title={lesson.title} src={lesson.content_url} className="w-full h-full"></iframe>
                </div>
              ) : lesson.content_url ? (
                <Button asChild><a href={lesson.content_url} target="_blank" rel="noreferrer">Abrir Conteúdo</a></Button>
              ) : (
                <p className="text-muted-foreground">Sem conteúdo associado.</p>
              )}
              {lesson.description && <div className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">{lesson.description}</div>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Módulos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {modules.map(m => (
                  <div key={m.id} className="border rounded p-3">
                    <div className="font-medium mb-2">{m.title}</div>
                    <div className="space-y-1">
                      {lessons.filter(x => x.module_id === m.id).map(x => (
                        <Button key={x.id} variant={x.id === lesson.id ? "default" : "outline"} className="w-full justify-start" onClick={() => navigate(`/members/product/${productId}/lesson/${x.id}`)}>
                          {x.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LessonView;
  const params = new URLSearchParams(window.location.search);
  const isPreview = params.get("preview") === "1";
