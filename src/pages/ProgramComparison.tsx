import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ProgramComparison from "@/components/ProgramComparison";

const ProgramComparisonPage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">مقارنة البرامج</h1>
              <p className="text-sm text-muted-foreground">
                قارن أداء البرامج الأكاديمية المختلفة
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ProgramComparison />
      </main>
    </div>
  );
};

export default ProgramComparisonPage;
