import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useBudgets, type BudgetWithStore } from "@/hooks/useBudgets";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Plus, 
  RefreshCcw, 
  Trash2, 
  Edit, 
  Pause, 
  Play,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Snowflake
} from "lucide-react";
import { format } from "date-fns";

export default function Budgets() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithStore | null>(null);

  const {
    budgets,
    loading,
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    resetBudget,
    freezeBudget,
  } = useBudgets(orgId);

  const { stores } = useStores();

  useEffect(() => {
    async function fetchOrg() {
      if (!user) return;

      const { data } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        setOrgId(data.org_id);
      }
    }

    fetchOrg();
  }, [user]);

  const handleCreateBudget = async (formData: FormData) => {
    const name = formData.get("name") as string;
    const budgetType = formData.get("budget_type") as string;
    const limitValue = parseFloat(formData.get("limit_value") as string);
    const period = formData.get("period") as string;
    const storeId = formData.get("store_id") as string;

    const resetAt = new Date();
    if (period === "daily") {
      resetAt.setDate(resetAt.getDate() + 1);
    } else if (period === "weekly") {
      resetAt.setDate(resetAt.getDate() + 7);
    } else if (period === "monthly") {
      resetAt.setMonth(resetAt.getMonth() + 1);
    }

    await createBudget({
      name,
      budget_type: budgetType,
      limit_value: limitValue,
      period,
      reset_at: resetAt.toISOString(),
      store_id: storeId || null,
    });

    setDialogOpen(false);
  };

  const handleUpdateBudget = async (formData: FormData) => {
    if (!editingBudget) return;

    const name = formData.get("name") as string;
    const limitValue = parseFloat(formData.get("limit_value") as string);

    await updateBudget(editingBudget.id, {
      name,
      limit_value: limitValue,
    });

    setEditingBudget(null);
    setDialogOpen(false);
  };

  const getProgressColor = (budget: BudgetWithStore) => {
    if (budget.isOverLimit) return "bg-red-500";
    if (budget.isNearLimit) return "bg-yellow-500";
    return "bg-green-500";
  };

  const overLimitBudgets = budgets.filter(b => b.isOverLimit && !b.is_frozen);
  const nearLimitBudgets = budgets.filter(b => b.isNearLimit && !b.isOverLimit);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Budgets</h1>
            <p className="text-muted-foreground">
              Track and manage spending limits across your operations
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => fetchBudgets()} variant="outline">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingBudget(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Budget
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBudget ? "Edit Budget" : "Create Budget"}
                  </DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    if (editingBudget) {
                      handleUpdateBudget(formData);
                    } else {
                      handleCreateBudget(formData);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Monthly Ad Spend"
                      defaultValue={editingBudget?.name || ""}
                      required
                    />
                  </div>

                  {!editingBudget && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="budget_type">Type</Label>
                        <Select name="budget_type" defaultValue="spending">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spending">Spending</SelectItem>
                            <SelectItem value="api_calls">API Calls</SelectItem>
                            <SelectItem value="orders">Orders</SelectItem>
                            <SelectItem value="products">Products</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="period">Period</Label>
                        <Select name="period" defaultValue="monthly">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="store_id">Store (optional)</Label>
                        <Select name="store_id" defaultValue="">
                          <SelectTrigger>
                            <SelectValue placeholder="All stores" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All stores</SelectItem>
                            {stores.map((store) => (
                              <SelectItem key={store.id} value={store.id}>
                                {store.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="limit_value">Limit</Label>
                    <Input
                      id="limit_value"
                      name="limit_value"
                      type="number"
                      step="0.01"
                      placeholder="1000"
                      defaultValue={editingBudget?.limit_value || ""}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => {
                      setDialogOpen(false);
                      setEditingBudget(null);
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingBudget ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Alerts */}
        {overLimitBudgets.length > 0 && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-500">
                    {overLimitBudgets.length} budget(s) exceeded
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {overLimitBudgets.map(b => b.name).join(", ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {nearLimitBudgets.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium text-yellow-500">
                    {nearLimitBudgets.length} budget(s) approaching limit
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {nearLimitBudgets.map(b => `${b.name} (${b.usagePercentage.toFixed(0)}%)`).join(", ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Budget Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : budgets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No budgets configured</h3>
              <p className="text-muted-foreground mb-4">
                Create a budget to start tracking your spending
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Budget
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((budget) => (
              <Card key={budget.id} className={budget.is_frozen ? "opacity-75" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {budget.name}
                        {budget.is_frozen && (
                          <Snowflake className="h-4 w-4 text-blue-500" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        {budget.store?.name || "All stores"} • {budget.period}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {budget.budget_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        ${Number(budget.current_value).toFixed(2)} / ${Number(budget.limit_value).toFixed(2)}
                      </span>
                      <span className={
                        budget.isOverLimit 
                          ? "text-red-500 font-medium" 
                          : budget.isNearLimit 
                            ? "text-yellow-500" 
                            : "text-muted-foreground"
                      }>
                        {budget.usagePercentage.toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(budget.usagePercentage, 100)} 
                      className="h-2"
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Resets: {format(new Date(budget.reset_at), "MMM d, yyyy")}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingBudget(budget);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => freezeBudget(budget.id, !budget.is_frozen)}
                      >
                        {budget.is_frozen ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => resetBudget(budget.id)}
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{budget.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteBudget(budget.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
