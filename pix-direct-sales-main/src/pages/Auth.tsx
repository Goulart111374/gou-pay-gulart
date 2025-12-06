import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [acceptedTermsSignup, setAcceptedTermsSignup] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const signup = params.get("signup");
    const prefillEmail = params.get("prefillEmail");
    if (signup === "1") setIsLogin(false);
    if (prefillEmail) setEmail(prefillEmail);
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/dashboard");
    };
    checkUser();
  }, [navigate, location.search]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
        navigate("/dashboard");
      } else {
        if (!acceptedTermsSignup) {
          toast.error("Você deve aceitar os Termos da GouPay");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, accepted_terms: true, accepted_terms_at: new Date().toISOString() }, emailRedirectTo: `${import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin}/dashboard` },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Cadastro concluído! Entrando...");
          navigate("/dashboard");
        } else {
          toast.info("Verifique seu e-mail para confirmar o cadastro. Após confirmar, você será direcionado ao dashboard.");
          try {
            const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
            if (!loginErr) navigate("/dashboard");
          } catch (e) { void e; }
        }
      }
    } catch {
      toast.error("Falha na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper min-h-screen flex items-center justify-center payment-bg px-5">
      <Card className="auth-card w-[90%] sm:w-full sm:max-w-md bg-card border rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">{isLogin ? "Entrar" : "Criar conta"}</CardTitle>
          <CardDescription>Use seu e-mail e senha</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base md:h-10 md:text-sm" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 text-base md:h-10 md:text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 text-base md:h-10 md:text-sm" />
          </div>
          <Button type="submit" className="w-full h-11 text-base md:h-10 md:text-sm" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isLogin ? "Entrar" : "Cadastrar"}
          </Button>
          {!isLogin && (
            <div className="flex items-center gap-3 text-sm">
              <Checkbox id="signup_terms" checked={acceptedTermsSignup} onCheckedChange={(v) => setAcceptedTermsSignup(Boolean(v))} />
              <label htmlFor="signup_terms" className="text-foreground">
                <span className="align-middle">Declaro que li e aceito os </span>
                <a href="/dashboard/terms" target="_blank" rel="noreferrer" className="text-primary underline">Termos de Uso da Plataforma GOUPAY</a>
              </label>
            </div>
          )}
          <Button type="button" variant="ghost" className="w-full h-11 text-base md:h-10 md:text-sm" onClick={() => setIsLogin((v) => !v)}>
            {isLogin ? "Criar conta" : "Já tenho conta"}
          </Button>
        </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
