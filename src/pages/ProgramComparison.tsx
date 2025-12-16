import ProgramComparison from "@/components/ProgramComparison";
import DashboardButton from "@/components/DashboardButton";

const ProgramComparisonPage = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <DashboardButton />
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
