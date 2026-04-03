-- ============================================================
-- Full Migration: Missing Tables + Missing Columns
-- Run this in your Supabase SQL Editor (postgres role)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. problem_statements table
--    Used when a project is created with PS-based tracking.
--    Also stores Qdrant vector references for auto-categorization.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.problem_statements (
  statement_id    uuid        NOT NULL DEFAULT uuid_generate_v4(),
  project_id      uuid        NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  title           text        NOT NULL,
  description     text        NOT NULL,

  -- Qdrant vector tracking (added by add_embedding_columns.sql pattern)
  qdrant_point_id    uuid,
  qdrant_indexed     boolean     NOT NULL DEFAULT false,
  qdrant_indexed_at  timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT problem_statements_pkey PRIMARY KEY (statement_id)
);

CREATE INDEX IF NOT EXISTS idx_ps_project_id
  ON public.problem_statements(project_id);

CREATE INDEX IF NOT EXISTS idx_ps_qdrant_indexed
  ON public.problem_statements(qdrant_indexed);


-- ────────────────────────────────────────────────────────────
-- 2. scoring_criteria table
--    Stores the evaluation rubric for a project.
--    Weights must sum to 100 (enforced in app layer).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scoring_criteria (
  criterion_id    uuid        NOT NULL DEFAULT uuid_generate_v4(),
  project_id      uuid        NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  criterion_name  text        NOT NULL,
  weight          integer     NOT NULL CHECK (weight > 0 AND weight <= 100),

  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT scoring_criteria_pkey PRIMARY KEY (criterion_id)
);

CREATE INDEX IF NOT EXISTS idx_sc_project_id
  ON public.scoring_criteria(project_id);


-- ────────────────────────────────────────────────────────────
-- 3. Add auto-categorization result columns to submissions
--    NOW safe to add FK since problem_statements table exists.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS detected_problem_statement_id uuid
    REFERENCES public.problem_statements(statement_id) ON DELETE SET NULL;

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS detection_confidence real
    CHECK (detection_confidence >= 0 AND detection_confidence <= 1);

CREATE INDEX IF NOT EXISTS idx_submissions_detected_ps
  ON public.submissions(detected_problem_statement_id);
