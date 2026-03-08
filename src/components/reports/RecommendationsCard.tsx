import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Edit as EditIcon, Save, Send } from "lucide-react";

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
  recommendationsText,
  editRecommendationsOpen,
  editedRecommendations,
  onOpenEdit,
  onCloseEdit,
  onEditedRecommendationsChange,
  onSave,
  onSaveAndTransfer,
}: RecommendationsCardProps) => {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              التوصيات
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onOpenEdit}>
              <EditIcon className="h-4 w-4 ml-2" />
              تعديل التوصيات
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recommendationsText ? (
            <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {recommendationsText}
              </p>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">لا توجد توصيات بعد. اضغط على "تعديل التوصيات" لإضافة توصيات.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={editRecommendationsOpen} onOpenChange={(open) => { if (!open) onCloseEdit(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل التوصيات</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editedRecommendations}
              onChange={(e) => onEditedRecommendationsChange(e.target.value)}
              placeholder="اكتب التوصيات هنا..."
              rows={10}
              className="resize-none"
            />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onCloseEdit}>إلغاء</Button>
            <Button onClick={onSave}>
              <Save className="h-4 w-4 ml-2" />
              حفظ التوصيات
            </Button>
            <Button variant="secondary" onClick={onSaveAndTransfer}>
              <Send className="h-4 w-4 ml-2" />
              حفظ ونقل لمتابعة التوصيات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
