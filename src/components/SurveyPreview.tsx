import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Star, Printer, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Question {
  id: number;
  text: string;
  type: string;
  required?: boolean;
  options?: string[];
}

interface SurveyPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  survey: {
    title: string;
    description: string;
    isAnonymous: boolean;
  };
  questions: Question[];
}

const SurveyPreview = ({ isOpen, onClose, survey, questions }: SurveyPreviewProps) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle>معاينة الاستبيان</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 print:space-y-4">
          {/* Survey Header */}
          <Card className="print:shadow-none print:border-2">
            <CardHeader>
              <CardTitle className="text-2xl text-center print:text-3xl">{survey.title}</CardTitle>
              {survey.description && (
                <p className="text-muted-foreground text-center mt-2">{survey.description}</p>
              )}
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="outline">
                  {survey.isAnonymous ? "استبيان مجهول" : "استبيان بالاسم"}
                </Badge>
                <Badge variant="secondary">{questions.length} سؤال</Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Questions */}
          {questions.map((question, index) => (
            <Card key={question.id} className="print:shadow-none print:border print:break-inside-avoid">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2 mb-4">
                  <Badge variant="outline" className="print:border-2">
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    <Label className="text-base font-semibold">
                      {question.text}
                      {question.required && <span className="text-destructive mr-1">*</span>}
                    </Label>
                    <Badge variant="secondary" className="mr-2 mt-2">
                      {question.type === "likert" && "مقياس ليكرت"}
                      {question.type === "text" && "نص مفتوح"}
                      {question.type === "mcq" && "اختيار من متعدد"}
                      {question.type === "rating" && "تقييم"}
                    </Badge>
                  </div>
                </div>

                {/* Question Type Specific UI */}
                {question.type === "likert" && (
                  <div className="space-y-2 mr-8">
                    {["غير موافق بشدة", "غير موافق", "محايد", "موافق", "موافق بشدة"].map((option) => (
                      <div key={option} className="flex items-center gap-2 p-2 border rounded">
                        <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>
                )}

                {question.type === "mcq" && question.options && (
                  <RadioGroup className="space-y-2 mr-8">
                    {question.options.map((option, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 border rounded">
                        <RadioGroupItem value={option} id={`${question.id}-${i}`} disabled />
                        <Label htmlFor={`${question.id}-${i}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {question.type === "rating" && (
                  <div className="flex gap-1 mr-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-8 w-8 text-muted-foreground" />
                    ))}
                  </div>
                )}

                {question.type === "text" && (
                  <Textarea 
                    placeholder="مساحة للإجابة..." 
                    className="mr-8 resize-none print:min-h-32" 
                    rows={4}
                    disabled
                  />
                )}
              </CardContent>
            </Card>
          ))}

          {/* Footer */}
          <Card className="print:shadow-none print:border-2">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">شكراً لمشاركتك في هذا الاستبيان</p>
              <p className="text-sm text-muted-foreground mt-2">
                إجاباتك ستساعدنا في تحسين جودة خدماتنا
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SurveyPreview;
