import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a cryptographically strong temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

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

    // Verify the requesting user is an admin via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    const results = [];
    const errors = [];

    // Reset password for each user with a unique strong password
    for (const user of users) {
      try {
        const tempPassword = generateTempPassword();
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: tempPassword,
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `تم إعادة تعيين كلمات المرور لـ ${results.length} مستخدم`,
        totalUsers: users.length,
        successCount: results.length,
        errorCount: errors.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in admin-reset-all-passwords function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
