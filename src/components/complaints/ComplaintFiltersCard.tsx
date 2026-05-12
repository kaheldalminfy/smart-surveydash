import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Program, academicYears, getSemesterOptions } from "./complaintsHelpers";
import { useLanguage } from "@/contexts/LanguageContext";

interface ComplaintFiltersCardProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedProgram: string;
  onProgramChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedAcademicYear: string;
  onAcademicYearChange: (value: string) => void;
  selectedSemester: string;
  onSemesterChange: (value: string) => void;
  programs: Program[];
}

const ComplaintFiltersCard = ({
  searchTerm, onSearchChange,
  selectedProgram, onProgramChange,
  selectedStatus, onStatusChange,
  selectedAcademicYear, onAcademicYearChange,
  selectedSemester, onSemesterChange,
  programs,
}: ComplaintFiltersCardProps) => {
  const { t } = useLanguage();
  const semesterOptions = getSemesterOptions(t);
  return (
  <Card>
    <CardContent className="p-6">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('complaintsUI.searchPh')}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <select className="rounded-md border border-input bg-background px-3 py-2" value={selectedProgram} onChange={(e) => onProgramChange(e.target.value)}>
          <option value="all">{t('complaintsUI.allPrograms')}</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>{program.name}</option>
          ))}
        </select>
        
        <select className="rounded-md border border-input bg-background px-3 py-2" value={selectedStatus} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="all">{t('complaintsUI.allStatuses')}</option>
          <option value="pending">{t('complaintsUI.status.pending')}</option>
          <option value="in_progress">{t('complaintsUI.status.in_progress')}</option>
          <option value="resolved">{t('complaintsUI.status.resolved')}</option>
        </select>

        <select className="rounded-md border border-input bg-background px-3 py-2" value={selectedAcademicYear} onChange={(e) => { onAcademicYearChange(e.target.value); onSemesterChange("all"); }}>
          <option value="all">{t('complaintsUI.allYears')}</option>
          {academicYears.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select className="rounded-md border border-input bg-background px-3 py-2" value={selectedSemester} onChange={(e) => onSemesterChange(e.target.value)}>
          <option value="all">{t('complaintsUI.allSemesters')}</option>
          {semesterOptions.map((semester) => (
            <option key={semester} value={semester}>{semester}</option>
          ))}
        </select>
      </div>
    </CardContent>
  </Card>
  );
};

export default ComplaintFiltersCard;
