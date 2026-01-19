import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_SIZE_BYTES = 512 * 1024; // 512KB
const MIN_SIZE_BYTES = 450 * 1024; // 450KB - reasonable minimum
const TARGET_SIZE_BYTES = 500 * 1024; // Target 500KB

type CompressResult = 
  | { status: "compressed"; originalSize: number; newSize: number; newUrl: string }
  | { status: "skipped"; reason: string; originalSize: number }
  | { status: "error"; error: string };

async function compressImageWithAI(
  imageUrl: string,
  originalSize: number,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<CompressResult> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    return { status: "error", error: "LOVABLE_API_KEY not configured" };
  }

  // Calculate target dimensions - aim for ~500KB
  const reductionRatio = Math.sqrt(TARGET_SIZE_BYTES / originalSize);
  const targetPercent = Math.round(reductionRatio * 100);

  console.log(`Using AI to resize to ~${targetPercent}% (target: ~500KB from ${originalSize} bytes)`);

  try {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Resize this image to approximately ${targetPercent}% of its current dimensions while maintaining the exact same aspect ratio and visual quality. Output only the resized image.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`AI compression failed: ${errorText}`);
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.type === "payment_required") {
          return { status: "error", error: "Not enough AI credits. Please add credits to continue." };
        }
        if (errorJson.type === "rate_limit_exceeded" || aiResponse.status === 429) {
          return { status: "error", error: "Rate limit exceeded. Please try again later." };
        }
        return { status: "error", error: errorJson.message || "AI compression failed" };
      } catch {
        return { status: "error", error: `AI error: ${aiResponse.status}` };
      }
    }

    const aiData = await aiResponse.json();
    const generatedImage = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("No image returned from AI");
      return { status: "error", error: "No image returned from AI" };
    }

    // Extract base64 data from data URL
    const base64Match = generatedImage.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      console.error("Invalid image format returned");
      return { status: "error", error: "Invalid image format returned" };
    }

    const [, format, base64Data] = base64Match;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const newSize = bytes.byteLength;
    console.log(`AI compressed to ${newSize} bytes`);

    // Upload compressed image to storage
    const fileName = `projects/compressed_${crypto.randomUUID()}.${format === "png" ? "png" : "jpg"}`;
    
    const { error: uploadError } = await supabase.storage
      .from("gallery")
      .upload(fileName, bytes, {
        contentType: `image/${format}`,
        upsert: true,
      });

    if (uploadError) {
      console.error(`Upload failed: ${uploadError.message}`);
      return { status: "error", error: `Upload failed: ${uploadError.message}` };
    }

    const { data: { publicUrl } } = supabase.storage
      .from("gallery")
      .getPublicUrl(fileName);

    return {
      status: "compressed",
      originalSize,
      newSize,
      newUrl: publicUrl,
    };
  } catch (err) {
    console.error(`Error in AI compression: ${err}`);
    return { status: "error", error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function compressImage(
  imageUrl: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<CompressResult> {
  try {
    // First, check size with HEAD request to avoid downloading large files unnecessarily
    const headResponse = await fetch(imageUrl, { method: "HEAD" });
    const contentLength = headResponse.headers.get("content-length");
    
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size <= MAX_SIZE_BYTES) {
        console.log(`Image already under 512KB: ${size} bytes`);
        return { status: "skipped", reason: "Already under 512KB", originalSize: size };
      }
      
      // For large images, use AI-based compression (passes URL directly, no memory issues)
      console.log(`Image is ${size} bytes, using AI compression...`);
      return await compressImageWithAI(imageUrl, size, supabaseUrl, supabaseServiceKey);
    }

    // If no content-length header, fetch the image to check size
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${imageUrl}`);
      return { status: "error", error: "Failed to fetch image" };
    }

    const originalBuffer = await response.arrayBuffer();
    const originalSize = originalBuffer.byteLength;

    if (originalSize <= MAX_SIZE_BYTES) {
      console.log(`Image already under 512KB: ${originalSize} bytes`);
      return { status: "skipped", reason: "Already under 512KB", originalSize };
    }

    // Use AI compression for images over 512KB
    console.log(`Image is ${originalSize} bytes, using AI compression...`);
    return await compressImageWithAI(imageUrl, originalSize, supabaseUrl, supabaseServiceKey);
  } catch (err) {
    console.error(`Error compressing image: ${err}`);
    return { status: "error", error: err instanceof Error ? err.message : "Unknown error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { mode, projectId, imageId, imageType } = body;

    // Mode: "list" - return list of images that need compression
    if (mode === "list") {
      const { data: projects } = await supabase
        .from("gallery_projects")
        .select("id, main_image_url, display_order")
        .order("display_order", { ascending: true });

      const { data: projectImages } = await supabase
        .from("gallery_project_images")
        .select("id, image_url, project_id, display_order")
        .order("display_order", { ascending: true });

      const imagesToCompress: { id: string; projectId: string; type: "main" | "sub"; url: string; displayOrder: number }[] = [];

      // Check main images in parallel for speed
      const mainImageChecks = await Promise.allSettled(
        (projects || []).map(async (project) => {
          try {
            const response = await fetch(project.main_image_url, { method: "HEAD" });
            const contentLength = response.headers.get("content-length");
            if (contentLength && parseInt(contentLength, 10) > MAX_SIZE_BYTES) {
              return { 
                id: project.id, 
                projectId: project.id, 
                type: "main" as const, 
                url: project.main_image_url,
                displayOrder: project.display_order ?? 0
              };
            }
          } catch {
            // Skip if can't check
          }
          return null;
        })
      );

      // Check sub images in parallel
      const subImageChecks = await Promise.allSettled(
        (projectImages || []).map(async (image) => {
          try {
            const response = await fetch(image.image_url, { method: "HEAD" });
            const contentLength = response.headers.get("content-length");
            if (contentLength && parseInt(contentLength, 10) > MAX_SIZE_BYTES) {
              return { 
                id: image.id, 
                projectId: image.project_id, 
                type: "sub" as const, 
                url: image.image_url,
                displayOrder: image.display_order ?? 0
              };
            }
          } catch {
            // Skip if can't check
          }
          return null;
        })
      );

      // Collect successful results
      for (const result of mainImageChecks) {
        if (result.status === "fulfilled" && result.value) {
          imagesToCompress.push(result.value);
        }
      }
      for (const result of subImageChecks) {
        if (result.status === "fulfilled" && result.value) {
          imagesToCompress.push(result.value);
        }
      }

      // Sort by displayOrder to ensure compression starts from first visible image
      imagesToCompress.sort((a, b) => a.displayOrder - b.displayOrder);

      return new Response(JSON.stringify({ images: imagesToCompress }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode: "compress" - compress a single image
    if (mode === "compress" && projectId && imageType) {
      let imageUrl: string | null = null;

      if (imageType === "main") {
        const { data } = await supabase
          .from("gallery_projects")
          .select("main_image_url")
          .eq("id", projectId)
          .single();
        imageUrl = data?.main_image_url || null;
      } else if (imageType === "sub" && imageId) {
        const { data } = await supabase
          .from("gallery_project_images")
          .select("image_url")
          .eq("id", imageId)
          .single();
        imageUrl = data?.image_url || null;
      }

      if (!imageUrl) {
        return new Response(JSON.stringify({ error: "Image not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await compressImage(imageUrl, supabaseUrl, supabaseServiceKey);

      if (result.status === "compressed") {
        // Update database with new URL
        if (imageType === "main") {
          await supabase
            .from("gallery_projects")
            .update({ main_image_url: result.newUrl })
            .eq("id", projectId);
        } else if (imageType === "sub" && imageId) {
          await supabase
            .from("gallery_project_images")
            .update({ image_url: result.newUrl })
            .eq("id", imageId);
        }

        return new Response(JSON.stringify({
          success: true,
          compressed: true,
          originalSize: result.originalSize,
          newSize: result.newSize,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (result.status === "skipped") {
        return new Response(JSON.stringify({
          success: true,
          compressed: false,
          reason: result.reason,
          originalSize: result.originalSize,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Error case
        return new Response(JSON.stringify({
          success: false,
          error: result.error,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
