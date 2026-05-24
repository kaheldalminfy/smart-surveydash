import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, X, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS_AR = [
  "كم شكوى حُلّت هذا الفصل؟",
  "ما متوسط تقييمات البرامج هذا العام؟",
  "كم استبيان نشط حالياً؟",
  "ما البرامج ذات أعلى عدد توصيات معلقة؟",
];
const SUGGESTIONS_EN = [
  "How many complaints were resolved this semester?",
  "What are program rating averages this year?",
  "How many active surveys do we have?",
  "Which programs have the most pending recommendations?",
];

export default function AICopilotWidget() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-copilot", { body: { messages: next } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([...next, { role: "assistant", content: data.reply || "—" }]);
    } catch (e: any) {
      toast({ title: language === "ar" ? "خطأ" : "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const suggestions = language === "ar" ? SUGGESTIONS_AR : SUGGESTIONS_EN;

  return (
    <>
      <Button
        onClick={() => setOpen((v) => !v)}
        size="lg"
        className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg h-14 w-14 p-0 bg-gradient-to-br from-primary to-purple-600 hover:scale-105 transition-transform"
        aria-label="AI Copilot"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </Button>

      {open && (
        <Card className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-8rem)] flex flex-col shadow-2xl border-primary/20">
          <div className="flex items-center gap-2 p-4 border-b bg-gradient-to-r from-primary/10 to-purple-500/10">
            <Bot className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{language === "ar" ? "المساعد الذكي" : "AI Copilot"}</h3>
              <p className="text-xs text-muted-foreground">{language === "ar" ? "اسأل عن أي إحصائيات" : "Ask about any stats"}</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">{language === "ar" ? "أمثلة:" : "Try:"}</p>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-start text-sm p-2 rounded-md bg-muted hover:bg-muted/70 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`rounded-lg px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center"><Bot className="h-4 w-4" /></div>
                <div className="bg-muted rounded-lg px-3 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="p-3 border-t flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={language === "ar" ? "اكتب سؤالك..." : "Ask a question..."}
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      )}
    </>
  );
}
