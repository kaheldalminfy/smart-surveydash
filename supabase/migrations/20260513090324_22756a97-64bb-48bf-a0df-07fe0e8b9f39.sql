-- 1. Extend archives table
ALTER TABLE public.archives
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS period_start_date date,
  ADD COLUMN IF NOT EXISTS period_end_date date,
  ADD COLUMN IF NOT EXISTS kpis_snapshot jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS closing_notes text,
  ADD COLUMN IF NOT EXISTS frozen_at timestamptz,
  ADD COLUMN IF NOT EXISTS frozen_by uuid,
  ADD COLUMN IF NOT EXISTS export_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Status check
DO $$ BEGIN
  ALTER TABLE public.archives
    ADD CONSTRAINT archives_status_check CHECK (status IN ('draft','frozen','published'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sync is_frozen with status
CREATE OR REPLACE FUNCTION public.sync_archive_frozen_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('frozen','published') THEN
    NEW.is_frozen := true;
    IF NEW.frozen_at IS NULL THEN NEW.frozen_at := now(); END IF;
  ELSE
    NEW.is_frozen := false;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_archive_frozen ON public.archives;
CREATE TRIGGER trg_sync_archive_frozen
  BEFORE INSERT OR UPDATE ON public.archives
  FOR EACH ROW EXECUTE FUNCTION public.sync_archive_frozen_state();

-- Prevent modification/deletion of frozen archives (admins can override via direct SQL only)
CREATE OR REPLACE FUNCTION public.protect_frozen_archive()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('frozen','published') AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'لا يمكن حذف أرشيف مجمّد. يجب فك التجميد أولاً (يتطلب صلاحيات المسؤول).';
    END IF;
    RETURN OLD;
  ELSE
    -- UPDATE: only allow status transitions and export_count by non-admins
    IF OLD.status IN ('frozen','published')
       AND NOT public.has_role(auth.uid(), 'admin'::app_role)
       AND (
         NEW.data IS DISTINCT FROM OLD.data OR
         NEW.kpis_snapshot IS DISTINCT FROM OLD.kpis_snapshot OR
         NEW.period_start_date IS DISTINCT FROM OLD.period_start_date OR
         NEW.period_end_date IS DISTINCT FROM OLD.period_end_date OR
         NEW.program_id IS DISTINCT FROM OLD.program_id OR
         NEW.academic_year IS DISTINCT FROM OLD.academic_year OR
         NEW.semester IS DISTINCT FROM OLD.semester
       ) THEN
      RAISE EXCEPTION 'لا يمكن تعديل بيانات أرشيف مجمّد. يُسمح فقط بتحديث الحالة وعدد التصديرات.';
    END IF;
    RETURN NEW;
  END IF;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_frozen_archive ON public.archives;
CREATE TRIGGER trg_protect_frozen_archive
  BEFORE UPDATE OR DELETE ON public.archives
  FOR EACH ROW EXECUTE FUNCTION public.protect_frozen_archive();

-- 2. Audit log
CREATE TABLE IF NOT EXISTS public.archive_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created','frozen','published','unfrozen','exported','deleted','updated')),
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_archive_audit_archive ON public.archive_audit_log(archive_id);
CREATE INDEX IF NOT EXISTS idx_archive_audit_performed_at ON public.archive_audit_log(performed_at DESC);

ALTER TABLE public.archive_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and dean view audit log" ON public.archive_audit_log;
CREATE POLICY "Admins and dean view audit log"
  ON public.archive_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dean'::app_role));

DROP POLICY IF EXISTS "Authenticated can insert audit log" ON public.archive_audit_log;
CREATE POLICY "Authenticated can insert audit log"
  ON public.archive_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Updated RLS for archives - allow coordinators to create/update drafts for their program
DROP POLICY IF EXISTS "Coordinators can manage program archive drafts" ON public.archives;
CREATE POLICY "Coordinators can manage program archive drafts"
  ON public.archives
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role_in_program(auth.uid(), 'coordinator'::app_role, program_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role_in_program(auth.uid(), 'coordinator'::app_role, program_id)
  );

-- updated_at trigger via existing function (sync_archive_frozen_state already updates it)
