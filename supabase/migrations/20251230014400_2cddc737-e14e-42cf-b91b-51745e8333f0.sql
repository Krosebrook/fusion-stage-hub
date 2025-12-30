-- FlashFusion E-commerce Operations Hub Schema
-- Comprehensive multi-tenant e-commerce platform

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE public.org_member_role AS ENUM ('owner', 'operator', 'viewer');
CREATE TYPE public.job_status AS ENUM ('pending', 'claimed', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE public.capability_level AS ENUM ('native', 'workaround', 'unsupported');
CREATE TYPE public.settings_scope AS ENUM ('global', 'org', 'store', 'plugin_instance', 'workflow');
CREATE TYPE public.webhook_status AS ENUM ('received', 'processing', 'processed', 'failed');
CREATE TYPE public.listing_status AS ENUM ('draft', 'staged', 'publishing', 'published', 'failed', 'delisted');

-- ============================================
-- CORE TABLES
-- ============================================

-- Organizations
CREATE TABLE public.orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization Members
CREATE TABLE public.org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role org_member_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, user_id)
);

-- User Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stores (connected platform accounts)
CREATE TABLE public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    platform TEXT NOT NULL, -- shopify, etsy, amazon, gumroad, printify, kdp
    external_id TEXT,
    credentials_encrypted TEXT, -- encrypted token storage
    settings JSONB DEFAULT '{}',
    rate_limit_state JSONB DEFAULT '{}', -- token bucket state
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PLUGIN SYSTEM
-- ============================================

-- Plugin Registry (platform capabilities)
CREATE TABLE public.plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL, -- printify, shopify, etsy, gumroad, amazon-sc, amazon-kdp
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    version TEXT NOT NULL DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plugin Contracts (capability matrix)
CREATE TABLE public.plugin_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
    capability TEXT NOT NULL, -- list_products, create_product, update_inventory, etc.
    level capability_level NOT NULL DEFAULT 'unsupported',
    constraints JSONB DEFAULT '{}', -- rate limits, batch sizes, etc.
    workaround_description TEXT, -- explains workaround if level=workaround
    automation_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(plugin_id, capability)
);

-- Plugin Instances (per-store configuration)
CREATE TABLE public.plugin_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
    config JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(store_id, plugin_id)
);

-- ============================================
-- SETTINGS ENGINE (Versioned, Scoped)
-- ============================================

-- Settings Definitions (JSON Schema)
CREATE TABLE public.settings_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    schema JSONB NOT NULL, -- JSON Schema for validation
    default_value JSONB,
    scope settings_scope NOT NULL DEFAULT 'global',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings Values (Versioned)
CREATE TABLE public.settings_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID NOT NULL REFERENCES public.settings_definitions(id) ON DELETE CASCADE,
    scope settings_scope NOT NULL,
    scope_id UUID, -- org_id, store_id, plugin_instance_id, or workflow_id
    value JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- ============================================
-- PRODUCTS & LISTINGS
-- ============================================

-- Products (canonical product data)
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, sku)
);

-- Product Variants
CREATE TABLE public.variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    options JSONB DEFAULT '{}', -- size, color, etc.
    price DECIMAL(10,2),
    inventory_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Media Assets
CREATE TABLE public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    type TEXT DEFAULT 'image', -- image, video, pdf
    alt_text TEXT,
    position INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Listings (product-to-store mappings)
CREATE TABLE public.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    external_id TEXT, -- platform-specific listing ID
    status listing_status NOT NULL DEFAULT 'draft',
    platform_data JSONB DEFAULT '{}', -- platform-specific fields
    price_override DECIMAL(10,2),
    staged_changes JSONB, -- changes awaiting approval
    last_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, store_id)
);

-- ============================================
-- APPROVALS & BUDGETS
-- ============================================

-- Approvals (human-in-the-loop)
CREATE TABLE public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- listing, job, budget, etc.
    resource_id UUID NOT NULL,
    action TEXT NOT NULL, -- publish, update, delete, etc.
    payload JSONB NOT NULL,
    status approval_status NOT NULL DEFAULT 'pending',
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    decided_by UUID REFERENCES auth.users(id),
    decision_reason TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ
);

