import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePageVisit = (pagePath: string) => {
  useEffect(() => {
    const trackVisit = async () => {
      try {
        // Get country info from a free API
        let country = null;
        let city = null;
        
        try {
          const geoResponse = await fetch("https://ipapi.co/json/");
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            country = geoData.country_name;
            city = geoData.city;
          }
        } catch {
          // Geo lookup failed, continue without it
        }

        await supabase.from("page_visits").insert({
          page_path: pagePath,
          country,
          city,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
        });
      } catch (error) {
        console.error("Failed to track visit:", error);
      }
    };

    trackVisit();
  }, [pagePath]);
};

export const trackEmailClick = async () => {
  try {
    await supabase.from("email_clicks").insert({});
  } catch (error) {
    console.error("Failed to track email click:", error);
  }
};
