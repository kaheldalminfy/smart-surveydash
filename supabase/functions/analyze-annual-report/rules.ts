export function canAnalyzeProgram(roles: { role: string; program_id: string | null }[], programId: string) {
  return roles.some(r => r.role === "admin" || r.role === "dean" ||
    ((r.role === "coordinator" || r.role === "program_manager") && r.program_id === programId));
}