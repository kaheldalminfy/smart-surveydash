import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SurveyDesigner = lazy(() => import("./pages/SurveyDesigner"));
const Surveys = lazy(() => import("./pages/Surveys"));
const Reports = lazy(() => import("./pages/Reports"));
const TakeSurvey = lazy(() => import("./pages/TakeSurvey"));
const SurveyComplete = lazy(() => import("./pages/SurveyComplete"));
const Complaints = lazy(() => import("./pages/Complaints"));
const SubmitComplaint = lazy(() => import("./pages/SubmitComplaint"));
const ComplaintSubmitted = lazy(() => import("./pages/ComplaintSubmitted"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const Archives = lazy(() => import("./pages/Archives"));
const ProgramComparison = lazy(() => import("./pages/ProgramComparison"));
const AnnualProgramReport = lazy(() => import("./pages/AnnualProgramReport"));
const Users = lazy(() => import("./pages/Users"));
const SystemSettings = lazy(() => import("./pages/SystemSettings"));
const AcademicCalendar = lazy(() => import("./pages/AcademicCalendar"));
const Accreditation = lazy(() => import("./pages/Accreditation"));
const AccreditationFramework = lazy(() => import("./pages/AccreditationFramework"));
const IndicatorDetails = lazy(() => import("./pages/IndicatorDetails"));
const BackupExport = lazy(() => import("./pages/BackupExport"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={(
            <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-live="polite">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
            </div>
          )}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/take/:id" element={<TakeSurvey />} />
            <Route path="/survey-complete" element={<SurveyComplete />} />
            <Route path="/submit-complaint" element={<SubmitComplaint />} />
            <Route path="/complaint-submitted" element={<ComplaintSubmitted />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
            <Route path="/surveys/new" element={<ProtectedRoute><SurveyDesigner /></ProtectedRoute>} />
            <Route path="/surveys/edit/:id" element={<ProtectedRoute><SurveyDesigner /></ProtectedRoute>} />
            <Route path="/reports/:id" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
            <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
            <Route path="/archives" element={<ProtectedRoute allowedRoles={["admin", "dean", "coordinator", "program_manager"]}><Archives /></ProtectedRoute>} />
            <Route path="/comparison" element={<ProtectedRoute allowedRoles={["admin", "dean", "coordinator", "program_manager"]}><ProgramComparison /></ProtectedRoute>} />
            <Route path="/annual-program-report" element={<ProtectedRoute allowedRoles={["admin", "dean", "coordinator", "program_manager"]}><AnnualProgramReport /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allowedRoles={["admin"]}><Users /></ProtectedRoute>} />
            <Route path="/system-settings" element={<ProtectedRoute allowedRoles={["admin"]}><SystemSettings /></ProtectedRoute>} />
            <Route path="/academic-calendar" element={<ProtectedRoute allowedRoles={["admin", "dean", "coordinator", "program_manager"]}><AcademicCalendar /></ProtectedRoute>} />
            <Route path="/accreditation" element={<ProtectedRoute allowedRoles={["admin", "dean", "coordinator", "program_manager"]}><Accreditation /></ProtectedRoute>} />
            <Route path="/accreditation/framework/:id" element={<ProtectedRoute allowedRoles={["admin", "dean", "coordinator", "program_manager"]}><AccreditationFramework /></ProtectedRoute>} />
            <Route path="/accreditation/indicator/:id" element={<ProtectedRoute allowedRoles={["admin", "dean", "coordinator", "program_manager"]}><IndicatorDetails /></ProtectedRoute>} />
            <Route path="/backup-export" element={<ProtectedRoute allowedRoles={["admin"]}><BackupExport /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
