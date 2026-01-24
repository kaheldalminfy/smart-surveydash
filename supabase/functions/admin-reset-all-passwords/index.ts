import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin secret key for this sensitive operation
    const { adminSecret } = await req.json();
    
    // Simple secret check - in production use a more secure method
    const expectedSecret = Deno.env.get("ADMIN_RESET_SECRET") || "limu-admin-2024";
    
    if (adminSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Invalid admin secret" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const defaultPassword = "123456789";

    // Get all users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    const results = [];
    const errors = [];

    // Reset password for each user
    for (const user of users) {
      try {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: defaultPassword,
        });

        if (updateError) {
          errors.push({ userId: user.id, email: user.email, error: updateError.message });
        } else {
          results.push({ userId: user.id, email: user.email, success: true });
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        errors.push({ userId: user.id, email: user.email, error: errMsg });
      }
    }

    // Update all profiles to force password change
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ force_password_change: true })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (profileError) {
      console.error("Error updating profiles:", profileError);
    }

    console.log(`Password reset completed. Success: ${results.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `تم إعادة تعيين كلمات المرور لـ ${results.length} مستخدم`,
        totalUsers: users.length,
        successCount: results.length,
        errorCount: errors.length,
        results,
        errors 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in admin-reset-all-passwords function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
