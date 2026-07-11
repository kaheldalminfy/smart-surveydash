import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_surveys",
  title: "List surveys",
  description: "List surveys visible to the signed-in user, optionally filtered by status, academic year, semester, or program.",
  inputSchema: {
    status: z.enum(["draft", "active", "closed"]).nullable().describe("Filter by survey status."),
    academic_year: z.string().nullable().describe("Filter by academic year, e.g. 2025-2026."),
    semester: z.string().nullable().describe("Filter by semester."),
    program_id: z.string().uuid().nullable().describe("Filter by program UUID."),
    limit: z.number().int().min(1).max(200).nullable().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, academic_year, semester, program_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = sb(ctx)
      .from("surveys")
      .select("id, title, status, academic_year, semester, program_id, created_at", { count: "exact" });
    if (status) q = q.eq("status", status);
    if (academic_year) q = q.eq("academic_year", academic_year);
    if (semester) q = q.eq("semester", semester);
    if (program_id) q = q.eq("program_id", program_id);
    const { data, count, error } = await q.order("created_at", { ascending: false }).limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify({ total: count, items: data }) }],
      structuredContent: { total: count ?? 0, items: data ?? [] },
    };
  },
});
