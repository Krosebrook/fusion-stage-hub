import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Job {
  id: string;
  org_id: string;
  store_id: string | null;
  job_type: string;
  payload: Record<string, unknown>;
  status: string;
  priority: number;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  result: Record<string, unknown> | null;
}

interface JobResult {
  success: boolean;
  data?: unknown;
  error?: string;
  retry?: boolean;
  reconciliation_needed?: boolean;
}

// Exponential backoff with jitter
function calculateBackoff(attempt: number, baseDelay = 1000, maxDelay = 300000): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.floor(exponentialDelay + jitter);
}

// Job type handlers
const jobHandlers: Record<string, (job: Job, supabase: SupabaseClient) => Promise<JobResult>> = {
  // Product sync job
  'product_sync': async (job, supabase) => {
    const { store_id, product_id } = job.payload as { store_id: string; product_id: string };
    
    // Fetch store and product data
    const [storeResult, productResult] = await Promise.all([
      supabase.from('stores').select('*').eq('id', store_id).single(),
      supabase.from('products').select('*, variants(*)').eq('id', product_id).single()
    ]);

    if (storeResult.error || productResult.error) {
      return { 
        success: false, 
        error: storeResult.error?.message || productResult.error?.message,
        retry: true 
      };
    }

    // Platform-specific sync would go here
    return { success: true, data: { synced: true } };
  },

  // Listing publish job
  'listing_publish': async (job, supabase) => {
    const { listing_id } = job.payload as { listing_id: string };
    
    const { data: listing, error } = await supabase
      .from('listings')
      .select('*, stores(*), products(*)')
      .eq('id', listing_id)
      .single();

    if (error) {
      return { success: false, error: error.message, retry: true };
    }

    // Update listing status
    await supabase
      .from('listings')
      .update({ status: 'publishing' as const })
      .eq('id', listing_id);

    // Platform-specific publish logic would go here
    // For now, simulate success
    await supabase
      .from('listings')
      .update({ 
        status: 'published' as const, 
        last_published_at: new Date().toISOString() 
      })
      .eq('id', listing_id);

    return { success: true, data: { published: true }, reconciliation_needed: true };
  },

  // Inventory sync job
  'inventory_sync': async (job, supabase) => {
    const { store_id } = job.payload as { store_id: string };
    
    const { data: variants, error } = await supabase
      .from('variants')
      .select('*, products!inner(org_id)')
      .eq('products.org_id', job.org_id);

    if (error) {
      return { success: false, error: error.message, retry: true };
    }

    return { success: true, data: { variants_synced: variants?.length || 0 } };
  },

  // Reconciliation job
  'reconciliation': async (job, supabase) => {
    const { store_id, resource_type } = job.payload as { store_id: string; resource_type: string };
    
    // Fetch local and remote state for comparison
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('store_id', store_id)
      .in('status', ['published', 'publishing']);

    if (error) {
      return { success: false, error: error.message, retry: true };
    }

    // Compare with external platform state
    // Mark discrepancies for review
    const discrepancies: string[] = [];
    
    return { 
      success: true, 
      data: { 
        checked: listings?.length || 0, 
        discrepancies: discrepancies.length 
      } 
    };
  },

  // Budget check job
  'budget_check': async (job, supabase) => {
    const { data: budgets, error } = await supabase
      .from('budgets')
      .select('id, name, current_value, limit_value, is_frozen')
      .eq('org_id', job.org_id)
      .eq('is_frozen', false);

    if (error) {
      return { success: false, error: error.message, retry: true };
    }

    // Check each budget and freeze if over limit
    for (const budget of budgets || []) {
      const currentValue = budget.current_value as number;
      const limitValue = budget.limit_value as number;
      
      if (currentValue >= limitValue) {
        await supabase
          .from('budgets')
          .update({ is_frozen: true })
          .eq('id', budget.id);

        // Create approval request for budget override
        await supabase.from('approvals').insert({
          org_id: job.org_id,
          resource_type: 'budget',
          resource_id: budget.id,
          action: 'budget_override',
          requested_by: 'system',
          payload: { budget_name: budget.name, current: currentValue, limit: limitValue },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }

    return { success: true, data: { checked: budgets?.length || 0 } };
  }
};

// Default handler for unknown job types
async function handleUnknownJob(job: Job): Promise<JobResult> {
  return { 
    success: false, 
    error: `Unknown job type: ${job.job_type}`,
    retry: false 
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { org_id, worker_id, limit = 5 } = await req.json();

    if (!org_id || !worker_id) {
      return new Response(
        JSON.stringify({ error: 'org_id and worker_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Claim jobs using the RPC function with FOR UPDATE SKIP LOCKED
    const { data: jobs, error: claimError } = await supabase.rpc('claim_due_jobs', {
      p_org_id: org_id,
      p_limit: limit,
      p_worker_id: worker_id
    });

    if (claimError) {
      throw new Error(`Failed to claim jobs: ${claimError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No jobs to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Array<{ job_id: string; success: boolean; error?: string }> = [];

    // Process each claimed job
    for (const job of jobs as Job[]) {
      try {
        // Update job to running
        await supabase
          .from('jobs')
          .update({ status: 'running', started_at: new Date().toISOString() })
          .eq('id', job.id);

        // Get the handler for this job type
        const handler = jobHandlers[job.job_type] || handleUnknownJob;
        const result = await handler(job, supabase);

        if (result.success) {
          // Job completed successfully
          await supabase
            .from('jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              result: result.data as Record<string, unknown>
            })
            .eq('id', job.id);

          // If reconciliation is needed, schedule a reconciliation job
          if (result.reconciliation_needed && job.store_id) {
            const reconciliationKey = `reconcile_${job.store_id}_${Date.now()}`;
            await supabase.from('jobs').insert({
              org_id: job.org_id,
              store_id: job.store_id,
              job_type: 'reconciliation',
              idempotency_key: reconciliationKey,
              payload: { store_id: job.store_id, triggered_by: job.id },
              scheduled_at: new Date(Date.now() + 60000).toISOString(), // 1 minute delay
              priority: 5
            });
          }

          // Audit log
          await supabase.from('audit_logs').insert({
            org_id: job.org_id,
            resource_type: 'job',
            resource_id: job.id,
            action: 'job_completed',
            metadata: { job_type: job.job_type, attempts: job.attempts },
            soc2_tags: ['automation', 'job_execution']
          });

          results.push({ job_id: job.id, success: true });
        } else {
          // Job failed
          const shouldRetry = result.retry !== false && job.attempts < job.max_attempts;
          
          if (shouldRetry) {
            // Schedule retry with exponential backoff
            const backoffMs = calculateBackoff(job.attempts);
            const nextScheduledAt = new Date(Date.now() + backoffMs).toISOString();
            
            await supabase
              .from('jobs')
              .update({
                status: 'pending',
                last_error: result.error,
                scheduled_at: nextScheduledAt,
                claimed_at: null,
                claimed_by: null,
                started_at: null
              })
              .eq('id', job.id);

            results.push({ job_id: job.id, success: false, error: `Retry scheduled: ${result.error}` });
          } else {
            // Max attempts reached or no retry requested
            await supabase
              .from('jobs')
              .update({
                status: 'failed',
                completed_at: new Date().toISOString(),
                last_error: result.error
              })
              .eq('id', job.id);

            // Create approval for manual intervention if needed
            if (job.attempts >= job.max_attempts) {
              await supabase.from('approvals').insert({
                org_id: job.org_id,
                resource_type: 'job',
                resource_id: job.id,
                action: 'job_retry',
                requested_by: 'system',
                payload: { job_type: job.job_type, error: result.error, attempts: job.attempts },
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              });
            }

            // Audit log for failure
            await supabase.from('audit_logs').insert({
              org_id: job.org_id,
              resource_type: 'job',
              resource_id: job.id,
              action: 'job_failed',
              metadata: { job_type: job.job_type, error: result.error, attempts: job.attempts },
              soc2_tags: ['automation', 'job_failure', 'alert']
            });

            results.push({ job_id: job.id, success: false, error: result.error });
          }
        }
      } catch (jobError) {
        const errorMessage = jobError instanceof Error ? jobError.message : 'Unknown error';
        
        // Handle unexpected errors
        await supabase
          .from('jobs')
          .update({
            status: 'pending',
            last_error: errorMessage,
            scheduled_at: new Date(Date.now() + calculateBackoff(job.attempts)).toISOString(),
            claimed_at: null,
            claimed_by: null,
            started_at: null
          })
          .eq('id', job.id);

        results.push({ job_id: job.id, success: false, error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ 
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
