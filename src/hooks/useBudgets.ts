import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Budget = Database["public"]["Tables"]["budgets"]["Row"];
type BudgetInsert = Database["public"]["Tables"]["budgets"]["Insert"];
type BudgetUpdate = Database["public"]["Tables"]["budgets"]["Update"];

export interface BudgetWithStore extends Budget {
  store?: {
    id: string;
    name: string;
  } | null;
  usagePercentage: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
}

export function useBudgets(orgId?: string) {
  const [budgets, setBudgets] = useState<BudgetWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    if (!orgId) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("budgets")
        .select(`
          *,
          store:stores(id, name)
        `)
        .eq("org_id", orgId)
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;

      const budgetsWithUsage = (data || []).map((budget) => {
        const usagePercentage = budget.limit_value > 0 
          ? (Number(budget.current_value) / Number(budget.limit_value)) * 100 
          : 0;
        return {
          ...budget,
          usagePercentage,
          isNearLimit: usagePercentage >= 80 && usagePercentage < 100,
          isOverLimit: usagePercentage >= 100,
        } as BudgetWithStore;
      });

      setBudgets(budgetsWithUsage);
      setError(null);
    } catch (err) {
      console.error("Error fetching budgets:", err);
      setError("Failed to fetch budgets");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const createBudget = async (budget: Omit<BudgetInsert, "org_id">) => {
    if (!orgId) return;

    try {
      const { error: insertError } = await supabase
        .from("budgets")
        .insert({ ...budget, org_id: orgId });

      if (insertError) throw insertError;

      toast({
        title: "Budget Created",
        description: `${budget.name} has been created`,
      });

      await fetchBudgets();
    } catch (err) {
      console.error("Error creating budget:", err);
      toast({
        title: "Error",
        description: "Failed to create budget",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateBudget = async (budgetId: string, updates: BudgetUpdate) => {
    try {
      const { error: updateError } = await supabase
        .from("budgets")
        .update(updates)
        .eq("id", budgetId);

      if (updateError) throw updateError;

      toast({
        title: "Budget Updated",
        description: "Budget has been updated",
      });

      await fetchBudgets();
    } catch (err) {
      console.error("Error updating budget:", err);
      toast({
        title: "Error",
        description: "Failed to update budget",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteBudget = async (budgetId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId);

      if (deleteError) throw deleteError;

      toast({
        title: "Budget Deleted",
        description: "Budget has been removed",
      });

      await fetchBudgets();
    } catch (err) {
      console.error("Error deleting budget:", err);
      toast({
        title: "Error",
        description: "Failed to delete budget",
        variant: "destructive",
      });
      throw err;
    }
  };

  const resetBudget = async (budgetId: string) => {
    try {
      const now = new Date();
      const { error: updateError } = await supabase
        .from("budgets")
        .update({ 
          current_value: 0,
          reset_at: now.toISOString()
        })
        .eq("id", budgetId);

      if (updateError) throw updateError;

      toast({
        title: "Budget Reset",
        description: "Budget has been reset to zero",
      });

      await fetchBudgets();
    } catch (err) {
      console.error("Error resetting budget:", err);
      toast({
        title: "Error",
        description: "Failed to reset budget",
        variant: "destructive",
      });
      throw err;
    }
  };

  const freezeBudget = async (budgetId: string, freeze: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from("budgets")
        .update({ is_frozen: freeze })
        .eq("id", budgetId);

      if (updateError) throw updateError;

      toast({
        title: freeze ? "Budget Frozen" : "Budget Unfrozen",
        description: freeze 
          ? "Spending has been paused" 
          : "Spending has resumed",
      });

      await fetchBudgets();
    } catch (err) {
      console.error("Error freezing budget:", err);
      toast({
        title: "Error",
        description: "Failed to update budget",
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // Check for budget alerts
  useEffect(() => {
    budgets.forEach((budget) => {
      if (budget.isOverLimit && !budget.is_frozen) {
        toast({
          title: "Budget Exceeded",
          description: `${budget.name} has exceeded its limit`,
          variant: "destructive",
        });
      } else if (budget.isNearLimit) {
        toast({
          title: "Budget Warning",
          description: `${budget.name} is at ${budget.usagePercentage.toFixed(0)}% of limit`,
        });
      }
    });
  }, [budgets]);

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel("budgets-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "budgets",
        },
        () => {
          fetchBudgets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, fetchBudgets]);

  return {
    budgets,
    loading,
    error,
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    resetBudget,
    freezeBudget,
  };
}
