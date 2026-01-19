import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Loader2, Plus, Upload, ChevronUp, ChevronDown, Shuffle, CheckSquare, X, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { compressImageClient } from "@/lib/imageCompression";

interface GalleryProject {
  id: string;
  title: string | null;
  description: string | null;
  main_image_url: string;
  display_order: number;
}

interface ProjectImage {
  id: string;
  project_id: string;
  image_url: string;
  display_order: number;
}

const DesignGalleryAdmin = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [editingProject, setEditingProject] = useState<GalleryProject | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fileSizes, setFileSizes] = useState<Record<string, number>>({});
  const [compressionProgress, setCompressionProgress] = useState<{ current: number; total: number } | null>(null);
  const [compressingProjectId, setCompressingProjectId] = useState<string | null>(null);
  const [compressingImageId, setCompressingImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subImagesInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ["gallery-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_projects")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as GalleryProject[];
    },
  });

  const { data: projectImages } = useQuery({
    queryKey: ["gallery-project-images", editingProject?.id],
    queryFn: async () => {
      if (!editingProject) return [];
      const { data, error } = await supabase
        .from("gallery_project_images")
        .select("*")
        .eq("project_id", editingProject.id)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as ProjectImage[];
    },
    enabled: !!editingProject,
  });

  // Fetch file sizes for all projects
  useEffect(() => {
    if (!projects) return;
    
    const fetchSizes = async () => {
      const sizes: Record<string, number> = {};
      
      await Promise.all(
        projects.map(async (project) => {
          try {
            const response = await fetch(project.main_image_url, { method: "HEAD" });
            const contentLength = response.headers.get("content-length");
            if (contentLength) {
              sizes[project.id] = parseInt(contentLength, 10);
            }
          } catch {
            // Ignore errors
          }
        })
      );
      
      setFileSizes(sizes);
    };
    
    fetchSizes();
  }, [projects]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `projects/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("gallery")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("gallery")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const addProjectMutation = useMutation({
    mutationFn: async (file: File) => {
      const imageUrl = await uploadImage(file);

      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => { img.onload = resolve; });
      const aspectRatio = img.width / img.height;

      const { data, error } = await supabase
        .from("gallery_projects")
        .insert({
          main_image_url: imageUrl,
          aspect_ratio: aspectRatio,
          display_order: (projects?.length || 0) + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-projects"] });
      setUploadCount((prev) => {
        const newCount = prev - 1;
        if (newCount === 0) {
          setIsUploading(false);
          toast({ title: "All images uploaded" });
        }
        return newCount;
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setUploadCount((prev) => {
        const newCount = prev - 1;
        if (newCount === 0) {
          setIsUploading(false);
        }
        return newCount;
      });
    },
    onSettled: () => {
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, title, description }: { id: string; title: string; description: string }) => {
      const { error } = await supabase
        .from("gallery_projects")
        .update({ title: title || null, description: description || null })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-projects"] });
      toast({ title: "Project updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gallery_projects")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-projects"] });
      setEditingProject(null);
      toast({ title: "Project deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      if (!projects) return;
      
      const currentIndex = projects.findIndex((p) => p.id === id);
      if (currentIndex === -1) return;
      
      const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (swapIndex < 0 || swapIndex >= projects.length) return;

      const currentItem = projects[currentIndex];
      const swapItem = projects[swapIndex];

      await supabase
        .from("gallery_projects")
        .update({ display_order: swapItem.display_order })
        .eq("id", currentItem.id);

      await supabase
        .from("gallery_projects")
        .update({ display_order: currentItem.display_order })
        .eq("id", swapItem.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-projects"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("gallery_projects")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-projects"] });
      setSelectedIds(new Set());
      setIsSelectMode(false);
      toast({ title: `${selectedIds.size} project(s) deleted` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const shuffleMutation = useMutation({
    mutationFn: async () => {
      if (!projects || projects.length < 2) return;
      
      const shuffled = [...projects].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < shuffled.length; i++) {
        await supabase
          .from("gallery_projects")
          .update({ display_order: i + 1 })
          .eq("id", shuffled[i].id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-projects"] });
      toast({ title: "Order shuffled" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const compressMutation = useMutation({
    mutationFn: async () => {
      if (!projects) return { compressed: 0, total: 0 };

      // Collect all images that need compression (over 512KB)
      const imagesToCompress: { projectId: string; imageId?: string; type: "main" | "sub"; url: string }[] = [];
      const MAX_SIZE = 512 * 1024;

      // Check main images
      for (const project of projects) {
        try {
          const response = await fetch(project.main_image_url, { method: "HEAD" });
          const contentLength = response.headers.get("content-length");
          if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
            imagesToCompress.push({
              projectId: project.id,
              type: "main",
              url: project.main_image_url,
            });
          }
        } catch {
          // Skip if can't check size
        }
      }

      // Check sub-images for all projects
      const { data: allSubImages } = await supabase
        .from("gallery_project_images")
        .select("*");

      if (allSubImages) {
        for (const subImage of allSubImages) {
          try {
            const response = await fetch(subImage.image_url, { method: "HEAD" });
            const contentLength = response.headers.get("content-length");
            if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
              imagesToCompress.push({
                projectId: subImage.project_id,
                imageId: subImage.id,
                type: "sub",
                url: subImage.image_url,
              });
            }
          } catch {
            // Skip if can't check size
          }
        }
      }

      if (imagesToCompress.length === 0) {
        return { compressed: 0, total: 0 };
      }

      setCompressionProgress({ current: 0, total: imagesToCompress.length });
      let compressed = 0;

      // Process each image using client-side compression
      for (let i = 0; i < imagesToCompress.length; i++) {
        const img = imagesToCompress[i];
        setCompressionProgress({ current: i + 1, total: imagesToCompress.length });
        setCompressingProjectId(img.projectId);

        try {
          // Use client-side compression
          const result = await compressImageClient(img.url);

          if (result.originalSize !== result.newSize) {
            // Upload the compressed blob
            const fileName = `projects/compressed_${crypto.randomUUID()}.jpg`;
            const { error: uploadError } = await supabase.storage
              .from("gallery")
              .upload(fileName, result.blob, {
                contentType: "image/jpeg",
                upsert: true,
              });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from("gallery")
                .getPublicUrl(fileName);

              // Update database with new URL
              if (img.type === "main") {
                await supabase
                  .from("gallery_projects")
                  .update({ main_image_url: publicUrl })
                  .eq("id", img.projectId);
              } else if (img.type === "sub" && img.imageId) {
                await supabase
                  .from("gallery_project_images")
                  .update({ image_url: publicUrl })
                  .eq("id", img.imageId);
              }

              compressed++;
              setFileSizes(prev => ({
                ...prev,
                [img.projectId]: result.newSize
              }));
            }
          }
        } catch {
          // Continue with next image
        }
      }

      setCompressingProjectId(null);
      return { compressed, total: imagesToCompress.length };
    },
    onSuccess: (data) => {
      setCompressionProgress(null);
      setCompressingProjectId(null);
      queryClient.invalidateQueries({ queryKey: ["gallery-projects"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-project-images"] });
      toast({
        title: "Compression complete",
        description: data.total === 0 
          ? "All images are already under 512KB" 
          : `${data.compressed} of ${data.total} images compressed`,
      });
    },
    onError: (error: Error) => {
      setCompressionProgress(null);
      setCompressingProjectId(null);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const compressSingleMutation = useMutation({
    mutationFn: async ({ projectId, imageId, imageType, imageUrl }: { projectId: string; imageId?: string; imageType: "main" | "sub"; imageUrl: string }) => {
      const trackingId = imageType === "main" ? `main-${projectId}` : imageId!;
      setCompressingImageId(trackingId);

      // Use client-side compression instead of edge function
      const result = await compressImageClient(imageUrl);
      
      // If no compression was needed (already under 512KB)
      if (result.originalSize === result.newSize) {
        return { compressed: false, reason: "Already under 512KB", originalSize: result.originalSize };
      }

      // Upload the compressed blob to Supabase storage
      const fileName = `projects/compressed_${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, result.blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from("gallery")
        .getPublicUrl(fileName);

      // Update database with new URL
      if (imageType === "main") {
        const { error } = await supabase
          .from("gallery_projects")
          .update({ main_image_url: publicUrl })
          .eq("id", projectId);
        if (error) throw error;
      } else if (imageType === "sub" && imageId) {
        const { error } = await supabase
          .from("gallery_project_images")
          .update({ image_url: publicUrl })
          .eq("id", imageId);
        if (error) throw error;
      }

      return {
        compressed: true,
        originalSize: result.originalSize,
        newSize: result.newSize,
      };
    },
    onSuccess: (data) => {
      setCompressingImageId(null);
      queryClient.invalidateQueries({ queryKey: ["gallery-projects"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-project-images"] });
      
      if (data?.compressed) {
        toast({
          title: "Image compressed",
          description: `Reduced from ${formatFileSize(data.originalSize)} to ${formatFileSize(data.newSize)}`,
        });
      } else {
        toast({
          title: "No compression needed",
          description: data?.reason || "Image is already under 512KB",
        });
      }
    },
    onError: (error: Error) => {
      setCompressingImageId(null);
      toast({ title: "Compression failed", description: error.message, variant: "destructive" });
    },
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (!projects) return;
    if (selectedIds.size === projects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projects.map((p) => p.id)));
    }
  };

  const addSubImageMutation = useMutation({
    mutationFn: async ({ projectId, file }: { projectId: string; file: File }) => {
      const imageUrl = await uploadImage(file);

      const { data, error } = await supabase
        .from("gallery_project_images")
        .insert({
          project_id: projectId,
          image_url: imageUrl,
          display_order: (projectImages?.length || 0) + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-project-images"] });
      toast({ title: "Image added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSubImageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gallery_project_images")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-project-images"] });
      toast({ title: "Image deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (fileArray.length === 0) return;
    
    setIsUploading(true);
    setUploadCount(fileArray.length);
    
    fileArray.forEach((file) => {
      addProjectMutation.mutate(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  };

  const handleSubImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && editingProject) {
      Array.from(files).forEach((file) => {
        addSubImageMutation.mutate({ projectId: editingProject.id, file });
      });
    }
    if (subImagesInputRef.current) subImagesInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Image Count */}
      <div className="text-sm text-muted-foreground">
        {projects?.length || 0} image{(projects?.length || 0) !== 1 ? "s" : ""} uploaded
        {Object.keys(fileSizes).length > 0 && (
          <span className="ml-2">
            • {formatFileSize(Object.values(fileSizes).reduce((sum, size) => sum + size, 0))} total
          </span>
        )}
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed transition-all duration-300 ${
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.01]" 
            : "border-border/50 bg-card hover:border-primary/50"
        }`}
      >
        <div className="p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Uploading {uploadCount} image{uploadCount !== 1 ? "s" : ""}...
              </p>
            </div>
          ) : (
            <div 
              className="flex flex-col items-center gap-3 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                isDragging ? "bg-primary/10" : "bg-muted"
              }`}>
                <Upload className={`w-6 h-6 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isDragging ? "Drop images here" : "Drag & drop images here"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse • Each image becomes a project
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={isSelectMode ? "secondary" : "outline"}
          size="sm"
          className="h-9 rounded-xl gap-2"
          onClick={() => {
            setIsSelectMode(!isSelectMode);
            setSelectedIds(new Set());
          }}
        >
          {isSelectMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
          {isSelectMode ? "Cancel" : "Select"}
        </Button>
        
        {isSelectMode && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              onClick={toggleSelectAll}
            >
              {selectedIds.size === projects?.length ? "Deselect All" : "Select All"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-9 rounded-xl gap-2"
              disabled={selectedIds.size === 0 || bulkDeleteMutation.isPending}
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.size})
            </Button>
          </>
        )}
        
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-xl gap-2"
          onClick={() => shuffleMutation.mutate()}
          disabled={shuffleMutation.isPending || !projects || projects.length < 2}
        >
          <Shuffle className="w-4 h-4" />
          Shuffle
        </Button>
        
        {compressionProgress ? (
          <div className="flex items-center gap-3 h-9 px-4 rounded-xl bg-muted border border-border/50">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-background rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${(compressionProgress.current / compressionProgress.total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {compressionProgress.current}/{compressionProgress.total} ({Math.round((compressionProgress.current / compressionProgress.total) * 100)}%)
              </span>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl gap-2"
            onClick={() => compressMutation.mutate()}
            disabled={compressMutation.isPending || !projects || projects.length === 0}
          >
            <Minimize2 className="w-4 h-4" />
            Compress All
          </Button>
        )}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {projects?.map((project, index) => (
          <Dialog key={project.id}>
            <div className="relative group">
              {/* Select checkbox */}
              {isSelectMode && (
                <div 
                  className="absolute top-2 left-2 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(project.id);
                  }}
                >
                  <Checkbox
                    checked={selectedIds.has(project.id)}
                    className="w-6 h-6 rounded-lg border-2 bg-background/80 backdrop-blur-sm data-[state=checked]:bg-primary"
                  />
                </div>
              )}
              {/* Reorder buttons */}
              {!isSelectMode && (
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="w-7 h-7 rounded-lg bg-background/80 backdrop-blur-sm hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      reorderMutation.mutate({ id: project.id, direction: "up" });
                    }}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="w-7 h-7 rounded-lg bg-background/80 backdrop-blur-sm hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      reorderMutation.mutate({ id: project.id, direction: "down" });
                    }}
                    disabled={index === (projects?.length || 0) - 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {isSelectMode ? (
                <div 
                  className={`cursor-pointer rounded-2xl overflow-hidden bg-card border-2 transition-all duration-300 ${
                    selectedIds.has(project.id) ? "border-primary" : "border-border/50"
                  }`}
                  onClick={() => toggleSelect(project.id)}
                >
                  <div className="aspect-square overflow-hidden relative">
                    <img
                      src={project.main_image_url}
                      alt={project.title || "Project"}
                      className="w-full h-full object-cover"
                    />
                    {/* Compression progress overlay for select mode */}
                    {compressingProjectId === project.id && compressionProgress && (
                      <div className="absolute inset-0 bg-black/40 flex items-end">
                        <div className="w-full p-2">
                          <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-500 transition-all duration-300 rounded-full animate-pulse"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <p className="text-white text-xs text-center mt-1 font-medium">Compressing...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <p className="text-sm truncate font-medium flex-1">
                      {project.title || "Untitled"}
                    </p>
                    {fileSizes[project.id] && (
                      <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                        {formatFileSize(fileSizes[project.id])}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <DialogTrigger asChild>
                  <div 
                    className="cursor-pointer rounded-2xl overflow-hidden bg-card border border-border/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                    onClick={() => {
                      setEditingProject(project);
                      setEditTitle(project.title || "");
                      setEditDescription(project.description || "");
                    }}
                  >
                    <div className="aspect-square overflow-hidden relative">
                      <img
                        src={project.main_image_url}
                        alt={project.title || "Project"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Compression progress overlay */}
                      {compressingProjectId === project.id && compressionProgress && (
                        <div className="absolute inset-0 bg-black/40 flex items-end">
                          <div className="w-full p-2">
                            <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-red-500 transition-all duration-300 rounded-full animate-pulse"
                                style={{ width: '100%' }}
                              />
                            </div>
                            <p className="text-white text-xs text-center mt-1 font-medium">Compressing...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <p className="text-sm truncate font-medium flex-1">
                        {project.title || "Untitled"}
                      </p>
                      {fileSizes[project.id] && (
                        <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                          {formatFileSize(fileSizes[project.id])}
                        </span>
                      )}
                    </div>
                  </div>
                </DialogTrigger>
              )}
            </div>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto font-sans rounded-2xl border-border/50">
              <DialogHeader>
                <DialogTitle className="text-lg font-medium">Edit Project</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Main Image Preview */}
                <div className="space-y-2">
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border/50 relative">
                    <img
                      src={project.main_image_url}
                      alt={project.title || "Project"}
                      className="w-full h-full object-contain"
                    />
                    {compressingImageId === `main-${project.id}` && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-white">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm font-medium">Compressing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {fileSizes[project.id] ? formatFileSize(fileSizes[project.id]) : "Loading size..."}
                      {fileSizes[project.id] && fileSizes[project.id] > 512 * 1024 && (
                        <span className="text-red-500 ml-1">(over 512KB)</span>
                      )}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg gap-1.5"
                      disabled={compressingImageId === `main-${project.id}` || compressSingleMutation.isPending}
                      onClick={() => compressSingleMutation.mutate({ projectId: project.id, imageType: "main", imageUrl: project.main_image_url })}
                    >
                      <Minimize2 className="w-3 h-3" />
                      Compress
                    </Button>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">Title (optional)</Label>
                    <Input
                      id="title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Project title"
                      className="h-11 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Project description"
                      rows={3}
                      className="rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors resize-none"
                    />
                  </div>
                  <Button
                    onClick={() => updateProjectMutation.mutate({
                      id: project.id,
                      title: editTitle,
                      description: editDescription,
                    })}
                    className="h-10 rounded-xl"
                  >
                    Save Changes
                  </Button>
                </div>

                {/* Sub Images */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-sm font-medium">Additional Images</Label>
                    <div>
                      <input
                        ref={subImagesInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleSubImagesSelect}
                        className="hidden"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg"
                        onClick={() => subImagesInputRef.current?.click()}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Images
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {projectImages?.map((img) => (
                      <div key={img.id} className="relative group/img">
                        <div className="aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-border/50 relative">
                          <img
                            src={img.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {compressingImageId === img.id && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 animate-spin text-white" />
                            </div>
                          )}
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="w-7 h-7 rounded-lg bg-background/80 backdrop-blur-sm hover:bg-background"
                            disabled={compressingImageId === img.id || compressSingleMutation.isPending}
                            onClick={() => compressSingleMutation.mutate({ projectId: project.id, imageId: img.id, imageType: "sub", imageUrl: img.image_url })}
                          >
                            <Minimize2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="w-7 h-7 rounded-lg"
                            onClick={() => deleteSubImageMutation.mutate(img.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delete */}
                <div className="border-t border-border/50 pt-6">
                  <Button
                    variant="destructive"
                    onClick={() => deleteProjectMutation.mutate(project.id)}
                    className="h-10 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Project
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
};

export default DesignGalleryAdmin;
