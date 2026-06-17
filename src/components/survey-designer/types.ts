export interface Question {
  id: number;
  text: string;
  type: string;
  orderIndex: number;
  options?: string[];
  required?: boolean;
}

export interface SurveyFormData {
  title: string;
  description: string;
  reportType: "course_evaluation" | "workshop" | "program" | "general";
  programId: string;
  isAnonymous: boolean;
  startDate: string;
  endDate: string;
  semester: string;
  academicYear: string;
  targetEnrollment: string;
}
