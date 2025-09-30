import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Sparkles, Save, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SurveyDesigner = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([
    { id: 1, text: "", type: "likert" }
  ]);

  const questionTypes = [
    { value: "likert", label: "مقياس ليكرت" },
    { value: "mcq", label: "اختيار متعدد" },
    { value: "text", label: "نص مفتوح" },
    { value: "rating", label: "تقييم/ترتيب" },
  ];

  const addQuestion = () => {
    setQuestions([...questions, { id: Date.now(), text: "", type: "likert" }]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSave = () => {
    // Save logic here
    navigate("/surveys");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">مصمم الاستبيان</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 ml-2" />
                معاينة
              </Button>
              <Button variant="accent" size="sm">
                <Sparkles className="h-4 w-4 ml-2" />
                اقتراحات AI
              </Button>
              <Button onClick={handleSave} variant="hero" size="sm">
                <Save className="h-4 w-4 ml-2" />
                حفظ
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>معلومات الاستبيان</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">عنوان الاستبيان</Label>
                  <Input id="title" placeholder="مثال: تقييم جودة المقرر - القانون التجاري" />
                </div>
                <div>
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea id="description" placeholder="وصف مختصر للاستبيان وأهدافه" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="program">البرنامج</Label>
                    <select id="program" className="w-full rounded-md border border-input bg-background px-3 py-2">
                      <option value="">اختر البرنامج</option>
                      <option value="law">القانون</option>
                      <option value="marketing">التسويق</option>
                      <option value="business">إدارة الأعمال</option>
                      <option value="finance">التمويل والمصارف</option>
                      <option value="project">إدارة المشاريع</option>
                      <option value="healthcare">إدارة الرعاية الصحية</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="anonymous">نوع الاستبيان</Label>
                    <select id="anonymous" className="w-full rounded-md border border-input bg-background px-3 py-2">
                      <option value="anonymous">مجهول الهوية</option>
                      <option value="identified">محدد الهوية</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>الأسئلة</CardTitle>
                <Button onClick={addQuestion} size="sm" variant="outline">
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة سؤال
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="p-4 border rounded-lg bg-card space-y-3">
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">سؤال {index + 1}</Badge>
                          <select 
                            value={question.type}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[index].type = e.target.value;
                              setQuestions(updated);
                            }}
                            className="text-sm rounded-md border border-input bg-background px-2 py-1"
                          >
                            {questionTypes.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>
                        <Input 
                          placeholder="اكتب نص السؤال هنا"
                          value={question.text}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[index].text = e.target.value;
                            setQuestions(updated);
                          }}
                        />
                        {question.type === "likert" && (
                          <div className="flex gap-2 text-sm text-muted-foreground">
                            <span>غير موافق بشدة</span>
                            <span>•</span>
                            <span>غير موافق</span>
                            <span>•</span>
                            <span>محايد</span>
                            <span>•</span>
                            <span>موافق</span>
                            <span>•</span>
                            <span>موافق بشدة</span>
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>القوالب الجاهزة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  تقييم المقرر الدراسي
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  رضا الطلاب العام
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  تقييم عضو هيئة التدريس
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  جودة البرنامج الأكاديمي
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الإعدادات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="start-date">تاريخ البدء</Label>
                  <Input id="start-date" type="date" />
                </div>
                <div>
                  <Label htmlFor="end-date">تاريخ الانتهاء</Label>
                  <Input id="end-date" type="date" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SurveyDesigner;
