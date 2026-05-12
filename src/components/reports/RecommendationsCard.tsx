import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Edit as EditIcon, Save, Send } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface RecommendationsCardProps {
  recommendationsText: string | null;
  editRecommendationsOpen: boolean;
  editedRecommendations: string;
  onOpenEdit: () => void;
  onCloseEdit: () => void;
  onEditedRecommendationsChange: (v: string) => void;
  onSave: () => void;
  onSaveAndTransfer: () => void;
}

export const RecommendationsCard = ({
  recommendationsText, editRecommendationsOpen, editedRecommendations,
  onOpenEdit, onCloseEdit, onEditedRecommendationsChange, onSave, onSaveAndTransfer,
}: RecommendationsCardProps) => {
  const { t } = useLanguage();
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {t('reports.recommendationsSection')}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onOpenEdit}>
              <EditIcon className="h-4 w-4 ml-2" />
              {t('reports.editRecommendations')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recommendationsText ? (
            <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{recommendationsText}</p>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t('reports.noRecommendations')}</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={editRecommendationsOpen} onOpenChange={(open) => { if (!open) onCloseEdit(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t('reports.editRecommendations')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editedRecommendations}
              onChange={(e) => onEditedRecommendationsChange(e.target.value)}
              placeholder={t('reports.writeRecommendations')}
              rows={10}
              className="resize-none"
            />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onCloseEdit}>{t('complaintsUI.cancel')}</Button>
            <Button onClick={onSave}>
              <Save className="h-4 w-4 ml-2" />
              {t('reports.saveRecommendations')}
            </Button>
            <Button variant="secondary" onClick={onSaveAndTransfer}>
              <Send className="h-4 w-4 ml-2" />
              {t('reports.saveAndTransfer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