-- Budgets (circuit breakers)
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    budget_type TEXT NOT NULL, -- api_calls, spend, actions
    period TEXT NOT NULL, -- daily, weekly, monthly
    limit_value DECIMAL(12,2) NOT NULL,
    current_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    is_frozen BOOLEAN DEFAULT false,
    reset_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- JOB QUEUE
-- ============================================

-- Jobs (with idempotency)
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    idempotency_key TEXT NOT NULL,
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status job_status NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    result JSONB,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    claimed_at TIMESTAMPTZ,
    claimed_by TEXT, -- worker identifier
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, idempotency_key)
);

-- Create index for job claiming with SKIP LOCKED
CREATE INDEX idx_jobs_claimable ON public.jobs (org_id, status, scheduled_at, priority DESC)
    WHERE status = 'pending';

-- ============================================
-- WEBHOOKS
-- ============================================

-- Webhook Events
CREATE TABLE public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL, -- platform event ID for replay protection
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    signature TEXT,
    status webhook_status NOT NULL DEFAULT 'received',
    processed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(store_id, external_id)
);

-- ============================================
-- AUDIT LOGS (Append-Only)
-- ============================================

-- Audit Logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    soc2_tags TEXT[] DEFAULT '{}', -- compliance tags
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent updates/deletes on audit logs
CREATE RULE audit_logs_no_update AS ON UPDATE TO public.audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE TO public.audit_logs DO INSTEAD NOTHING;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Security definer function for org membership check
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = p_org_id AND user_id = p_user_id
    )
$$;

-- Get user's role in an org
CREATE OR REPLACE FUNCTION public.get_org_role(p_org_id UUID, p_user_id UUID)
RETURNS org_member_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.org_members
    WHERE org_id = p_org_id AND user_id = p_user_id
    LIMIT 1
$$;

-- Check if user can write to org (owner or operator)
CREATE OR REPLACE FUNCTION public.can_write_org(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = p_org_id 
        AND user_id = p_user_id 
        AND role IN ('owner', 'operator')
    )
$$;

-- Claim due jobs with FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_due_jobs(p_org_id UUID, p_limit INTEGER, p_worker_id TEXT)
RETURNS SETOF public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH claimable AS (
        SELECT id FROM public.jobs
        WHERE org_id = p_org_id
        AND status = 'pending'
        AND scheduled_at <= now()
        AND attempts < max_attempts
        ORDER BY priority DESC, scheduled_at ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.jobs j
    SET 
        status = 'claimed',
        claimed_at = now(),
        claimed_by = p_worker_id,
        attempts = attempts + 1,
        updated_at = now()
    FROM claimable c
    WHERE j.id = c.id
    RETURNING j.*;
END;
$$;

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Apply timestamp triggers
CREATE TRIGGER update_orgs_updated_at BEFORE UPDATE ON public.orgs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_org_members_updated_at BEFORE UPDATE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_plugins_updated_at BEFORE UPDATE ON public.plugins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_plugin_instances_updated_at BEFORE UPDATE ON public.plugin_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_settings_definitions_updated_at BEFORE UPDATE ON public.settings_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON public.variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Orgs policies
CREATE POLICY "Members can view their orgs" ON public.orgs
    FOR SELECT USING (public.is_org_member(id, auth.uid()));
CREATE POLICY "Owners can update orgs" ON public.orgs
    FOR UPDATE USING (public.get_org_role(id, auth.uid()) = 'owner');
CREATE POLICY "Authenticated users can create orgs" ON public.orgs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Org members policies
CREATE POLICY "Members can view org members" ON public.org_members
    FOR SELECT USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "Owners can manage org members" ON public.org_members
    FOR ALL USING (public.get_org_role(org_id, auth.uid()) = 'owner');

-- Stores policies
CREATE POLICY "Members can view stores" ON public.stores
    FOR SELECT USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "Writers can manage stores" ON public.stores
    FOR ALL USING (public.can_write_org(org_id, auth.uid()));

-- Plugins policies (public read)
CREATE POLICY "Anyone can view plugins" ON public.plugins
    FOR SELECT USING (true);
CREATE POLICY "Plugin contracts are public" ON public.plugin_contracts
    FOR SELECT USING (true);

-- Plugin instances policies
CREATE POLICY "Members can view plugin instances" ON public.plugin_instances
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND public.is_org_member(s.org_id, auth.uid()))
    );
