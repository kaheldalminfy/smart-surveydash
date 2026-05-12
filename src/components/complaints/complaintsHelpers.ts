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

export type TFn = (key: string) => string;

export const getStatusOptions = (t: TFn) => [
  { value: "pending", label: t('complaintsUI.status.pending') },
  { value: "in_progress", label: t('complaintsUI.status.in_progress') },
  { value: "resolved", label: t('complaintsUI.status.resolved') },
];

export const getCategoryLabel = (category: string, t: TFn) => {
  const map: Record<string, string> = {
    academic: t('complaintsUI.cat.academic'),
    administrative: t('complaintsUI.cat.administrative'),
    technical: t('complaintsUI.cat.technical'),
    facility: t('complaintsUI.cat.facility'),
    other: t('complaintsUI.cat.other'),
  };
  return map[category] || category;
};

// Backward-compat (no-translation) — kept so files not yet migrated still build.
// Returns the raw key; callers should migrate to getStatusOptions/getCategoryLabel.
export const statusOptions = [
  { value: "pending", label: "pending" },
  { value: "in_progress", label: "in_progress" },
  { value: "resolved", label: "resolved" },
];

const currentYear = new Date().getFullYear();
export const academicYears = Array.from({ length: 101 }, (_, i) => {
  const startYear = currentYear + i;
  return `${startYear}-${startYear + 1}`;
});

export const getSemesterOptions = (t: TFn) => [
  t('complaintsUI.semester.fall'),
  t('complaintsUI.semester.spring'),
  t('complaintsUI.semester.summer'),
];

// Backward-compat
export const semesterOptions = ["خريف", "ربيع", "صيفي"];
