import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface YouTubeRequest {
  url: string;
}

interface YouTubeResponse {
  videoId: string;
  title: string;
  thumbnailUrl: string;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url }: YouTubeRequest = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const videoId = extractVideoId(url);
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Invalid YouTube URL" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch video page to get title from meta tags (no API key needed)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedResponse = await fetch(oembedUrl);
    
    if (!oembedResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Could not fetch video information" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const oembedData = await oembedResponse.json();
    
    // Get high quality thumbnail
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    const response: YouTubeResponse = {
      videoId,
      title: oembedData.title,
      thumbnailUrl,
    };

    console.log("YouTube info fetched:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error fetching YouTube info:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
