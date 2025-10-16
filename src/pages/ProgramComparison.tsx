import ProgramComparison from "@/components/ProgramComparison";

const ProgramComparisonPage = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold">مقارنة البرامج</h1>
            <p className="text-sm text-muted-foreground">
              قارن أداء البرامج الأكاديمية المختلفة
            </p>
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
