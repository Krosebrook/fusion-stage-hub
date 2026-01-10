import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMediaAssets } from "@/hooks/useMediaAssets";
import { Upload, X, GripVertical, Trash2, Edit2, Loader2, Image as ImageIcon } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type MediaAsset = Tables<"media_assets">;

interface ProductMediaManagerProps {
  productId: string;
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductMediaManager({
  productId,
  orgId,
  open,
  onOpenChange,
}: ProductMediaManagerProps) {
  const { assets, isLoading, uploadAsset, updateAsset, deleteAsset, reorderAssets } =
    useMediaAssets(productId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [altText, setAltText] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (const file of Array.from(files)) {
      await uploadAsset(file, orgId);
    }
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newAssets = [...assets];
    const [draggedItem] = newAssets.splice(draggedIndex, 1);
    newAssets.splice(index, 0, draggedItem);
    
    // Update local state immediately for visual feedback
    reorderAssets(newAssets);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const openEditDialog = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setAltText(asset.alt_text || "");
  };

  const saveAltText = async () => {
    if (!editingAsset) return;
    await updateAsset(editingAsset.id, { alt_text: altText });
    setEditingAsset(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Product Media</DialogTitle>
            <DialogDescription>
              Upload images, reorder by dragging, and edit alt text for SEO.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop images
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Media grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No media uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {assets.map((asset, index) => (
                  <div
                    key={asset.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative group rounded-lg overflow-hidden border border-border bg-muted/30 aspect-square ${
                      draggedIndex === index ? "opacity-50" : ""
                    }`}
                  >
                    <img
                      src={asset.url}
                      alt={asset.alt_text || "Product image"}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Drag handle */}
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <div className="bg-background/80 backdrop-blur-sm rounded p-1">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                        onClick={() => openEditDialog(asset)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteAsset(asset.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Position badge */}
                    {index === 0 && (
                      <div className="absolute bottom-2 left-2">
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                          Primary
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alt text edit dialog */}
      <Dialog open={!!editingAsset} onOpenChange={() => setEditingAsset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Alt Text</DialogTitle>
            <DialogDescription>
              Add descriptive alt text for accessibility and SEO.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editingAsset && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={editingAsset.url}
                  alt="Preview"
                  className="w-full h-40 object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="alt-text">Alt Text</Label>
              <Input
                id="alt-text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe this image..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAsset(null)}>
              Cancel
            </Button>
            <Button variant="glow" onClick={saveAltText}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
