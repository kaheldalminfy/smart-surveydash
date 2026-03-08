import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Unauthorized - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all datasets (read-only)
    const datasets: Record<string, { path: string; data: unknown[] }> = {};

    const tables = [
      { name: "surveys", path: "surveys/surveys.json" },
      { name: "questions", path: "surveys/questions.json" },
      { name: "responses", path: "surveys/responses.json" },
      { name: "answers", path: "surveys/answers.json" },
      { name: "reports", path: "surveys/reports.json" },
      { name: "recommendations", path: "surveys/recommendations.json" },
      { name: "programs", path: "reference/programs.json" },
      { name: "courses", path: "reference/courses.json" },
      { name: "survey_courses", path: "reference/survey_courses.json" },
      { name: "survey_templates", path: "reference/survey_templates.json" },
    ];

    for (const table of tables) {
      let allRows: unknown[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabaseAdmin
          .from(table.name)
          .select("*")
          .range(offset, offset + pageSize - 1);

        if (error) {
          console.error(`Error fetching ${table.name}:`, error);
          break;
        }

        if (data && data.length > 0) {
          allRows = allRows.concat(data);
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      datasets[table.name] = { path: table.path, data: allRows };
    }

    // Build manifest
    const manifest = {
      backup_format_version: "1.0",
      generated_at: new Date().toISOString(),
      generated_by: user.email,
      environment: Deno.env.get("SUPABASE_URL") ? "cloud" : "unknown",
      datasets: tables.map((t) => ({
        name: t.name,
        path: t.path,
        record_count: datasets[t.name]?.data?.length ?? 0,
      })),
      total_records: Object.values(datasets).reduce((sum, d) => sum + d.data.length, 0),
    };

    // Create ZIP
    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    for (const table of tables) {
      const ds = datasets[table.name];
      zip.file(ds.path, JSON.stringify(ds.data, null, 2));
    }

    const zipBuffer = await zip.generateAsync({ type: "uint8array" });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `backup-survey-data-${timestamp}.zip`;

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Backup export error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
