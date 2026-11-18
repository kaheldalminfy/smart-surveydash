import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type RoleRow = { role: string; program_id: string | null };
export type FrameworkType = "institutional" | "programmatic";

/** Mirrors public.can_edit_accreditation_scope in the database. */
export function canEditScope(roles: RoleRow[], programId: string | null): boolean {
  if (roles.some((r) => r.role === "admin")) return true;
  if (programId === null) return roles.some((r) => r.role === "dean");
  return roles.some((r) => (r.role === "coordinator" || r.role === "program_manager") && r.program_id === programId);
}

/** Programs a user may pick for a programmatic framework. */
export function selectablePrograms<T extends { id: string }>(roles: RoleRow[], all: T[]): T[] {
  if (roles.some((r) => r.role === "admin" || r.role === "dean")) return all;
  const own = new Set(roles.filter((r) => r.program_id).map((r) => r.program_id));
  return all.filter((p) => own.has(p.id));
}

export function academicYearOptions(now = new Date()): string[] {
  const end = now.getFullYear() + 1;
  const list: string[] = [];
  for (let y = end - 1; y >= 2025; y--) list.push(`${y}-${y + 1}`);
  return list;
}

export function currentAcademicYear(now = new Date()): string {
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

/** Program + academic year scope, persisted in the URL (?program=&year=). */
export function useAccreditationScope(frameworkType: FrameworkType | undefined) {
  const [params, setParams] = useSearchParams();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setReady(true); return; }
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from("user_roles").select("role,program_id").eq("user_id", user.id),
        supabase.from("programs").select("id,name").order("name"),
      ]);
      const rr = (r ?? []) as RoleRow[];
      setRoles(rr);
      setPrograms(selectablePrograms(rr, p ?? []));
      setReady(true);
    })();
  }, []);

  const year = params.get("year") || currentAcademicYear();
  const rawProgram = params.get("program");
  const programId = frameworkType === "institutional"
    ? null
    : (rawProgram && programs.some((p) => p.id === rawProgram) ? rawProgram : programs[0]?.id ?? null);

  const update = (next: { program?: string | null; year?: string }) => {
    const sp = new URLSearchParams(params);
    if (next.year !== undefined) sp.set("year", next.year);
    if (next.program !== undefined) { if (next.program) sp.set("program", next.program); else sp.delete("program"); }
    setParams(sp, { replace: true });
  };

  const canEdit = useMemo(
    () => ready && (frameworkType === "institutional" || programId !== null) && canEditScope(roles, programId),
    [ready, roles, programId, frameworkType],
  );

  const query = `?year=${encodeURIComponent(year)}${programId ? `&program=${programId}` : ""}`;
  return { ready, roles, programs, programId, year, canEdit, update, query };
}
