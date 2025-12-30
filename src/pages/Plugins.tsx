import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CapabilityBadge } from "@/components/plugins/CapabilityBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, CheckCircle2 } from "lucide-react";

type CapabilityLevel = "native" | "workaround" | "unsupported";

interface Plugin {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  isInstalled: boolean;
  capabilities: Record<string, { level: CapabilityLevel; description?: string }>;
  constraints?: Record<string, string>;
}

const plugins: Plugin[] = [
  {
    id: "1",
    slug: "shopify",
    name: "Shopify",
    description: "Full integration with Shopify stores via GraphQL Admin API",
    version: "2.1.0",
    isInstalled: true,
    capabilities: {
      list_products: { level: "native" },
      create_product: { level: "native" },
      update_product: { level: "native" },
      delete_product: { level: "native" },
      sync_inventory: { level: "native" },
      process_orders: { level: "native" },
      bulk_operations: { level: "native", description: "Uses GraphQL bulk operations for large datasets" },
    },
    constraints: { "Query Cost": "1000 points/request", "Rate Limit": "Cost-based throttling" },
  },
  {
    id: "2",
    slug: "etsy",
    name: "Etsy",
    description: "Connect to Etsy marketplace with listing and order management",
    version: "1.8.0",
    isInstalled: true,
    capabilities: {
      list_products: { level: "native" },
      create_product: { level: "native" },
      update_product: { level: "native" },
      delete_product: { level: "workaround", description: "Requires deactivation then delete" },
      sync_inventory: { level: "native" },
      process_orders: { level: "native" },
      bulk_operations: { level: "unsupported", description: "No bulk API available" },
    },
    constraints: { "Rate Limit": "10 QPS / 10,000 QPD", "Daily Burn": "Tracked per-store" },
  },
  {
    id: "3",
    slug: "printify",
    name: "Printify",
    description: "Print-on-demand integration with catalog sync and order fulfillment",
    version: "1.5.0",
    isInstalled: true,
    capabilities: {
      list_products: { level: "native" },
      create_product: { level: "native" },
      update_product: { level: "native" },
      delete_product: { level: "native" },
      sync_inventory: { level: "workaround", description: "Polling-based, not real-time" },
      process_orders: { level: "native" },
      bulk_operations: { level: "workaround", description: "Batch shaping with 100 items max" },
    },
    constraints: { "Global RPM": "600", "Catalog RPM": "100", "Batch Size": "100 items" },
  },
  {
    id: "4",
    slug: "gumroad",
    name: "Gumroad",
    description: "Digital product sales with webhook-driven synchronization",
    version: "1.2.0",
    isInstalled: true,
    capabilities: {
      list_products: { level: "native" },
      create_product: { level: "unsupported", description: "Manual creation in Gumroad required" },
      update_product: { level: "unsupported" },
      delete_product: { level: "unsupported" },
      sync_inventory: { level: "unsupported", description: "Digital products only" },
      process_orders: { level: "workaround", description: "Webhook-driven sync only" },
      bulk_operations: { level: "unsupported" },
    },
  },
  {
    id: "5",
    slug: "amazon-sc",
    name: "Amazon Seller Central",
    description: "SP-API integration for Amazon marketplace with async feed processing",
    version: "2.0.0",
    isInstalled: true,
    capabilities: {
      list_products: { level: "native" },
      create_product: { level: "workaround", description: "Async feed submission with reconciliation" },
      update_product: { level: "workaround", description: "Feed-based updates, eventual consistency" },
      delete_product: { level: "workaround", description: "Requires feed processing" },
      sync_inventory: { level: "native" },
      process_orders: { level: "native" },
      bulk_operations: { level: "native", description: "Native feed-based bulk operations" },
    },
    constraints: { "Processing": "Async feeds", "Reconciliation": "Required for all mutations" },
  },
  {
    id: "6",
    slug: "amazon-kdp",
    name: "Amazon KDP",
    description: "Kindle Direct Publishing for eBooks and paperbacks",
    version: "1.0.0",
    isInstalled: false,
    capabilities: {
      list_products: { level: "workaround", description: "Manual export/import required" },
      create_product: { level: "unsupported", description: "Manual creation in KDP required" },
      update_product: { level: "unsupported" },
      delete_product: { level: "unsupported" },
      sync_inventory: { level: "unsupported", description: "Print-on-demand, no inventory" },
      process_orders: { level: "workaround", description: "Reconciliation with reports" },
      bulk_operations: { level: "unsupported" },
    },
  },
];

export default function Plugins() {
  const [activePlugin, setActivePlugin] = useState<Plugin | null>(plugins[0]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Plugin Registry</h2>
          <p className="text-muted-foreground">
            View platform capabilities and configure integrations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Plugin List */}
          <div className="space-y-2">
            {plugins.map((plugin) => (
              <button
                key={plugin.id}
                onClick={() => setActivePlugin(plugin)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  activePlugin?.id === plugin.id
                    ? "bg-primary/10 border-primary/30"
                    : "bg-card border-border hover:border-primary/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{plugin.name}</p>
                    <p className="text-xs text-muted-foreground">v{plugin.version}</p>
                  </div>
                  {plugin.isInstalled ? (
                    <Badge variant="success" className="text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Not Installed</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Plugin Details */}
          {activePlugin && (
            <Card className="lg:col-span-3 bg-card border-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{activePlugin.name}</CardTitle>
                    <CardDescription>{activePlugin.description}</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-1" />
                    Configure
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="capabilities">
                  <TabsList className="bg-muted">
                    <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                    <TabsTrigger value="constraints">Constraints</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  <TabsContent value="capabilities" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(activePlugin.capabilities).map(([cap, config]) => (
                        <div
                          key={cap}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <span className="text-sm capitalize">{cap.replace(/_/g, " ")}</span>
                          <CapabilityBadge
                            level={config.level}
                            capability={config.level}
                            description={config.description}
                          />
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="constraints" className="mt-4">
                    {activePlugin.constraints ? (
                      <div className="space-y-2">
                        {Object.entries(activePlugin.constraints).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                          >
                            <span className="text-sm font-medium">{key}</span>
                            <span className="text-sm text-muted-foreground font-mono">{value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No specific constraints defined for this plugin.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="settings" className="mt-4">
                    <p className="text-muted-foreground text-center py-8">
                      Plugin settings coming soon.
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
