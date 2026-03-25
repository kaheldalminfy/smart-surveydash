import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Question } from "./types";
import QuestionItem from "./QuestionItem";

interface QuestionsListCardProps {
  questions: Question[];
  questionTypes: { value: string; label: string; description: string }[];
  likertLabels: string[];
  draggedQuestionId: number | null;
  dragOverQuestionId: number | null;
  onAddSection: () => void;
  onAddQuestion: () => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragOver: (e: React.DragEvent, id: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: number) => void;
  onDragEnd: () => void;
  onUpdateQuestion: (id: number, field: string, value: any) => void;
  onDuplicateQuestion: (id: number) => void;
  onRemoveQuestion: (id: number) => void;
}

const QuestionsListCard = ({
  questions, questionTypes, likertLabels,
  draggedQuestionId, dragOverQuestionId,
  onAddSection, onAddQuestion,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
  onUpdateQuestion, onDuplicateQuestion, onRemoveQuestion,
}: QuestionsListCardProps) => {
  const { t, language } = useLanguage();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{language === 'ar' ? "الأسئلة" : "Questions"} ({questions.filter(q => q.type !== 'section').length})</CardTitle>
        <div className="flex gap-2">
          <Button onClick={onAddSection} size="sm" variant="outline">
            <Plus className="h-4 w-4 ml-2" />
            {t('designer.addSection')}
          </Button>
          <Button onClick={onAddQuestion} size="sm" variant="outline">
            <Plus className="h-4 w-4 ml-2" />
            {t('designer.addQuestion')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((question, index) => (
          <QuestionItem
            key={question.id}
            question={question}
            index={index}
            questions={questions}
            questionTypes={questionTypes}
            likertLabels={likertLabels}
            draggedQuestionId={draggedQuestionId}
            dragOverQuestionId={dragOverQuestionId}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onUpdate={onUpdateQuestion}
            onDuplicate={onDuplicateQuestion}
            onRemove={onRemoveQuestion}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default QuestionsListCard;
