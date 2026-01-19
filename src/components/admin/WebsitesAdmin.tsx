import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, ArrowUp, ArrowDown, Upload, RefreshCw, Shuffle, CheckSquare, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WebsitesAdmin = () => {
  const [newUrl, setNewUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isCapturing, setIsCapturing] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: websites, isLoading } = useQuery({
    queryKey: ['websites-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('websites')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const addWebsite = useMutation({
    mutationFn: async (url: string) => {
      // Format URL
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      // Extract domain for title
      const urlObj = new URL(formattedUrl);
      const title = urlObj.hostname;

      // Get max display order
      const maxOrder = websites?.reduce((max, w) => Math.max(max, w.display_order || 0), 0) || 0;

      // Generate screenshot using a free screenshot API
      let thumbnailUrl = null;
      try {
        thumbnailUrl = `https://api.microlink.io/?url=${encodeURIComponent(formattedUrl)}&screenshot=true&meta=false&embed=screenshot.url`;
      } catch (e) {
        console.error('Failed to generate screenshot:', e);
      }

      const { error } = await supabase
        .from('websites')
        .insert({
          url: formattedUrl,
          title: title,
          thumbnail_url: thumbnailUrl,
          display_order: maxOrder + 1
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites-admin'] });
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      setNewUrl("");
      setIsAdding(false);
      toast({ title: "Website added successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to add website", description: error.message, variant: "destructive" });
    }
  });

  const deleteWebsite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites-admin'] });
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      toast({ title: "Website deleted" });
    }
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase
        .from('websites')
        .update({ display_order: newOrder })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites-admin'] });
      queryClient.invalidateQueries({ queryKey: ['websites'] });
    }
  });

  const uploadThumbnail = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `website-${id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('websites')
        .update({ custom_thumbnail_url: publicUrl })
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites-admin'] });
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      toast({ title: "Thumbnail uploaded successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to upload thumbnail", description: error.message, variant: "destructive" });
    }
  });

  const regenerateScreenshot = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      const thumbnailUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url&timestamp=${Date.now()}`;
      
      const { error } = await supabase
        .from('websites')
        .update({ thumbnail_url: thumbnailUrl, custom_thumbnail_url: null })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites-admin'] });
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      setIsCapturing(null);
      toast({ title: "Screenshot regenerated" });
    }
  });

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!websites) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= websites.length) return;

    const currentItem = websites[index];
    const swapItem = websites[newIndex];

    updateOrder.mutate({ id: currentItem.id, newOrder: swapItem.display_order || 0 });
    updateOrder.mutate({ id: swapItem.id, newOrder: currentItem.display_order || 0 });
  };

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadThumbnail.mutate({ id, file });
    }
  };

  const handleAddWebsite = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUrl.trim()) {
      addWebsite.mutate(newUrl);
    }
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("websites")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websites-admin"] });
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      setSelectedIds(new Set());
      setIsSelectMode(false);
      toast({ title: `${selectedIds.size} website(s) deleted` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const shuffleMutation = useMutation({
    mutationFn: async () => {
      if (!websites || websites.length < 2) return;
      
      const shuffled = [...websites].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < shuffled.length; i++) {
        await supabase
          .from("websites")
          .update({ display_order: i + 1 })
          .eq("id", shuffled[i].id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websites-admin"] });
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      toast({ title: "Order shuffled" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    if (!websites) return;
    if (selectedIds.size === websites.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(websites.map((w) => w.id)));
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Website Count */}
      <div className="text-sm text-muted-foreground">
        {websites?.length || 0} website{(websites?.length || 0) !== 1 ? "s" : ""} added
      </div>

      {/* Add New Website */}
      {isAdding ? (
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <h3 className="font-medium">Add New Website</h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleAddWebsite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-sm font-medium">Website URL</Label>
                <Input
                  id="url"
                  type="text"
                  placeholder="www.example.com"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="h-11 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  disabled={addWebsite.isPending} 
                  className="h-10 rounded-xl px-5"
                >
                  {addWebsite.isPending ? "Adding..." : "Add Website"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="h-10 rounded-xl"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <Button 
          onClick={() => setIsAdding(true)} 
          className="gap-2 h-10 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Add Website
        </Button>
      )}

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
              {selectedIds.size === websites?.length ? "Deselect All" : "Select All"}
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
          disabled={shuffleMutation.isPending || !websites || websites.length < 2}
        >
          <Shuffle className="w-4 h-4" />
          Shuffle
        </Button>
      </div>

      {/* Website List */}
      {isLoading ? (
        <div className="text-muted-foreground text-center py-12">Loading...</div>
      ) : websites && websites.length > 0 ? (
        <div className="space-y-3">
          {websites.map((website, index) => (
            <div 
              key={website.id} 
              className={`group rounded-2xl bg-card border-2 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 ${
                isSelectMode && selectedIds.has(website.id) ? "border-primary" : "border-border/50"
              }`}
              onClick={isSelectMode ? () => toggleSelect(website.id) : undefined}
            >
              <div className="p-5">
                <div className="flex gap-4">
                  {/* Checkbox */}
                  {isSelectMode && (
                    <div className="flex items-center">
                      <Checkbox
                        checked={selectedIds.has(website.id)}
                        className="w-5 h-5 rounded-md"
                      />
                    </div>
                  )}
                  
                  {/* Thumbnail */}
                  <div className="w-40 aspect-video bg-muted rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-border/50">
                    <img
                      src={website.custom_thumbnail_url || website.thumbnail_url || '/placeholder.svg'}
                      alt={website.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 py-1">
                    <p className="font-medium text-sm truncate">{website.title}</p>
                    <a 
                      href={website.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground truncate block mt-1 transition-colors"
                      onClick={(e) => isSelectMode && e.preventDefault()}
                    >
                      {website.url}
                    </a>

                    {/* Actions */}
                    {!isSelectMode && (
                      <div className="flex gap-2 mt-3 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[website.id] = el; }}
                          onChange={(e) => handleFileChange(website.id, e)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs h-8 rounded-lg"
                          onClick={() => fileInputRefs.current[website.id]?.click()}
                        >
                          <Upload className="w-3 h-3" />
                          Upload
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs h-8 rounded-lg"
                          disabled={isCapturing === website.id}
                          onClick={() => {
                            setIsCapturing(website.id);
                            regenerateScreenshot.mutate({ id: website.id, url: website.url });
                          }}
                        >
                          <RefreshCw className={`w-3 h-3 ${isCapturing === website.id ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Order & Delete Controls */}
                  {!isSelectMode && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-muted"
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-muted"
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === websites.length - 1}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteWebsite.mutate(website.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground rounded-2xl border border-dashed border-border/50">
          No websites yet. Add your first website above.
        </div>
      )}
    </div>
  );
};

export default WebsitesAdmin;
