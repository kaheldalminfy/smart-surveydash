import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF, exportToExcel, captureChartAsImage, generatePDFBlob } from "@/utils/exportReport";
import { PDFPreviewDialog } from "@/components/PDFPreviewDialog";
import { MCQ_COLORS } from "@/components/reports/reportConstants";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportMetadataCard } from "@/components/reports/ReportMetadataCard";
import { ReportStatisticsCards } from "@/components/reports/ReportStatisticsCards";
import { ReportFilterCard } from "@/components/reports/ReportFilterCard";
import { QuestionsSummaryChart } from "@/components/reports/QuestionsSummaryChart";
import { QuestionAnalysisSection } from "@/components/reports/QuestionAnalysisSection";
import { RecommendationsCard } from "@/components/reports/RecommendationsCard";
import { ReportDeleteDialog } from "@/components/reports/ReportDeleteDialog";

const Reports = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [report, setReport] = useState<any>(null);
  const [survey, setSurvey] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [reportStatus, setReportStatus] = useState("responding");
  const [collegeLogo, setCollegeLogo] = useState("");
  const [collegeName, setCollegeName] = useState("كلية العلوم الإنسانية والاجتماعية");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editRecommendationsOpen, setEditRecommendationsOpen] = useState(false);
  const [editedRecommendations, setEditedRecommendations] = useState("");
  const [detailedAnswers, setDetailedAnswers] = useState<any[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [allResponses, setAllResponses] = useState<any[]>([]);
  const [filterQuestion, setFilterQuestion] = useState<string>("");
  const [filterValues, setFilterValues] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [manualEnrollment, setManualEnrollment] = useState<string>("");
  const [courseRecommendations, setCourseRecommendations] = useState<Record<string, string>>({});
  const [filteredResponseCount, setFilteredResponseCount] = useState(0);
  const [coordinatorName, setCoordinatorName] = useState("");

  useEffect(() => {
    loadReport();
    loadSettings();
    if (id) loadDetailedAnswers();
  }, [id]);

  const loadReport = async () => {
    try {
      const { data: reportData, error } = await supabase
        .from("reports")
        .select("*, surveys(title, program_id, created_by, target_enrollment, programs(name))")
        .eq("survey_id", id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error loading report:", error);
      }

      if (reportData) {
        setReport(reportData);
        setSurvey(reportData.surveys);
        setSemester(reportData.semester || "");
        setAcademicYear(reportData.academic_year || "");
        setReportStatus(reportData.status || "responding");
        setEditedRecommendations(reportData.recommendations_text || "");

        const createdBy = reportData.surveys?.created_by;
        if (createdBy) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", createdBy)
            .single();

          if (profile) {
            if (profile.full_name && profile.full_name.trim()) {
              setCoordinatorName(profile.full_name.trim());
            } else if (profile.email) {
              const namePart = profile.email.split('@')[0] || '';
              const cleanName = namePart.replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();
              setCoordinatorName(cleanName);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const { data: logoData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "college_logo")
      .single();

    if (logoData?.value) {
      setCollegeLogo(logoData.value);
    }

    const { data: nameData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "college_name")
      .single();

    if (nameData?.value) {
      setCollegeName(nameData.value);
    }
  };

  const loadDetailedAnswers = async () => {
    try {
      const { data: questions, error: qError } = await supabase
        .from("questions")
        .select("*")
        .eq("survey_id", id)
        .neq("type", "section")
        .order("order_index");

      if (qError) throw qError;

      const { data: responses, error: rError } = await supabase
        .from("responses")
        .select("*, answers(*)")
        .eq("survey_id", id);

      if (rError) throw rError;

      setAllQuestions(questions || []);
      setAllResponses(responses || []);

      processDataWithFilter(questions || [], responses || [], "", []);
    } catch (error) {
      console.error("Error loading detailed answers:", error);
    }
  };

  const processDataWithFilter = (
    questions: any[],
    responses: any[],
    filterQ: string,
    filterVals: string[]
  ) => {
    let filteredResponses = responses;

    if (filterQ && filterVals.length > 0) {
      const normalizedFilterVals = filterVals.map(v => String(v).trim());

      filteredResponses = filteredResponses.filter(response => {
        const answer = response.answers?.find((a: any) => a.question_id === filterQ);
        if (!answer) return false;

        const answerValueNormalized = String(answer.value || '').trim();
        const numericValueNormalized = String(answer.numeric_value || '').trim();

        return normalizedFilterVals.includes(answerValueNormalized) ||
               normalizedFilterVals.includes(numericValueNormalized);
      });
    }

    setFilteredResponseCount(filteredResponses.length);

    const processedData = questions.map((question) => {
      const answersForQuestion = filteredResponses.flatMap((response, index) => {
        const answer = response.answers?.find((a: any) => a.question_id === question.id);
        if (answer) {
          return {
            ...answer,
            respondent_number: index + 1,
            response_id: response.id,
            submitted_at: response.submitted_at,
          };
        }
        return [];
      }).filter(Boolean);

      let distribution: any[] = [];
      if (question.type === 'likert' || question.type === 'rating') {
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        answersForQuestion.forEach((a: any) => {
          if (a.numeric_value && counts[a.numeric_value] !== undefined) {
            counts[a.numeric_value]++;
          }
        });
        distribution = [
          { name: 'غير موافق بشدة', value: counts[1], fill: '#ef4444' },
          { name: 'غير موافق', value: counts[2], fill: '#f97316' },
          { name: 'محايد', value: counts[3], fill: '#eab308' },
          { name: 'موافق', value: counts[4], fill: '#22c55e' },
          { name: 'موافق بشدة', value: counts[5], fill: '#16a34a' },
        ];
      }

      let mean = 0;
      let stdDev = 0;
      if (question.type === 'likert' || question.type === 'rating') {
        const numericValues = answersForQuestion
          .filter((a: any) => a.numeric_value !== null)
          .map((a: any) => a.numeric_value);

        if (numericValues.length > 0) {
          mean = numericValues.reduce((sum: number, val: number) => sum + val, 0) / numericValues.length;
          const variance = numericValues.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / numericValues.length;
          stdDev = Math.sqrt(variance);
        }
      }

      let mcqDistribution: any[] = [];
      if (question.type === 'mcq' && question.options) {
        const rawOptions = question.options;
        const options = Array.isArray(rawOptions)
          ? rawOptions
          : (rawOptions?.choices && Array.isArray(rawOptions.choices))
            ? rawOptions.choices
            : [];
        const counts: Record<string, number> = {};
        options.forEach((opt: string) => { counts[String(opt).trim()] = 0; });
        answersForQuestion.forEach((a: any) => {
          const answerValue = String(a.value || '').trim();
          if (answerValue && counts[answerValue] !== undefined) {
            counts[answerValue]++;
          }
        });
        mcqDistribution = options.map((opt: string, i: number) => ({
          name: String(opt).trim(),
          value: counts[String(opt).trim()],
          fill: MCQ_COLORS[i % MCQ_COLORS.length],
        }));
      }

      let textResponses: string[] = [];
      if (question.type === 'text') {
        textResponses = answersForQuestion
          .filter((a: any) => a.value && a.value.trim())
          .map((a: any) => a.value);
      }

      return {
        ...question,
        answers: answersForQuestion,
        distribution,
        mcqDistribution,
        textResponses,
        mean: mean.toFixed(2),
        stdDev: stdDev.toFixed(2),
        responseCount: answersForQuestion.length,
      };
    });

    setDetailedAnswers(processedData);
  };

  const getFilterOptions = () => {
    if (!filterQuestion) return [];

    const question = allQuestions.find(q => q.id === filterQuestion);
    if (!question) return [];

    if (question.type === 'mcq' && question.options) {
      const options = question.options;
      if (Array.isArray(options)) return options.map((o: string) => String(o).trim());
      if (options.choices && Array.isArray(options.choices)) {
        return options.choices.map((choice: string) => String(choice).trim());
      }
      if (typeof options === 'string') {
        try {
          const parsed = JSON.parse(options);
          if (Array.isArray(parsed)) return parsed;
          if (parsed.choices) return parsed.choices;
        } catch {
          return [];
        }
      }
      return [];
    }

    if (question.type === 'likert' || question.type === 'rating') {
      return ['1', '2', '3', '4', '5'];
    }

    return [];
  };

  const hasAnswersData = allResponses.some(r => r.answers && r.answers.length > 0);

  const getSelectedCourseName = (): string => {
    if (!filterQuestion || filterValues.length === 0) return '';
    return filterValues[0] || '';
  };

  const handleFilterValueChange = (value: string) => {
    const newValues = filterValues.includes(value)
      ? filterValues.filter(v => v !== value)
      : [...filterValues, value];

    setFilterValues(newValues);
    processDataWithFilter(allQuestions, allResponses, filterQuestion, newValues);

    const courseName = newValues.length > 0 ? newValues[0] : '';
    if (courseName && courseRecommendations[courseName]) {
      setEditedRecommendations(courseRecommendations[courseName]);
    } else if (report?.recommendations_text) {
      setEditedRecommendations(report.recommendations_text);
    }
  };

  const handleFilterQuestionChange = (questionId: string) => {
    setFilterQuestion(questionId);
    setFilterValues([]);
    setManualEnrollment("");
    processDataWithFilter(allQuestions, allResponses, questionId, []);
  };

  const clearFilter = () => {
    setFilterQuestion("");
    setFilterValues([]);
    setManualEnrollment("");
    processDataWithFilter(allQuestions, allResponses, "", []);
    if (report?.recommendations_text) {
      setEditedRecommendations(report.recommendations_text);
    }
  };

  const saveReportMetadata = async () => {
    const { error } = await supabase
      .from("reports")
      .update({
        semester,
        academic_year: academicYear,
        status: reportStatus,
      })
      .eq("id", report.id);

    if (error) {
      toast({ title: "خطأ", description: "فشل حفظ بيانات التقرير", variant: "destructive" });
      return;
    }

    toast({ title: "تم الحفظ", description: "تم حفظ بيانات التقرير بنجاح" });
    loadReport();
  };

  const handleDeleteReport = async () => {
    const { error } = await supabase.from("reports").delete().eq("id", report.id);

    if (error) {
      toast({ title: "خطأ", description: "فشل في حذف التقرير", variant: "destructive" });
      return;
    }

    toast({ title: "تم الحذف", description: "تم حذف التقرير بنجاح" });
    navigate("/surveys");
  };

  const handleSaveRecommendations = async () => {
    const courseName = getSelectedCourseName();
    if (courseName) {
      setCourseRecommendations(prev => ({ ...prev, [courseName]: editedRecommendations }));
    }

    const { error } = await supabase
      .from("reports")
      .update({ recommendations_text: editedRecommendations })
      .eq("id", report.id);

    if (error) {
      toast({ title: "خطأ", description: "فشل في حفظ التوصيات", variant: "destructive" });
      return;
    }

    toast({ title: "تم الحفظ", description: courseName ? `تم حفظ التوصيات لمقرر "${courseName}"` : "تم حفظ التوصيات بنجاح" });
    setEditRecommendationsOpen(false);
    loadReport();
  };

  const handleSaveAndTransferRecommendations = async () => {
    if (!editedRecommendations.trim()) {
      toast({ title: "تنبيه", description: "لا توجد توصيات لنقلها", variant: "destructive" });
      return;
    }

    const courseName = getSelectedCourseName();
    if (courseName) {
      setCourseRecommendations(prev => ({ ...prev, [courseName]: editedRecommendations }));
    }

    const { error: saveError } = await supabase
      .from("reports")
      .update({ recommendations_text: editedRecommendations })
      .eq("id", report.id);

    if (saveError) {
      toast({ title: "خطأ", description: "فشل في حفظ التوصيات", variant: "destructive" });
      return;
    }

    const { data: existing } = await supabase
      .from("recommendations")
      .select("id")
      .eq("source_id", report.id)
      .eq("source_type", "survey")
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("recommendations")
        .update({
          description: editedRecommendations,
          title: `${survey?.title || ''}${courseName ? ` - ${courseName}` : ''}`,
          academic_year: academicYear || null,
          semester: semester || null,
        })
        .eq("id", existing.id);

      if (updateError) {
        toast({ title: "خطأ", description: "فشل في تحديث التوصيات في المتابعة", variant: "destructive" });
        return;
      }

      toast({ title: "تم التحديث", description: "تم تحديث التوصيات في صفحة المتابعة" });
    } else {
      const { error: insertError } = await supabase
        .from("recommendations")
        .insert({
          title: `${survey?.title || ''}${courseName ? ` - ${courseName}` : ''}`,
          description: editedRecommendations,
          program_id: survey?.program_id || null,
          source_type: "survey",
          source_id: report.id,
          academic_year: academicYear || null,
          semester: semester || null,
          status: "pending",
          priority: "medium",
        });

      if (insertError) {
        toast({ title: "خطأ", description: "فشل في نقل التوصيات", variant: "destructive" });
        return;
      }

      toast({ title: "تم النقل", description: "تم نقل التوصيات إلى صفحة متابعة التوصيات بنجاح" });
    }

    setEditRecommendationsOpen(false);
    loadReport();
  };

  const buildFilterInfo = () => {
    const courseName = getSelectedCourseName();
    const manualNum = parseInt(manualEnrollment);
    if (!courseName) return undefined;
    return {
      courseName,
      manualEnrollment: !isNaN(manualNum) && manualNum > 0 ? manualNum : undefined,
      filteredCount: computedFilteredResponsesCount,
    };
  };

  const preparePDFData = () => {
    const courseName = getSelectedCourseName();
    const pdfAnswers = filterQuestion
      ? detailedAnswers.filter(q => q.id !== filterQuestion)
      : detailedAnswers;

    const likertRating = pdfAnswers.filter(q => q.type === 'likert' || q.type === 'rating');
    const overallMean = likertRating.length > 0
      ? likertRating.reduce((sum: number, q: any) => sum + (parseFloat(q.mean) || 0), 0) / likertRating.length
      : 0;
    const overallStdDev = likertRating.length > 0
      ? likertRating.reduce((sum: number, q: any) => sum + (parseFloat(q.stdDev) || 0), 0) / likertRating.length
      : 0;

    const manualNum = parseInt(manualEnrollment);
    const targetEnrollment = (!isNaN(manualNum) && manualNum > 0) ? manualNum : (survey?.target_enrollment || 0);
    const responsesCount = filterQuestion && filterValues.length > 0 ? computedFilteredResponsesCount : allResponses.length;
    const responseRate = targetEnrollment > 0
      ? Math.min(100, Math.round((responsesCount / targetEnrollment) * 100))
      : 0;

    const textResponses = pdfAnswers
      .filter((q: any) => q.type === 'text' && q.textResponses.length > 0)
      .map((q: any) => ({ question: q.text, responses: q.textResponses }));

    const stats: any = {
      totalResponses: responsesCount,
      targetEnrollment,
      responseRate,
      overallMean,
      overallStdDev,
      questionStats: pdfAnswers.map((q: any) => ({
        question: q.text,
        type: q.type,
        mean: parseFloat(q.mean) || 0,
        stdDev: parseFloat(q.stdDev) || 0,
        responseCount: q.responseCount,
        distribution: q.distribution,
        mcqDistribution: q.mcqDistribution,
      })),
    };

    if (!courseName && allQuestions.length > 0 && allResponses.length > 0) {
      const courseQuestion = allQuestions.find(q =>
        q.type === 'mcq' && (
          (q.text && (q.text.includes('مقرر') || q.text.includes('المقرر') || q.text.includes('المادة'))) ||
          false
        )
      ) || allQuestions.find(q => q.type === 'mcq');

      if (courseQuestion) {
        const courseNames = new Set<string>();
        allResponses.forEach((response: any) => {
          const answer = response.answers?.find((a: any) => a.question_id === courseQuestion.id);
          if (answer?.value && String(answer.value).trim()) {
            courseNames.add(String(answer.value).trim());
          }
        });

        const likertQuestions = allQuestions.filter(q =>
          (q.type === 'likert' || q.type === 'rating') && q.id !== courseQuestion.id
        );

        const coursesSummary: Array<{
          courseName: string;
          responseCount: number;
          overallMean: number;
          questionMeans: Array<{ question: string; mean: number }>;
        }> = [];

        courseNames.forEach(cName => {
          const courseResponses = allResponses.filter((response: any) => {
            const answer = response.answers?.find((a: any) => a.question_id === courseQuestion.id);
            return answer && String(answer.value || '').trim() === cName;
          });

          const questionMeans: Array<{ question: string; mean: number }> = [];
          let totalMean = 0;
          let meanCount = 0;

          likertQuestions.forEach((q: any) => {
            const numericValues = courseResponses
              .map((r: any) => {
                const a = r.answers?.find((a: any) => a.question_id === q.id);
                return a?.numeric_value;
              })
              .filter((v: any) => v !== null && v !== undefined);

            if (numericValues.length > 0) {
              const mean = numericValues.reduce((s: number, v: number) => s + v, 0) / numericValues.length;
              questionMeans.push({ question: q.text, mean });
              totalMean += mean;
              meanCount++;
            }
          });

          const overallCourseMean = meanCount > 0 ? totalMean / meanCount : 0;

          coursesSummary.push({
            courseName: cName,
            responseCount: courseResponses.length,
            overallMean: overallCourseMean,
            questionMeans,
          });
        });

        coursesSummary.sort((a, b) => b.overallMean - a.overallMean);
        stats.coursesSummary = coursesSummary;
      }
    }

    const reportForPDF = { ...report };
    if (courseName && courseRecommendations[courseName]) {
      reportForPDF.recommendations_text = courseRecommendations[courseName];
    }

    return { stats, textResponses, pdfAnswers, reportForPDF };
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const courseName = getSelectedCourseName();
      const { data, error } = await supabase.functions.invoke("analyze-survey", {
        body: { surveyId: id, courseName: courseName || undefined },
      });

      if (error) throw error;

      toast({ title: "تم إنشاء التقرير بنجاح", description: "تم تحليل البيانات بالذكاء الاصطناعي" });
      loadReport();
    } catch (error) {
      toast({ title: "خطأ", description: "حدث خطأ أثناء إنشاء التقرير", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    toast({ title: "جاري التصدير", description: "يتم التقاط الرسوم البيانية..." });

    try {
      const { stats, textResponses, pdfAnswers, reportForPDF } = preparePDFData();
      const filterInfo = buildFilterInfo();

      const chartImages: Array<{ id: string; dataUrl: string; title: string; type: 'likert' | 'mcq' | 'summary' }> = [];
      const summaryChart = await captureChartAsImage('summary-chart', 'ملخص متوسطات الأسئلة', 'summary');
      if (summaryChart) chartImages.push(summaryChart);

      for (let i = 0; i < pdfAnswers.length; i++) {
        const q = pdfAnswers[i];
        if (q.type === 'likert' || q.type === 'rating') {
          const chart = await captureChartAsImage(`chart-likert-${q.id}`, `س${i + 1}: ${q.text.substring(0, 50)}`, 'likert');
          if (chart) chartImages.push(chart);
        } else if (q.type === 'mcq') {
          const chart = await captureChartAsImage(`chart-mcq-${q.id}`, `س${i + 1}: ${q.text.substring(0, 50)}`, 'mcq');
          if (chart) chartImages.push(chart);
        }
      }

      await exportToPDF(reportForPDF, survey, stats, collegeLogo, chartImages, textResponses, collegeName, filterInfo, coordinatorName || undefined);
      toast({ title: "تم التصدير", description: "تم تصدير التقرير بنجاح" });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء تصدير التقرير", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreviewPDF = async () => {
    setIsGeneratingPreview(true);
    setPreviewOpen(true);
    setPdfBlob(null);

    try {
      const { stats, textResponses, reportForPDF } = preparePDFData();
      const filterInfo = buildFilterInfo();

      const blob = await generatePDFBlob(reportForPDF, survey, stats, collegeLogo, [], textResponses, collegeName, filterInfo, coordinatorName || undefined);
      setPdfBlob(blob);
    } catch (error) {
      console.error("Preview error:", error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء إنشاء المعاينة", variant: "destructive" });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleExportExcel = () => {
    const likertRatingQuestions = detailedAnswers.filter(q => q.type === 'likert' || q.type === 'rating');
    const overallMean = likertRatingQuestions.length > 0
      ? likertRatingQuestions.reduce((sum, q) => sum + (parseFloat(q.mean) || 0), 0) / likertRatingQuestions.length
      : 0;

    const overallStdDev = likertRatingQuestions.length > 0
      ? likertRatingQuestions.reduce((sum, q) => sum + (parseFloat(q.stdDev) || 0), 0) / likertRatingQuestions.length
      : 0;

    const targetEnrollment = survey?.target_enrollment || 0;
    const responseRate = targetEnrollment > 0
      ? Math.min(100, Math.round((allResponses.length / targetEnrollment) * 100))
      : 0;

    const stats = {
      totalResponses: allResponses.length,
      targetEnrollment,
      responseRate,
      overallMean,
      overallStdDev,
      questionStats: detailedAnswers.map(q => ({
        question: q.text,
        type: q.type,
        mean: parseFloat(q.mean) || 0,
        stdDev: parseFloat(q.stdDev) || 0,
        responseCount: q.responseCount,
      })),
    };

    const textResponses = detailedAnswers
      .filter(q => q.type === 'text' && q.textResponses.length > 0)
      .map(q => ({
        question: q.text,
        responses: q.textResponses,
      }));

    exportToExcel(report, survey, stats, textResponses);
    toast({ title: "تم التصدير", description: "تم تصدير ملف Excel بنجاح" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>لا يوجد تقرير</CardTitle>
            <CardDescription>لم يتم إنشاء تقرير لهذا الاستبيان بعد</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={generateReport} disabled={isGenerating} className="w-full">
              <Sparkles className="h-4 w-4 ml-2" />
              {isGenerating ? "جاري إنشاء التقرير..." : "إنشاء تقرير بالذكاء الاصطناعي"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/surveys")} className="w-full">
              <ArrowRight className="h-4 w-4 ml-2" />
              العودة إلى الاستبيانات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalResponses = allResponses.length;
  const likertRatingQuestions = detailedAnswers.filter(q => q.type === 'likert' || q.type === 'rating');
  const overallMean = likertRatingQuestions.length > 0
    ? likertRatingQuestions.reduce((sum, q) => sum + (parseFloat(q.mean) || 0), 0) / likertRatingQuestions.length
    : 0;
  const totalTextResponses = detailedAnswers
    .filter(q => q.type === 'text')
    .reduce((sum, q) => sum + q.textResponses.length, 0);
  const computedFilteredResponsesCount = filterQuestion && filterValues.length > 0
    ? filteredResponseCount
    : totalResponses;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <ReportHeader
        surveyTitle={survey?.title}
        programName={survey?.programs?.name}
        isGenerating={isGenerating}
        isExporting={isExporting}
        isGeneratingPreview={isGeneratingPreview}
        onRegenerate={generateReport}
        onPreviewPDF={handlePreviewPDF}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onDelete={() => setDeleteDialogOpen(true)}
      />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <ReportMetadataCard
          semester={semester}
          academicYear={academicYear}
          reportStatus={reportStatus}
          onSemesterChange={setSemester}
          onAcademicYearChange={setAcademicYear}
          onReportStatusChange={setReportStatus}
          onSave={saveReportMetadata}
        />

        <ReportStatisticsCards
          filteredResponsesCount={computedFilteredResponsesCount}
          totalResponses={totalResponses}
          targetEnrollment={survey?.target_enrollment || 0}
          overallMean={overallMean}
          questionsCount={detailedAnswers.length}
          totalTextResponses={totalTextResponses}
          hasFilter={!!(filterQuestion && filterValues.length > 0)}
          hasAnswersData={hasAnswersData}
        />

        <ReportFilterCard
          allQuestions={allQuestions}
          hasAnswersData={hasAnswersData}
          filterQuestion={filterQuestion}
          filterValues={filterValues}
          filteredResponsesCount={computedFilteredResponsesCount}
          manualEnrollment={manualEnrollment}
          onFilterQuestionChange={handleFilterQuestionChange}
          onFilterValueChange={handleFilterValueChange}
          onClearFilter={clearFilter}
          onManualEnrollmentChange={setManualEnrollment}
          getFilterOptions={getFilterOptions}
        />

        <QuestionsSummaryChart likertRatingQuestions={likertRatingQuestions} />

        <QuestionAnalysisSection
          detailedAnswers={detailedAnswers}
          totalResponses={totalResponses}
        />

        <RecommendationsCard
          recommendationsText={report.recommendations_text}
          editRecommendationsOpen={editRecommendationsOpen}
          editedRecommendations={editedRecommendations}
          onOpenEdit={() => setEditRecommendationsOpen(true)}
          onCloseEdit={() => setEditRecommendationsOpen(false)}
          onEditedRecommendationsChange={setEditedRecommendations}
          onSave={handleSaveRecommendations}
          onSaveAndTransfer={handleSaveAndTransferRecommendations}
        />
      </main>

      <ReportDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteReport}
      />

      <PDFPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        pdfBlob={pdfBlob}
        isGenerating={isGeneratingPreview}
        onDownload={handleExportPDF}
      />
    </div>
  );
};

export default Reports;
