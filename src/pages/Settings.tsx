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
import { Save, Shield, Bell, Palette, Database, Zap } from "lucide-react";

const budgets = [
  { name: "API Calls - Shopify", used: 450, limit: 1000, type: "daily" },
  { name: "API Calls - Etsy", used: 8500, limit: 10000, type: "daily" },
  { name: "Monthly Actions", used: 2340, limit: 5000, type: "monthly" },
];

export default function Settings() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Configure your organization, budgets, and preferences.
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Organization
                </CardTitle>
                <CardDescription>
                  Manage your organization details and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input id="org-name" defaultValue="Acme Commerce" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-slug">Slug</Label>
                    <Input id="org-slug" defaultValue="acme-commerce" />
                  </div>
                </div>
                <Button>
                  <Save className="w-4 h-4 mr-1" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Job Queue Settings
                </CardTitle>
                <CardDescription>
                  Configure job processing and retry behavior.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-retry Failed Jobs</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically retry failed jobs up to the max attempts limit.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Pause Queue on Error Threshold</p>
                    <p className="text-sm text-muted-foreground">
                      Pause job processing if error rate exceeds 20%.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
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
                {budgets.map((budget) => {
                  const percentage = (budget.used / budget.limit) * 100;
                  const isWarning = percentage >= 80;
                  const isCritical = percentage >= 100;

                  return (
                    <div key={budget.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{budget.name}</span>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {budget.type}
                          </Badge>
                        </div>
                        <span className={`font-mono text-sm ${isCritical ? "text-destructive" : isWarning ? "text-warning" : ""}`}>
                          {budget.used.toLocaleString()} / {budget.limit.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(percentage, 100)}
                        className={`h-2 ${isCritical ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-warning" : ""}`}
                      />
                      {isCritical && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Budget exceeded - actions frozen
                        </p>
                      )}
                    </div>
                  );
                })}
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
                  { title: "Pending Approvals", desc: "Get notified when new approvals are waiting" },
                  { title: "Failed Jobs", desc: "Alert when jobs fail after max retries" },
                  { title: "Budget Warnings", desc: "Notify when budgets reach 80% usage" },
                  { title: "Store Disconnections", desc: "Alert when a store connection fails" },
                  { title: "Reconciliation Issues", desc: "Notify when data discrepancies are detected" },
                ].map((item) => (
                  <div key={item.title} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage security and access controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Require Approval for Destructive Actions</p>
                    <p className="text-sm text-muted-foreground">
                      Deletes and bulk operations require approval.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all organization members.
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Audit Log Retention</p>
                    <p className="text-sm text-muted-foreground">
                      Keep audit logs for SOC2 compliance.
                    </p>
                  </div>
                  <Badge variant="success">90 days</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
