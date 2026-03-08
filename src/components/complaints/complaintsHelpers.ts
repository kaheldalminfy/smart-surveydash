import React from "react";

export interface Complaint {
  id: string;
  subject: string;
  description: string;
  type: string;
  complaint_category?: string;
  status: string;
  student_name?: string;
  student_email?: string;
  student_id?: string;
  complainant_type?: string;
  complainant_id?: string;
  complainant_academic_id?: string;
  complainant_job_id?: string;
  semester?: string;
  academic_year?: string;
  created_at: string;
  updated_at?: string;
  program_id?: string;
  programs?: { name: string };
  attachments?: any;
  resolution_notes?: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface Program {
  id: string;
  name: string;
}

export const statusOptions = [
  { value: "pending", label: "جديدة" },
  { value: "in_progress", label: "قيد الإجراء" },
  { value: "resolved", label: "تم الحل" },
];

export const getCategoryLabel = (category: string) => {
  const categories: Record<string, string> = {
    academic: "أكاديمي",
    administrative: "إداري",
    technical: "تقني",
    facility: "مرافق",
    other: "أخرى",
  };
  return categories[category] || category;
};

// Generate academic years (current year + 100 years ahead)
const currentYear = new Date().getFullYear();
export const academicYears = Array.from({ length: 101 }, (_, i) => {
  const startYear = currentYear + i;
  return `${startYear}-${startYear + 1}`;
});

// Static semester options
export const semesterOptions = ["خريف", "ربيع", "صيفي"];
