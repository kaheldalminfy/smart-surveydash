import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SurveyDesigner from "./pages/SurveyDesigner";
import Surveys from "./pages/Surveys";
import Reports from "./pages/Reports";
import TakeSurvey from "./pages/TakeSurvey";
import SurveyComplete from "./pages/SurveyComplete";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/surveys" element={<Surveys />} />
          <Route path="/surveys/new" element={<SurveyDesigner />} />
          <Route path="/reports/:id" element={<Reports />} />
          <Route path="/take/:id" element={<TakeSurvey />} />
          <Route path="/survey-complete" element={<SurveyComplete />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
