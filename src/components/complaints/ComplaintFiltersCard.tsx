import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Program, academicYears, semesterOptions } from "./complaintsHelpers";

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
}: ComplaintFiltersCardProps) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في الشكاوى..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <select className="rounded-md border border-input bg-background px-3 py-2" value={selectedProgram} onChange={(e) => onProgramChange(e.target.value)}>
          <option value="all">جميع البرامج</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>{program.name}</option>
          ))}
        </select>
        
        <select className="rounded-md border border-input bg-background px-3 py-2" value={selectedStatus} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="all">جميع الحالات</option>
          <option value="pending">جديدة</option>
          <option value="in_progress">قيد الإجراء</option>
          <option value="resolved">تم الحل</option>
        </select>

        <select className="rounded-md border border-input bg-background px-3 py-2" value={selectedAcademicYear} onChange={(e) => { onAcademicYearChange(e.target.value); onSemesterChange("all"); }}>
          <option value="all">جميع السنوات</option>
          {academicYears.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select className="rounded-md border border-input bg-background px-3 py-2" value={selectedSemester} onChange={(e) => onSemesterChange(e.target.value)}>
          <option value="all">جميع الفصول</option>
          {semesterOptions.map((semester) => (
            <option key={semester} value={semester}>{semester}</option>
          ))}
        </select>
      </div>
    </CardContent>
  </Card>
);

export default ComplaintFiltersCard;
