import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, GraduationCap, Globe, Flag, 
  FileText, Target, ChevronLeft, ChevronRight,
  MoreVertical, Edit, Trash2, Eye
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Framework {
  id: string;
  name: string;
  name_en: string | null;
  type: 'institutional' | 'programmatic';
  scope: 'national' | 'international';
  version: string | null;
  description: string | null;
  is_active: boolean;
  programs?: { name: string } | null;
  standards_count?: number;
  indicators_count?: number;
  compliance_percentage?: number;
}

interface FrameworkCardProps {
  framework: Framework;
  onRefresh: () => void;
}

export const FrameworkCard = ({ framework, onRefresh }: FrameworkCardProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("accreditation_frameworks")
        .delete()
        .eq("id", framework.id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? "تم الحذف" : "Deleted",
        description: language === 'ar' ? "تم حذف الإطار بنجاح" : "Framework deleted successfully",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {framework.type === 'institutional' ? (
                <Building2 className="h-5 w-5 text-blue-500" />
              ) : (
                <GraduationCap className="h-5 w-5 text-green-500" />
              )}
              <CardTitle className="text-lg">{framework.name}</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/accreditation/framework/${framework.id}`)}>
                  <Eye className="h-4 w-4 ml-2" />
                  {language === 'ar' ? 'عرض' : 'View'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant={framework.type === 'institutional' ? 'default' : 'secondary'}>
              {framework.type === 'institutional' 
                ? (language === 'ar' ? 'مؤسسي' : 'Institutional')
                : (language === 'ar' ? 'برامجي' : 'Programmatic')
              }
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              {framework.scope === 'national' ? (
                <Flag className="h-3 w-3" />
              ) : (
                <Globe className="h-3 w-3" />
              )}
              {framework.scope === 'national'
                ? (language === 'ar' ? 'وطني' : 'National')
                : (language === 'ar' ? 'دولي' : 'International')
              }
            </Badge>
            {framework.version && (
              <Badge variant="outline">v{framework.version}</Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent onClick={() => navigate(`/accreditation/framework/${framework.id}`)}>
          {framework.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {framework.description}
            </p>
          )}
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{framework.standards_count || 0} {language === 'ar' ? 'معيار' : 'Standards'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span>{framework.indicators_count || 0} {language === 'ar' ? 'مؤشر' : 'Indicators'}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {language === 'ar' ? 'نسبة الاستيفاء' : 'Compliance'}
              </span>
              <span className="font-semibold">{framework.compliance_percentage || 0}%</span>
            </div>
            <Progress 
              value={framework.compliance_percentage || 0} 
              className="h-2"
            />
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
              {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
              {language === 'ar' ? <ChevronLeft className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? `هل أنت متأكد من حذف إطار "${framework.name}"؟ سيتم حذف جميع المعايير والمؤشرات المرتبطة.`
                : `Are you sure you want to delete "${framework.name}"? All related standards and indicators will be deleted.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting 
                ? (language === 'ar' ? 'جاري الحذف...' : 'Deleting...')
                : (language === 'ar' ? 'حذف' : 'Delete')
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
