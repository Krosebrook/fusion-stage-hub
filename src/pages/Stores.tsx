import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/dashboard/StatusIndicator";
import { Plus, Settings, RefreshCw, ExternalLink } from "lucide-react";

interface Store {
  id: string;
  name: string;
  platform: string;
  status: "success" | "warning" | "error" | "pending";
  lastSynced: string;
  productCount: number;
  listingCount: number;
}

const mockStores: Store[] = [
  { id: "1", name: "Main Store", platform: "Shopify", status: "success", lastSynced: "2 min ago", productCount: 342, listingCount: 285 },
  { id: "2", name: "Vintage Collection", platform: "Etsy", status: "success", lastSynced: "5 min ago", productCount: 156, listingCount: 134 },
  { id: "3", name: "Print on Demand", platform: "Printify", status: "success", lastSynced: "12 min ago", productCount: 89, listingCount: 67 },
  { id: "4", name: "Digital Products", platform: "Gumroad", status: "success", lastSynced: "1 hour ago", productCount: 23, listingCount: 23 },
  { id: "5", name: "Amazon Main", platform: "Amazon SC", status: "warning", lastSynced: "3 hours ago", productCount: 567, listingCount: 412 },
  { id: "6", name: "eBook Publisher", platform: "Amazon KDP", status: "pending", lastSynced: "Never", productCount: 0, listingCount: 0 },
];

const platformColors: Record<string, string> = {
  Shopify: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Etsy: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Printify: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Gumroad: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Amazon SC": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Amazon KDP": "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function Stores() {
  const [stores] = useState<Store[]>(mockStores);

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
          <Button variant="glow">
            <Plus className="w-4 h-4 mr-1" />
            Connect Store
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Card key={store.id} className="bg-card border-border hover:border-primary/30 transition-all group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{store.name}</CardTitle>
                    <Badge variant="outline" className={platformColors[store.platform]}>
                      {store.platform}
                    </Badge>
                  </div>
                  <StatusIndicator status={store.status} pulse={store.status === "success"} />
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
                  <span className="text-muted-foreground">Last synced: {store.lastSynced}</span>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Sync
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Settings className="w-4 h-4 mr-1" />
                    Configure
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
