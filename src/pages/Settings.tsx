import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Save,
  Shield,
  Bell,
  Database,
  Zap,
  Store,
  Puzzle,
  Loader2,
  Building,
  Settings2,
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface JsonSchemaField {
  type: "string" | "number" | "boolean" | "object" | "array";
  title?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

interface JsonSchema {
  type: "object";
  properties: Record<string, JsonSchemaField>;
  required?: string[];
}

// Dynamic form renderer based on JSON schema
function DynamicForm({
  schema,
  value,
  onChange,
  disabled,
}: {
  schema: JsonSchema | null;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  disabled?: boolean;
}) {
  if (!schema || !schema.properties) {
    return (
      <p className="text-sm text-muted-foreground">
        No configuration schema defined.
      </p>
    );
  }

  const handleFieldChange = (key: string, fieldValue: unknown) => {
    onChange({ ...value, [key]: fieldValue });
  };

  return (
    <div className="space-y-4">
      {Object.entries(schema.properties).map(([key, field]) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>
            {field.title || key}
            {schema.required?.includes(key) && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}

          {field.type === "boolean" ? (
            <Switch
              id={key}
              checked={!!value[key]}
              onCheckedChange={(checked) => handleFieldChange(key, checked)}
              disabled={disabled}
            />
          ) : field.type === "number" ? (
            <Input
              id={key}
              type="number"
              value={String((value[key] as number) ?? field.default ?? "")}
              onChange={(e) => handleFieldChange(key, Number(e.target.value))}
              min={field.minimum}
              max={field.maximum}
              disabled={disabled}
            />
          ) : field.enum ? (
            <Select
              value={(value[key] as string) || (field.default as string) || ""}
              onValueChange={(v) => handleFieldChange(key, v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.title || key}`} />
              </SelectTrigger>
              <SelectContent>
                {field.enum.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field.type === "object" || field.type === "array" ? (
            <Textarea
              id={key}
              value={JSON.stringify(value[key] || field.default || {}, null, 2)}
              onChange={(e) => {
                try {
                  handleFieldChange(key, JSON.parse(e.target.value));
                } catch {
                  // Invalid JSON, keep as string for now
                }
              }}
              className="font-mono text-sm h-32"
              disabled={disabled}
            />
          ) : (
            <Input
              id={key}
              type="text"
              value={(value[key] as string) || (field.default as string) || ""}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              disabled={disabled}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const {
    orgs,
    stores,
    pluginInstances,
    isLoading,
    isSaving,
    updateOrgSettings,
    updateStoreSettings,
    updatePluginConfig,
  } = useSettings();

  const [budgets, setBudgets] = useState<any[]>([]);
  const [orgFormData, setOrgFormData] = useState<Record<string, Record<string, unknown>>>({});
  const [storeFormData, setStoreFormData] = useState<Record<string, Record<string, unknown>>>({});
  const [pluginFormData, setPluginFormData] = useState<Record<string, Record<string, unknown>>>({});

  // Fetch budgets
  useEffect(() => {
    const fetchBudgets = async () => {
      const { data } = await supabase.from("budgets").select("*");
      setBudgets(data || []);
    };
    fetchBudgets();
  }, []);

  // Initialize form data from existing settings
  useEffect(() => {
    const orgData: Record<string, Record<string, unknown>> = {};
    orgs.forEach((org) => {
      orgData[org.id] = (org.settings as Record<string, unknown>) || {};
    });
    setOrgFormData(orgData);

    const storeData: Record<string, Record<string, unknown>> = {};
    stores.forEach((store) => {
      storeData[store.id] = (store.settings as Record<string, unknown>) || {};
    });
    setStoreFormData(storeData);

    const pluginData: Record<string, Record<string, unknown>> = {};
    pluginInstances.forEach((instance) => {
      pluginData[instance.id] = (instance.config as Record<string, unknown>) || {};
    });
    setPluginFormData(pluginData);
  }, [orgs, stores, pluginInstances]);

  const handleSaveOrg = async (orgId: string) => {
    await updateOrgSettings(orgId, orgFormData[orgId] as Json);
  };

  const handleSaveStore = async (storeId: string) => {
    await updateStoreSettings(storeId, storeFormData[storeId] as Json);
  };

  const handleSavePlugin = async (instanceId: string) => {
    await updatePluginConfig(instanceId, pluginFormData[instanceId] as Json);
  };

  // Default schemas for common settings
  const orgSettingsSchema: JsonSchema = {
    type: "object",
    properties: {
      auto_retry_jobs: {
        type: "boolean",
        title: "Auto-retry Failed Jobs",
        description: "Automatically retry failed jobs up to the max attempts limit",
        default: true,
      },
      pause_on_error_threshold: {
        type: "boolean",
        title: "Pause on Error Threshold",
        description: "Pause job processing if error rate exceeds 20%",
        default: true,
      },
      require_approval_destructive: {
        type: "boolean",
        title: "Require Approval for Destructive Actions",
        description: "Deletes and bulk operations require approval",
        default: true,
      },
      audit_retention_days: {
        type: "number",
        title: "Audit Log Retention (days)",
        description: "How long to keep audit logs",
        default: 90,
        minimum: 30,
        maximum: 365,
      },
      default_timezone: {
        type: "string",
        title: "Default Timezone",
        enum: ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Tokyo"],
        default: "UTC",
      },
    },
    required: [],
  };

  const storeSettingsSchema: JsonSchema = {
    type: "object",
    properties: {
      sync_interval_minutes: {
        type: "number",
        title: "Sync Interval (minutes)",
        description: "How often to sync inventory and orders",
        default: 15,
        minimum: 5,
        maximum: 1440,
      },
      auto_publish: {
        type: "boolean",
        title: "Auto-publish Updates",
        description: "Automatically publish price and inventory changes",
        default: false,
      },
      price_rounding: {
        type: "string",
        title: "Price Rounding",
        enum: ["none", "nearest_dollar", "99_cents"],
        default: "none",
      },
      inventory_buffer: {
        type: "number",
        title: "Inventory Buffer",
        description: "Reserve stock to prevent overselling",
        default: 0,
        minimum: 0,
      },
    },
    required: [],
  };

  const pluginSettingsSchema: JsonSchema = {
    type: "object",
    properties: {
      enabled_features: {
        type: "array",
        title: "Enabled Features",
        description: "Which plugin features are active (JSON array)",
        default: [],
      },
      api_rate_limit: {
        type: "number",
        title: "API Rate Limit Override",
        description: "Custom rate limit for this plugin instance",
        minimum: 1,
      },
      custom_mappings: {
        type: "object",
        title: "Custom Field Mappings",
        description: "Map plugin fields to your data (JSON object)",
        default: {},
      },
    },
    required: [],
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">
              Configure your organization, stores, and plugins.
            </p>
          </div>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="organization" className="space-y-6">
          <TabsList className="bg-muted flex-wrap h-auto">
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Stores
            </TabsTrigger>
            <TabsTrigger value="plugins" className="flex items-center gap-2">
              <Puzzle className="w-4 h-4" />
              Plugins
            </TabsTrigger>
            <TabsTrigger value="budgets" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Budgets
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Organization Settings */}
          <TabsContent value="organization" className="space-y-6">
            {orgs.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No organization found. Please contact support.
                </CardContent>
              </Card>
            ) : (
              orgs.map((org) => (
                <Card key={org.id} className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      {org.name}
                    </CardTitle>
                    <CardDescription>
                      Slug: {org.slug} • Configure organization-wide settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Organization Name</Label>
                        <Input value={org.name} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug</Label>
                        <Input value={org.slug} disabled />
                      </div>
                    </div>

                    <Separator />

                    <DynamicForm
                      schema={orgSettingsSchema}
                      value={orgFormData[org.id] || {}}
                      onChange={(val) =>
                        setOrgFormData((prev) => ({ ...prev, [org.id]: val }))
                      }
                      disabled={isSaving}
                    />

                    <Button onClick={() => handleSaveOrg(org.id)} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Organization Settings
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Store Settings */}
          <TabsContent value="stores" className="space-y-6">
            {stores.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No stores connected. Add a store to configure its settings.
                </CardContent>
              </Card>
            ) : (
              <Accordion type="single" collapsible className="space-y-4">
                {stores.map((store) => (
                  <AccordionItem
                    key={store.id}
                    value={store.id}
                    className="border border-border rounded-lg bg-card"
                  >
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Store className="w-5 h-5 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">{store.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {store.platform}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <DynamicForm
                        schema={storeSettingsSchema}
                        value={storeFormData[store.id] || {}}
                        onChange={(val) =>
                          setStoreFormData((prev) => ({ ...prev, [store.id]: val }))
                        }
                        disabled={isSaving}
                      />
                      <Button
                        className="mt-4"
                        onClick={() => handleSaveStore(store.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Store Settings
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>

          {/* Plugin Settings */}
          <TabsContent value="plugins" className="space-y-6">
            {pluginInstances.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No plugins installed. Visit the Plugins page to add integrations.
                </CardContent>
              </Card>
            ) : (
              <Accordion type="single" collapsible className="space-y-4">
                {pluginInstances.map((instance: any) => (
                  <AccordionItem
                    key={instance.id}
                    value={instance.id}
                    className="border border-border rounded-lg bg-card"
                  >
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Puzzle className="w-5 h-5 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">
                            {instance.plugins?.name || "Plugin"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {instance.plugins?.slug || instance.plugin_id}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <DynamicForm
                        schema={pluginSettingsSchema}
                        value={pluginFormData[instance.id] || {}}
                        onChange={(val) =>
                          setPluginFormData((prev) => ({
                            ...prev,
                            [instance.id]: val,
                          }))
                        }
                        disabled={isSaving}
                      />
                      <Button
                        className="mt-4"
                        onClick={() => handleSavePlugin(instance.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Plugin Configuration
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>

          {/* Budgets */}
          <TabsContent value="budgets" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Budget Circuit Breakers</CardTitle>
                <CardDescription>
                  Set limits to prevent runaway API usage and costs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {budgets.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No budgets configured. Budgets help prevent unexpected costs.
                  </p>
                ) : (
                  budgets.map((budget) => {
                    const percentage =
                      (budget.current_value / budget.limit_value) * 100;
                    const isWarning = percentage >= 80;
                    const isCritical = percentage >= 100;

                    return (
                      <div key={budget.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{budget.name}</span>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {budget.period}
                            </Badge>
                            {budget.is_frozen && (
                              <Badge variant="destructive" className="text-xs">
                                Frozen
                              </Badge>
                            )}
                          </div>
                          <span
                            className={`font-mono text-sm ${
                              isCritical
                                ? "text-destructive"
                                : isWarning
                                ? "text-warning"
                                : ""
                            }`}
                          >
                            {budget.current_value.toLocaleString()} /{" "}
                            {budget.limit_value.toLocaleString()}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(percentage, 100)}
                          className={`h-2 ${
                            isCritical
                              ? "[&>div]:bg-destructive"
                              : isWarning
                              ? "[&>div]:bg-warning"
                              : ""
                          }`}
                        />
                        {isCritical && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Budget exceeded - actions frozen until reset
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose what you want to be notified about.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    title: "Pending Approvals",
                    desc: "Get notified when new approvals are waiting",
                    key: "pending_approvals",
                  },
                  {
                    title: "Failed Jobs",
                    desc: "Alert when jobs fail after max retries",
                    key: "failed_jobs",
                  },
                  {
                    title: "Budget Warnings",
                    desc: "Notify when budgets reach 80% usage",
                    key: "budget_warnings",
                  },
                  {
                    title: "Store Disconnections",
                    desc: "Alert when a store connection fails",
                    key: "store_disconnections",
                  },
                  {
                    title: "Reconciliation Issues",
                    desc: "Notify when data discrepancies are detected",
                    key: "reconciliation_issues",
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled />
                  <p className="text-xs text-muted-foreground">
                    User ID: {user?.id}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
