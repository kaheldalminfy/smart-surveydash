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
  name: "list_recommendations",
  title: "List recommendations",
  description: "List quality recommendations visible to the signed-in user, optionally filtered by status or program.",
  inputSchema: {
    status: z.string().nullable().describe("Filter by recommendation status."),
    program_id: z.string().uuid().nullable().describe("Filter by program UUID."),
    limit: z.number().int().min(1).max(200).nullable().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, program_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = sb(ctx)
      .from("recommendations")
      .select("id, program_id, status, created_at", { count: "exact" });
    if (status) q = q.eq("status", status);
    if (program_id) q = q.eq("program_id", program_id);
    const { data, count, error } = await q.order("created_at", { ascending: false }).limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify({ total: count, items: data }) }],
      structuredContent: { total: count ?? 0, items: data ?? [] },
    };
  },
});