CREATE POLICY "Writers can manage plugin instances" ON public.plugin_instances
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND public.can_write_org(s.org_id, auth.uid()))
    );

-- Settings policies
CREATE POLICY "Anyone can view settings definitions" ON public.settings_definitions
    FOR SELECT USING (true);
CREATE POLICY "Members can view settings values" ON public.settings_values
    FOR SELECT USING (
        scope = 'global' OR
        (scope = 'org' AND public.is_org_member(scope_id, auth.uid())) OR
        EXISTS (SELECT 1 FROM public.stores s WHERE s.id = scope_id AND public.is_org_member(s.org_id, auth.uid()))
    );
CREATE POLICY "Writers can manage settings values" ON public.settings_values
    FOR ALL USING (
        scope = 'global' OR
        (scope = 'org' AND public.can_write_org(scope_id, auth.uid())) OR
        EXISTS (SELECT 1 FROM public.stores s WHERE s.id = scope_id AND public.can_write_org(s.org_id, auth.uid()))
    );

-- Products policies
CREATE POLICY "Members can view products" ON public.products
    FOR SELECT USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "Writers can manage products" ON public.products
    FOR ALL USING (public.can_write_org(org_id, auth.uid()));

-- Variants policies
CREATE POLICY "Members can view variants" ON public.variants
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_org_member(p.org_id, auth.uid()))
    );
CREATE POLICY "Writers can manage variants" ON public.variants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.can_write_org(p.org_id, auth.uid()))
    );

-- Media assets policies
CREATE POLICY "Members can view media" ON public.media_assets
    FOR SELECT USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "Writers can manage media" ON public.media_assets
    FOR ALL USING (public.can_write_org(org_id, auth.uid()));

-- Listings policies
CREATE POLICY "Members can view listings" ON public.listings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_org_member(p.org_id, auth.uid()))
    );
CREATE POLICY "Writers can manage listings" ON public.listings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.can_write_org(p.org_id, auth.uid()))
    );

-- Approvals policies
CREATE POLICY "Members can view approvals" ON public.approvals
    FOR SELECT USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "Writers can manage approvals" ON public.approvals
    FOR ALL USING (public.can_write_org(org_id, auth.uid()));

-- Budgets policies
CREATE POLICY "Members can view budgets" ON public.budgets
    FOR SELECT USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "Writers can manage budgets" ON public.budgets
    FOR ALL USING (public.can_write_org(org_id, auth.uid()));

-- Jobs policies
CREATE POLICY "Members can view jobs" ON public.jobs
    FOR SELECT USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "Writers can manage jobs" ON public.jobs
    FOR ALL USING (public.can_write_org(org_id, auth.uid()));

-- Webhook events policies
CREATE POLICY "Members can view webhook events" ON public.webhook_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND public.is_org_member(s.org_id, auth.uid()))
    );

-- Audit logs policies (read-only for members)
CREATE POLICY "Members can view audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_org_members_user ON public.org_members(user_id);
CREATE INDEX idx_org_members_org ON public.org_members(org_id);
CREATE INDEX idx_stores_org ON public.stores(org_id);
CREATE INDEX idx_stores_platform ON public.stores(platform);
CREATE INDEX idx_plugin_instances_store ON public.plugin_instances(store_id);
CREATE INDEX idx_plugin_contracts_plugin ON public.plugin_contracts(plugin_id);
CREATE INDEX idx_products_org ON public.products(org_id);
CREATE INDEX idx_variants_product ON public.variants(product_id);
CREATE INDEX idx_listings_product ON public.listings(product_id);
CREATE INDEX idx_listings_store ON public.listings(store_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_approvals_org ON public.approvals(org_id);
CREATE INDEX idx_approvals_status ON public.approvals(status);
CREATE INDEX idx_jobs_org ON public.jobs(org_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_type ON public.jobs(job_type);
CREATE INDEX idx_webhook_events_store ON public.webhook_events(store_id);
CREATE INDEX idx_audit_logs_org ON public.audit_logs(org_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);