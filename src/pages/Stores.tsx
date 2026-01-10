import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusIndicator } from "@/components/dashboard/StatusIndicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Settings, RefreshCw, ExternalLink, Loader2, Store as StoreIcon } from "lucide-react";
import { useStores, StoreWithCounts } from "@/hooks/useStores";
import { formatDistanceToNow } from "date-fns";

const platformColors: Record<string, string> = {
  Shopify: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Etsy: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Printify: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Gumroad: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Amazon SC": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Amazon KDP": "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const platforms = ["Shopify", "Etsy", "Printify", "Gumroad", "Amazon SC", "Amazon KDP"];

export default function Stores() {
  const { stores, isLoading, createStore, updateStore, deleteStore, syncStore } = useStores();
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreWithCounts | null>(null);
  const [syncingStoreId, setSyncingStoreId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    platform: "",
    external_id: "",
    org_id: "",
  });

  const getStoreStatus = (store: StoreWithCounts): "success" | "warning" | "error" | "pending" => {
    if (!store.is_active) return "pending";
    if (!store.last_synced_at) return "pending";
    
    const lastSync = new Date(store.last_synced_at);
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSync > 24) return "error";
    if (hoursSinceSync > 6) return "warning";
    return "success";
  };

  const getLastSyncedText = (store: StoreWithCounts) => {
    if (!store.last_synced_at) return "Never";
    return formatDistanceToNow(new Date(store.last_synced_at), { addSuffix: true });
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.platform) return;
    
    await createStore({
      name: formData.name,
      platform: formData.platform,
      external_id: formData.external_id || null,
      org_id: formData.org_id || stores[0]?.org_id || "",
    });
    
    setIsCreateOpen(false);
    setFormData({ name: "", platform: "", external_id: "", org_id: "" });
  };

  const handleEdit = async () => {
    if (!selectedStore) return;
    
    await updateStore(selectedStore.id, {
      name: formData.name,
      platform: formData.platform,
      external_id: formData.external_id || null,
    });
    
    setIsEditOpen(false);
    setSelectedStore(null);
  };

  const handleDelete = async () => {
    if (!selectedStore) return;
    
    await deleteStore(selectedStore.id);
    setIsDeleteOpen(false);
    setSelectedStore(null);
  };

  const handleSync = async (storeId: string) => {
    setSyncingStoreId(storeId);
    await syncStore(storeId);
    setSyncingStoreId(null);
  };

  const openEdit = (store: StoreWithCounts) => {
    setSelectedStore(store);
    setFormData({
      name: store.name,
      platform: store.platform,
      external_id: store.external_id || "",
      org_id: store.org_id,
    });
    setIsEditOpen(true);
  };

  const openDelete = (store: StoreWithCounts) => {
    setSelectedStore(store);
    setIsDeleteOpen(true);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Connected Stores</h2>
            <p className="text-muted-foreground">
              Manage your connected e-commerce platforms and sync settings.
            </p>
          </div>
          <Button variant="glow" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Connect Store
          </Button>
        </div>

        {stores.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <StoreIcon className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No stores connected</h3>
              <p className="text-muted-foreground mb-4">
                Connect your first e-commerce platform to get started.
              </p>
              <Button variant="glow" onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Connect Store
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <Card key={store.id} className="bg-card border-border hover:border-primary/30 transition-all group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{store.name}</CardTitle>
                      <Badge 
                        variant="outline" 
                        className={platformColors[store.platform] || "bg-muted text-muted-foreground"}
                      >
                        {store.platform}
                      </Badge>
                    </div>
                    <StatusIndicator 
                      status={getStoreStatus(store)} 
                      pulse={getStoreStatus(store) === "success"} 
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-2xl font-bold font-mono">{store.productCount}</p>
                      <p className="text-xs text-muted-foreground">Products</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-2xl font-bold font-mono">{store.listingCount}</p>
                      <p className="text-xs text-muted-foreground">Listings</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Last synced: {getLastSyncedText(store)}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleSync(store.id)}
                      disabled={syncingStoreId === store.id}
                    >
                      {syncingStoreId === store.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-1" />
                      )}
                      Sync
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openEdit(store)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Configure
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => openDelete(store)}
                  >
                    Disconnect Store
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Store Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Store</DialogTitle>
            <DialogDescription>
              Add a new e-commerce platform to your hub.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input
                id="store-name"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="My Store"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={formData.platform}
                onValueChange={(value) => setFormData((f) => ({ ...f, platform: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="external-id">Store ID (optional)</Label>
              <Input
                id="external-id"
                value={formData.external_id}
                onChange={(e) => setFormData((f) => ({ ...f, external_id: e.target.value }))}
                placeholder="External store identifier"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="glow" onClick={handleCreate}>
              Connect Store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Store Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Store</DialogTitle>
            <DialogDescription>
              Update store settings and connection details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Store Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-platform">Platform</Label>
              <Select
                value={formData.platform}
                onValueChange={(value) => setFormData((f) => ({ ...f, platform: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-external-id">Store ID</Label>
              <Input
                id="edit-external-id"
                value={formData.external_id}
                onChange={(e) => setFormData((f) => ({ ...f, external_id: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="glow" onClick={handleEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect "{selectedStore?.name}"? This will remove
              all listings and sync history associated with this store.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
