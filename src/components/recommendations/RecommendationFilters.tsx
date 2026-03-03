import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  programs: { id: string; name: string }[];
  academicYears: string[];
  selectedProgram: string;
  selectedYear: string;
  selectedSemester: string;
  onProgramChange: (v: string) => void;
  onYearChange: (v: string) => void;
  onSemesterChange: (v: string) => void;
}

const RecommendationFilters = ({
  programs,
  academicYears,
  selectedProgram,
  selectedYear,
  selectedSemester,
  onProgramChange,
  onYearChange,
  onSemesterChange,
}: Props) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Select value={selectedProgram} onValueChange={onProgramChange}>
        <SelectTrigger>
          <SelectValue placeholder={t("recommendations.filterByProgram")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("recommendations.allPrograms")}</SelectItem>
          {programs.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedYear} onValueChange={onYearChange}>
        <SelectTrigger>
          <SelectValue placeholder={t("recommendations.filterByYear")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("recommendations.allYears")}</SelectItem>
          {academicYears.map((y) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedSemester} onValueChange={onSemesterChange}>
        <SelectTrigger>
          <SelectValue placeholder={t("recommendations.filterBySemester")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("recommendations.allSemesters")}</SelectItem>
          <SelectItem value="first">{t("recommendations.first")}</SelectItem>
          <SelectItem value="second">{t("recommendations.second")}</SelectItem>
          <SelectItem value="summer">{t("recommendations.summerSem")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default RecommendationFilters;
