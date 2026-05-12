import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } },
        );
        const data = await res.json();
        if (!res.ok) {
          setState({ kind: "invalid" });
          return;
        }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setState({ kind: "already" });
          return;
        }
        setState({ kind: "valid" });
      } catch (e: any) {
        setState({ kind: "error", message: e.message ?? "Network error" });
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    const { data, error } = await supabase.functions.invoke(
      "handle-email-unsubscribe",
      { body: { token } },
    );
    if (error) {
      setState({ kind: "error", message: error.message });
      return;
    }
    if ((data as any)?.success || (data as any)?.reason === "already_unsubscribed") {
      setState({ kind: "done" });
    } else {
      setState({ kind: "error", message: "Unable to unsubscribe" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">إلغاء الاشتراك / Unsubscribe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {state.kind === "loading" && (
            <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
          )}
          {state.kind === "invalid" && (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle /> <p>رابط غير صالح / Invalid or expired link</p>
            </div>
          )}
          {state.kind === "already" && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <CheckCircle2 /> <p>تم إلغاء اشتراكك مسبقًا / You are already unsubscribed</p>
            </div>
          )}
          {state.kind === "valid" && (
            <>
              <p>هل تريد إيقاف استلام رسائل البريد الإلكتروني من المنصة؟</p>
              <p className="text-sm text-muted-foreground">Stop receiving emails from this platform?</p>
              <Button onClick={confirm} className="w-full">تأكيد إلغاء الاشتراك / Confirm unsubscribe</Button>
            </>
          )}
          {state.kind === "submitting" && (
            <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
          )}
          {state.kind === "done" && (
            <div className="flex flex-col items-center gap-2 text-primary">
              <CheckCircle2 /> <p>تم إلغاء اشتراكك بنجاح / You have been unsubscribed</p>
            </div>
          )}
          {state.kind === "error" && (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle /> <p>{state.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
