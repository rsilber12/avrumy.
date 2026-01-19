import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Globe, Mail, Users, TrendingUp } from "lucide-react";

const AnalyticsAdmin = () => {
  const { data: totalVisits } = useQuery({
    queryKey: ["analytics-total-visits"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("page_visits")
        .select("*", { count: "exact", head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: todayVisits } = useQuery({
    queryKey: ["analytics-today-visits"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count, error } = await supabase
        .from("page_visits")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());
      
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: countryData } = useQuery({
    queryKey: ["analytics-countries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_visits")
        .select("country")
        .not("country", "is", null);
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((visit) => {
        if (visit.country) {
          counts[visit.country] = (counts[visit.country] || 0) + 1;
        }
      });
      
      return Object.entries(counts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  const { data: pageData } = useQuery({
    queryKey: ["analytics-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_visits")
        .select("page_path");
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((visit) => {
        counts[visit.page_path] = (counts[visit.page_path] || 0) + 1;
      });
      
      return Object.entries(counts)
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

  const { data: emailClicks } = useQuery({
    queryKey: ["analytics-email-clicks"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("email_clicks")
        .select("*", { count: "exact", head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    gradient 
  }: { 
    title: string; 
    value: number | string; 
    icon: React.ElementType;
    gradient: string;
  }) => (
    <div className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
      <div className={`absolute inset-0 opacity-5 ${gradient}`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground font-medium">{title}</span>
          <div className="p-2 rounded-xl bg-muted/50">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <p className="text-4xl font-light tracking-tight">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 font-sans">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Visitors" 
          value={totalVisits ?? 0} 
          icon={Users}
          gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
        />
        <StatCard 
          title="Today" 
          value={todayVisits ?? 0} 
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-green-500 to-emerald-500"
        />
        <StatCard 
          title="Countries" 
          value={countryData?.length ?? 0} 
          icon={Globe}
          gradient="bg-gradient-to-br from-purple-500 to-pink-500"
        />
        <StatCard 
          title="Email Clicks" 
          value={emailClicks ?? 0} 
          icon={Mail}
          gradient="bg-gradient-to-br from-orange-500 to-red-500"
        />
      </div>

      {/* Countries & Pages Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Countries */}
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-muted/50">
                <Globe className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">Visitors by Country</h3>
                <p className="text-sm text-muted-foreground">Top 10 locations</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {countryData && countryData.length > 0 ? (
              <div className="space-y-4">
                {countryData.map((item, index) => (
                  <div key={item.country} className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                    <span className="text-sm flex-1 truncate">{item.country}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-foreground/60 rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${(item.count / (countryData[0]?.count || 1)) * 100}%` 
                          }} 
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right font-mono">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">No data yet</p>
            )}
          </div>
        </div>

        {/* Pages */}
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-muted/50">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">Page Views</h3>
                <p className="text-sm text-muted-foreground">Views by page</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {pageData && pageData.length > 0 ? (
              <div className="space-y-4">
                {pageData.map((item) => (
                  <div key={item.page} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <span className="text-sm font-mono text-muted-foreground">{item.page}</span>
                    <span className="text-sm font-medium tabular-nums">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">No data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsAdmin;
