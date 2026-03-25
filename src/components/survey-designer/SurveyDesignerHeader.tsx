import { Button } from "@/components/ui/button";
import { FileText, Upload, FileJson, FileSpreadsheet, Eye, Sparkles, Save } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import { useLanguage } from "@/contexts/LanguageContext";

interface SurveyDesignerHeaderProps {
  isEditing: boolean;
  currentTab: string;
  isLoading: boolean;
  isAISuggesting: boolean;
  surveyTitle: string;
  onSaveTemplate: () => void;
  onImport: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onPreview: () => void;
  onAISuggestions: () => void;
  onSave: () => void;
}

const SurveyDesignerHeader = ({
  isEditing, currentTab, isLoading, isAISuggesting, surveyTitle,
  onSaveTemplate, onImport, onExportJSON, onExportCSV, onPreview, onAISuggestions, onSave,
}: SurveyDesignerHeaderProps) => {
  const { t, language } = useLanguage();

  return (
    <header className="bg-card border-b shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <DashboardButton />
            <div>
              <h1 className="text-2xl font-bold">{isEditing ? t('designer.editTitle') : t('designer.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {currentTab === "templates" ? (language === 'ar' ? "اختر قالباً أو ابدأ من الصفر" : "Choose a template or start from scratch") : isEditing ? (language === 'ar' ? "تعديل استبيانك" : "Edit your survey") : (language === 'ar' ? "صمم استبيانك" : "Design your survey")}
              </p>
            </div>
          </div>
          {currentTab === "design" && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={onSaveTemplate}>
                <FileText className="h-4 w-4 ml-2" />
                {t('designer.saveTemplate')}
              </Button>
              <Button variant="outline" size="sm" onClick={onImport}>
                <Upload className="h-4 w-4 ml-2" />
                {t('common.import')}
              </Button>
              <Button variant="outline" size="sm" onClick={onExportJSON}>
                <FileJson className="h-4 w-4 ml-2" />
                {t('designer.exportJSON')}
              </Button>
              <Button variant="outline" size="sm" onClick={onExportCSV}>
                <FileSpreadsheet className="h-4 w-4 ml-2" />
                {t('designer.exportCSV')}
              </Button>
              <Button variant="outline" size="sm" onClick={onPreview}>
                <Eye className="h-4 w-4 ml-2" />
                {t('designer.preview')}
              </Button>
              <Button variant="accent" size="sm" onClick={onAISuggestions} disabled={isAISuggesting || !surveyTitle}>
                <Sparkles className="h-4 w-4 ml-2" />
                {isAISuggesting ? (language === 'ar' ? "جاري الاقتراح..." : "Suggesting...") : t('designer.suggestWithAI')}
              </Button>
              <Button onClick={onSave} variant="hero" size="sm" disabled={isLoading}>
                <Save className="h-4 w-4 ml-2" />
                {isLoading ? t('designer.saving') : isEditing ? t('common.updated') : t('common.save')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default SurveyDesignerHeader;
