const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bulk password replacement previously assigned undisclosed random passwords
// to every account, including administrators, which could lock out the entire
// system. Keep the endpoint for deployment compatibility but fail closed. The
// supported per-user reset flow is manage-user / ResetPasswordDialog.
Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      error: "Bulk password reset is disabled. Use the audited per-user reset flow.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
