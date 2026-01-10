import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CapabilityBadge } from "@/components/plugins/CapabilityBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, CheckCircle2, Loader2, Plug } from "lucide-react";
import { usePlugins, PluginWithContracts } from "@/hooks/usePlugins";

export default function Plugins() {
  const { plugins, isLoading, togglePluginInstance } = usePlugins();
  const [activePlugin, setActivePlugin] = useState<PluginWithContracts | null>(null);

  // Set first plugin as active when loaded
  if (!activePlugin && plugins.length > 0) {
    setActivePlugin(plugins[0]);
  }

  const getCapabilitiesByPlugin = (plugin: PluginWithContracts) => {
    return plugin.contracts.reduce((acc, contract) => {
      acc[contract.capability] = {
        level: contract.level,
        description: contract.workaround_description || undefined,
        automationEnabled: contract.automation_enabled,
      };
      return acc;
    }, {} as Record<string, { level: string; description?: string; automationEnabled?: boolean | null }>);
  };

  const getConstraintsByPlugin = (plugin: PluginWithContracts) => {
    const constraints: Record<string, string> = {};
    plugin.contracts.forEach((contract) => {
      if (contract.constraints && typeof contract.constraints === "object") {
        Object.entries(contract.constraints as Record<string, string>).forEach(([key, value]) => {
          constraints[key] = String(value);
        });
      }
    });
    return constraints;
  };

  const hasActiveInstances = (plugin: PluginWithContracts) => {
    return plugin.instances.some((i) => i.is_enabled);
  };

  const getInstanceCount = (plugin: PluginWithContracts) => {
    return plugin.instances.length;
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
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Plugin Registry</h2>
          <p className="text-muted-foreground">
            View platform capabilities and configure integrations.
          </p>
        </div>

        {plugins.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Plug className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No plugins available</h3>
              <p className="text-muted-foreground">
                Plugins will appear here once they are configured in the system.
              </p>
            </CardContent>
          </Card>
        ) : (
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
                    {plugin.is_active && hasActiveInstances(plugin) ? (
                      <Badge variant="success" className="text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : plugin.is_active ? (
                      <Badge variant="secondary" className="text-xs">Available</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  {getInstanceCount(plugin) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getInstanceCount(plugin)} store{getInstanceCount(plugin) !== 1 ? "s" : ""} connected
                    </p>
                  )}
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
                      <CardDescription>{activePlugin.description || "No description available"}</CardDescription>
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
                      <TabsTrigger value="instances">
                        Instances ({activePlugin.instances.length})
                      </TabsTrigger>
                      <TabsTrigger value="constraints">Constraints</TabsTrigger>
                    </TabsList>

                    <TabsContent value="capabilities" className="mt-4">
                      {activePlugin.contracts.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No capabilities defined for this plugin.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(getCapabilitiesByPlugin(activePlugin)).map(([cap, config]) => (
                            <div
                              key={cap}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                            >
                              <div className="flex-1">
                                <span className="text-sm capitalize">{cap.replace(/_/g, " ")}</span>
                                {config.automationEnabled && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Auto
                                  </Badge>
                                )}
                              </div>
                              <CapabilityBadge
                                level={config.level as "native" | "workaround" | "unsupported"}
                                capability={config.level}
                                description={config.description}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="instances" className="mt-4">
                      {activePlugin.instances.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No stores are using this plugin yet.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {activePlugin.instances.map((instance) => (
                            <div
                              key={instance.id}
                              className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                            >
                              <div>
                                <p className="font-medium text-sm">Store Instance</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {instance.store_id.slice(0, 8)}...
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">
                                  {instance.is_enabled ? "Enabled" : "Disabled"}
                                </span>
                                <Switch
                                  checked={instance.is_enabled || false}
                                  onCheckedChange={(checked) =>
                                    togglePluginInstance(instance.id, checked)
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="constraints" className="mt-4">
                      {Object.keys(getConstraintsByPlugin(activePlugin)).length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No specific constraints defined for this plugin.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(getConstraintsByPlugin(activePlugin)).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                            >
                              <span className="text-sm font-medium">{key}</span>
                              <span className="text-sm text-muted-foreground font-mono">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
