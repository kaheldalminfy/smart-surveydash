export const REPORT_TYPE_VALUES = ["course_evaluation", "workshop", "program", "general"] as const;

export type SurveyReportType = (typeof REPORT_TYPE_VALUES)[number];

export const DEFAULT_REPORT_TYPE: SurveyReportType = "course_evaluation";

type MaybeSurvey = {
  title?: string | null;
  survey_type?: string | null;
};

export interface ReportCopy {
  reportTitle: string;
  reportSubtitle: string;
  targetEntity: string;
  totalResponses: string;
  targetCount: string;
  targetHint: string;
  overallMean: string;
  performanceLevel: string;
  courseSummaryEnabled: boolean;
}

export const isSurveyReportType = (value: unknown): value is SurveyReportType =>
  typeof value === "string" && REPORT_TYPE_VALUES.includes(value as SurveyReportType);

export const inferSurveyReportType = (survey?: MaybeSurvey | null): SurveyReportType => {
  if (isSurveyReportType(survey?.survey_type)) {
    return survey.survey_type;
  }

  const title = (survey?.title || "").toLowerCase();
  if (
    title.includes("interpreting booth simulation workshop") ||
    title.includes("workshop") ||
    title.includes("\u0648\u0631\u0634\u0629") ||
    title.includes("ورشة")
  ) {
    return "workshop";
  }

  return DEFAULT_REPORT_TYPE;
};

export const getReportTypeOptions = (language: "ar" | "en") => [
  {
    value: "course_evaluation" as const,
    label: language === "ar" ? "تقييم مقرر" : "Course Evaluation",
    description: language === "ar" ? "تقرير مناسب للاستبيانات المرتبطة بمقرر دراسي" : "For course-related survey reports",
  },
  {
    value: "workshop" as const,
    label: language === "ar" ? "ورشة عمل / تدريب" : "Workshop / Training",
    description: language === "ar" ? "تقرير مناسب للورش والمحاكاة والتدريب" : "For workshops, simulations, and training sessions",
  },
  {
    value: "program" as const,
    label: language === "ar" ? "تقييم برنامج" : "Program Evaluation",
    description: language === "ar" ? "تقرير مناسب لتقييم برنامج أكاديمي" : "For academic program evaluation",
  },
  {
    value: "general" as const,
    label: language === "ar" ? "استبيان عام" : "General Survey",
    description: language === "ar" ? "تقرير عام لا يفترض مقررًا أو ورشة" : "For general-purpose survey reports",
  },
];

export const getReportTypeLabel = (reportType: SurveyReportType, language: "ar" | "en") =>
  getReportTypeOptions(language).find((option) => option.value === reportType)?.label ||
  getReportTypeOptions(language)[0].label;

export const getReportCopy = (reportType: SurveyReportType, language: "ar" | "en" = "ar") => {
  const ar = {
    course_evaluation: {
      reportTitle: "تقرير نتائج الاستبيان",
      reportSubtitle: "تقييم مقرر دراسي",
      targetEntity: "طالب",
      totalResponses: "إجمالي الاستجابات",
      targetCount: "العدد المستهدف",
      targetHint: "أدخل عدد الطلبة لحساب نسبة الاستجابة بدقة",
      overallMean: "المتوسط العام",
      performanceLevel: "مستوى الأداء",
      courseSummaryEnabled: true,
    },
    workshop: {
      reportTitle: "تقرير تقييم ورشة عمل",
      reportSubtitle: "ورشة عمل / تدريب",
      targetEntity: "مشارك",
      totalResponses: "إجمالي المشاركات",
      targetCount: "عدد المشاركين المستهدف",
      targetHint: "أدخل عدد المشاركين لحساب نسبة المشاركة بدقة",
      overallMean: "متوسط تقييم الورشة",
      performanceLevel: "مستوى التقييم",
      courseSummaryEnabled: false,
    },
    program: {
      reportTitle: "تقرير تقييم برنامج",
      reportSubtitle: "تقييم برنامج أكاديمي",
      targetEntity: "مشارك",
      totalResponses: "إجمالي الاستجابات",
      targetCount: "العدد المستهدف",
      targetHint: "أدخل العدد المستهدف لحساب نسبة الاستجابة",
      overallMean: "المتوسط العام",
      performanceLevel: "مستوى الأداء",
      courseSummaryEnabled: false,
    },
    general: {
      reportTitle: "تقرير استبيان عام",
      reportSubtitle: "استبيان عام",
      targetEntity: "مشارك",
      totalResponses: "إجمالي الاستجابات",
      targetCount: "العدد المستهدف",
      targetHint: "أدخل العدد المستهدف لحساب نسبة الاستجابة",
      overallMean: "المتوسط العام",
      performanceLevel: "مستوى التقييم",
      courseSummaryEnabled: false,
    },
  } satisfies Record<SurveyReportType, ReportCopy>;

  const en = {
    course_evaluation: {
      reportTitle: "Survey Results Report",
      reportSubtitle: "Course Evaluation",
      targetEntity: "student",
      totalResponses: "Total Responses",
      targetCount: "Target Enrollment",
      targetHint: "Enter enrolled student count for an accurate response rate",
      overallMean: "Overall Mean",
      performanceLevel: "Performance Level",
      courseSummaryEnabled: true,
    },
    workshop: {
      reportTitle: "Workshop Evaluation Report",
      reportSubtitle: "Workshop / Training",
      targetEntity: "participant",
      totalResponses: "Total Participant Responses",
      targetCount: "Target Participants",
      targetHint: "Enter participant count for an accurate participation rate",
      overallMean: "Workshop Rating Mean",
      performanceLevel: "Evaluation Level",
      courseSummaryEnabled: false,
    },
    program: {
      reportTitle: "Program Evaluation Report",
      reportSubtitle: "Academic Program Evaluation",
      targetEntity: "participant",
      totalResponses: "Total Responses",
      targetCount: "Target Count",
      targetHint: "Enter target count for response rate calculation",
      overallMean: "Overall Mean",
      performanceLevel: "Performance Level",
      courseSummaryEnabled: false,
    },
    general: {
      reportTitle: "General Survey Report",
      reportSubtitle: "General Survey",
      targetEntity: "participant",
      totalResponses: "Total Responses",
      targetCount: "Target Count",
      targetHint: "Enter target count for response rate calculation",
      overallMean: "Overall Mean",
      performanceLevel: "Evaluation Level",
      courseSummaryEnabled: false,
    },
  } satisfies Record<SurveyReportType, ReportCopy>;

  return (language === "ar" ? ar : en)[reportType];
};
