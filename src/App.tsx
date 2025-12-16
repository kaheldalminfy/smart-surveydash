import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SurveyDesigner from "./pages/SurveyDesigner";
import Surveys from "./pages/Surveys";
import Reports from "./pages/Reports";
import TakeSurvey from "./pages/TakeSurvey";
import SurveyComplete from "./pages/SurveyComplete";
import Complaints from "./pages/Complaints";
import SubmitComplaint from "./pages/SubmitComplaint";
import ComplaintSubmitted from "./pages/ComplaintSubmitted";
import Recommendations from "./pages/Recommendations";
import Archives from "./pages/Archives";
import ProgramComparison from "./pages/ProgramComparison";
import Users from "./pages/Users";
import SystemSettings from "./pages/SystemSettings";
import AcademicCalendar from "./pages/AcademicCalendar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/take/:id" element={<TakeSurvey />} />
            <Route path="/survey-complete" element={<SurveyComplete />} />
            <Route path="/submit-complaint" element={<SubmitComplaint />} />
            <Route path="/complaint-submitted" element={<ComplaintSubmitted />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
            <Route path="/surveys/new" element={<ProtectedRoute><SurveyDesigner /></ProtectedRoute>} />
            <Route path="/surveys/edit/:id" element={<ProtectedRoute><SurveyDesigner /></ProtectedRoute>} />
            <Route path="/reports/:id" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
            <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
            <Route path="/archives" element={<ProtectedRoute><Archives /></ProtectedRoute>} />
            <Route path="/comparison" element={<ProtectedRoute><ProgramComparison /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/system-settings" element={<ProtectedRoute><SystemSettings /></ProtectedRoute>} />
            <Route path="/academic-calendar" element={<ProtectedRoute><AcademicCalendar /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
