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
  name: "list_complaints",
  title: "List complaints",
  description: "List complaints visible to the signed-in user, optionally filtered by status, program, academic year or semester.",
  inputSchema: {
    status: z.enum(["pending", "in_progress", "resolved"]).nullable().describe("Filter by complaint status."),
    program_id: z.string().uuid().nullable().describe("Filter by program UUID."),
    academic_year: z.string().nullable().describe("Filter by academic year."),
    semester: z.string().nullable().describe("Filter by semester."),
    limit: z.number().int().min(1).max(200).nullable().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, program_id, academic_year, semester, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = sb(ctx)
      .from("complaints")
      .select("id, title, status, program_id, academic_year, semester, created_at", { count: "exact" });
    if (status) q = q.eq("status", status);
    if (program_id) q = q.eq("program_id", program_id);
    if (academic_year) q = q.eq("academic_year", academic_year);
    if (semester) q = q.eq("semester", semester);
    const { data, count, error } = await q.order("created_at", { ascending: false }).limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify({ total: count, items: data }) }],
      structuredContent: { total: count ?? 0, items: data ?? [] },
    };
  },
});
