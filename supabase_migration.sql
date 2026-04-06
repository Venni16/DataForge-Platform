-- ============================================================
-- DataForge Platform — Supabase Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Enable UUID extension (already available in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. datasets ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.datasets (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT        NOT NULL,
  current_version INTEGER     NOT NULL DEFAULT 1,
  rows            INTEGER,
  columns         INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. dataset_versions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dataset_versions (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id     UUID        NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  version_number INTEGER     NOT NULL,
  file_path      TEXT,
  rows           INTEGER,
  columns        INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dataset_id, version_number)
);

-- ── 3. operations_history ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operations_history (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id   UUID        NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  version      INTEGER     NOT NULL,
  operation    TEXT        NOT NULL,
  parameters   JSONB       DEFAULT '{}',
  shape        JSONB       DEFAULT '{}',
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. pipeline_configs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipeline_configs (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID        NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  config     JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dataset_versions_dataset_id    ON public.dataset_versions(dataset_id);
CREATE INDEX IF NOT EXISTS idx_operations_history_dataset_id  ON public.operations_history(dataset_id);
CREATE INDEX IF NOT EXISTS idx_operations_history_timestamp   ON public.operations_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_pipeline_configs_dataset_id    ON public.pipeline_configs(dataset_id);

-- ── RLS (Row Level Security) — disable for service role ──────
-- The backend uses the SERVICE KEY so RLS is bypassed automatically.
-- Enable RLS only if you add user authentication later.

ALTER TABLE public.datasets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_configs   ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (service key bypasses RLS anyway)
CREATE POLICY "Service role full access - datasets"
  ON public.datasets FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - dataset_versions"
  ON public.dataset_versions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - operations_history"
  ON public.operations_history FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - pipeline_configs"
  ON public.pipeline_configs FOR ALL USING (true) WITH CHECK (true);

-- ── Done ──────────────────────────────────────────────────────
SELECT 'DataForge schema created successfully.' AS status;
