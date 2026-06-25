import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Plus, Trash2, Copy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Question } from "./types";

interface QuestionItemProps {
  question: Question;
  index: number;
  questions: Question[];
  questionTypes: { value: string; label: string; description: string }[];
  likertLabels: string[];
  draggedQuestionId: string | null;
  dragOverQuestionId: string | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

const QuestionItem = ({
  question, index, questions, questionTypes, likertLabels,
  draggedQuestionId, dragOverQuestionId,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
  onUpdate, onDuplicate, onRemove,
}: QuestionItemProps) => {
  const { t, language } = useLanguage();

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, question.id)}
      onDragOver={(e) => onDragOver(e, question.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, question.id)}
      onDragEnd={onDragEnd}
      className={`p-4 border rounded-lg space-y-3 transition-all ${question.type === 'section' ? 'bg-primary/10 border-primary/30' : 'bg-card'} ${draggedQuestionId === question.id ? 'opacity-40 scale-95' : ''} ${dragOverQuestionId === question.id ? 'border-primary border-2 shadow-lg' : ''}`}
    >
      <div className="flex items-start gap-3">
        <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab active:cursor-grabbing" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={question.type === 'section' ? 'default' : 'outline'}>
              {question.type === 'section' ? t('designer.section') : `${language === 'ar' ? 'سؤال' : 'Q'} ${questions.slice(0, index).filter(q => q.type !== 'section').length + 1}`}
            </Badge>
            {question.type === 'section' && (
              <Badge variant="secondary" className="text-xs">
                {language === 'ar' ? 'اختياري' : 'Optional'}
              </Badge>
            )}
            <select value={question.type} onChange={(e) => onUpdate(question.id, 'type', e.target.value)}
              className="text-sm rounded-md border border-input bg-background px-2 py-1">
              {questionTypes.map(type => (<option key={type.value} value={type.value}>{type.label}</option>))}
            </select>
            {question.type !== 'section' && (
              <div className="flex items-center gap-2 mr-auto">
                <Label htmlFor={`required-${question.id}`} className="text-sm">{t('designer.required')}</Label>
                <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate(question.id, 'required', checked)} />
              </div>
            )}
          </div>
          <Input placeholder={question.type === 'section' ? (language === 'ar' ? 'عنوان القسم (اختياري)' : 'Section title (optional)') : (language === 'ar' ? 'اكتب نص السؤال هنا' : 'Enter question text')}
            value={question.text} onChange={(e) => onUpdate(question.id, 'text', e.target.value)}
            className={question.type === 'section' ? 'font-bold text-lg' : ''} />
          {question.type === 'section' && (
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'هذا عنوان تنظيمي فقط، وليس سؤالًا مطلوبًا أو عنصرًا يحتاج إلى تقييم.' : 'This is only a section heading, not a required question or an item that needs evaluation.'}
            </p>
          )}

          {question.type === "likert" && (
            <div className="flex gap-2 text-sm text-muted-foreground">
              {likertLabels.map((label, i) => (
                <span key={i}>{i > 0 && <span className="mx-1">•</span>}{label}</span>
              ))}
            </div>
          )}

          {question.type === "mcq" && (
            <div className="space-y-2">
              <Label className="text-sm">{t('designer.options')}:</Label>
              {(question.options || []).map((option, optionIndex) => (
                <div key={optionIndex} className="flex gap-2">
                  <Input placeholder={`${language === 'ar' ? 'الخيار' : 'Option'} ${optionIndex + 1}`}
                    value={option} onChange={(e) => {
                      const newOptions = [...(question.options || [])]; newOptions[optionIndex] = e.target.value;
                      onUpdate(question.id, 'options', newOptions);
                    }} className="text-sm" />
                  <Button size="sm" variant="ghost" onClick={() => {
                    const newOptions = (question.options || []).filter((_, i) => i !== optionIndex);
                    onUpdate(question.id, 'options', newOptions);
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => {
                const newOptions = [...(question.options || []), ""];
                onUpdate(question.id, 'options', newOptions);
              }}><Plus className="h-4 w-4 ml-2" />{t('designer.addOption')}</Button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" onClick={() => onDuplicate(question.id)} title={t('designer.duplicate')}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onRemove(question.id)} title={t('common.delete')}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuestionItem;
