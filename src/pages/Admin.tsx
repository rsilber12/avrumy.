import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart3, Layout, Globe, Music, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MusicArtworkAdmin from "@/components/admin/MusicArtworkAdmin";
import DesignGalleryAdmin from "@/components/admin/DesignGalleryAdmin";
import WebsitesAdmin from "@/components/admin/WebsitesAdmin";
import UsersAdmin from "@/components/admin/UsersAdmin";
import AnalyticsAdmin from "@/components/admin/AnalyticsAdmin";

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session);
        if (!session) {
          navigate("/login");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-foreground/60 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
          <div className="w-2 h-2 bg-foreground/20 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="text-sm font-medium">Back to site</span>
          </Link>
          <h1 className="text-lg font-medium tracking-tight">Control Panel</h1>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="w-full grid grid-cols-5 gap-1 bg-muted/50 p-1 rounded-2xl backdrop-blur-sm border border-border/50 mb-8 h-auto">
            <TabsTrigger 
              value="analytics" 
              className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:shadow-primary/5 transition-all duration-300"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Analytics</span>
            </TabsTrigger>
            <TabsTrigger 
              value="gallery" 
              className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:shadow-primary/5 transition-all duration-300"
            >
              <Layout className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Gallery</span>
            </TabsTrigger>
            <TabsTrigger 
              value="websites" 
              className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:shadow-primary/5 transition-all duration-300"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Websites</span>
            </TabsTrigger>
            <TabsTrigger 
              value="music" 
              className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:shadow-primary/5 transition-all duration-300"
            >
              <Music className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Music</span>
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:shadow-primary/5 transition-all duration-300"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Users</span>
            </TabsTrigger>
          </TabsList>

          <div className="animate-fade-in">
            <TabsContent value="analytics" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <AnalyticsAdmin />
            </TabsContent>

            <TabsContent value="gallery" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <DesignGalleryAdmin />
            </TabsContent>

            <TabsContent value="websites" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <WebsitesAdmin />
            </TabsContent>

            <TabsContent value="music" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <MusicArtworkAdmin />
            </TabsContent>

            <TabsContent value="users" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <UsersAdmin />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
