import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if already logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          navigate("/admin");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/admin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({ title: "Please enter email and password", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      toast({ 
        title: "Login failed", 
        description: error.message,
        variant: "destructive" 
      });
    } else {
      toast({ title: "Welcome back!" });
      navigate("/admin");
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-12 flex flex-col">
      {/* Back Navigation */}
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300 mb-16"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </Link>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl md:text-4xl font-light tracking-normal mb-12 text-center opacity-0 animate-fade-in-up">
            Login
          </h1>

          <form onSubmit={handleLogin} className="space-y-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
