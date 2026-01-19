import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const UsersAdmin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });

    setIsLoading(false);

    if (error) {
      toast({ 
        title: "Error creating user", 
        description: error.message,
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "User created", 
        description: "They can now log in with these credentials" 
      });
      setEmail("");
      setPassword("");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="space-y-6 font-sans max-w-xl">
      {/* Create User */}
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted/50">
              <UserPlus className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">Add Admin User</h3>
              <p className="text-sm text-muted-foreground">Create a new user who can access this panel</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <form onSubmit={handleCreateUser} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-email" className="text-sm font-medium">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="h-11 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-medium">Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="h-11 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="h-11 rounded-xl w-full sm:w-auto px-6"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Create User
            </Button>
          </form>
        </div>
      </div>

      {/* Session */}
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted/50">
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">Session</h3>
              <p className="text-sm text-muted-foreground">Manage your current session</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="h-11 rounded-xl"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UsersAdmin;
