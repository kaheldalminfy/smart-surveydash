import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BarChart3, Brain, FileText, Users, CheckCircle, TrendingUp, Sparkles, Download, Shield } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";
import aiIcon from "@/assets/ai-icon.png";
import surveyIcon from "@/assets/survey-icon.png";
import analyticsIcon from "@/assets/analytics-icon.png";
const Index = () => {
  const programs = [{
    id: 1,
    name: "برنامج القانون",
    icon: "⚖️"
  }, {
    id: 2,
    name: "برنامج التسويق",
    icon: "📊"
  }, {
    id: 3,
    name: "برنامج إدارة الأعمال",
    icon: "💼"
  }, {
    id: 4,
    name: "برنامج التمويل والمصارف",
    icon: "💰"
  }, {
    id: 5,
    name: "برنامج إدارة المشاريع",
    icon: "📋"
  }, {
    id: 6,
    name: "برنامج إدارة الرعاية الصحية",
    icon: "🏥"
  }, {
    id: 7,
    name: "برنامج اللغة الإنجليزية والتواصل العالمي",
    icon: "🌍"
  }, {
    id: 8,
    name: "برنامج ماجستير إدارة الرعاية الصحية",
    icon: "🎓"
  }];
  const features = [{
    icon: <img src={surveyIcon} alt="تصميم الاستبيانات" className="w-16 h-16" />,
    title: "تصميم استبيانات ذكي",
    description: "واجهة سهلة لإنشاء استبيانات احترافية بمقاييس ليكرت والأسئلة المفتوحة والمغلقة"
  }, {
    icon: <img src={aiIcon} alt="تحليل ذكي" className="w-16 h-16" />,
    title: "تحليل مدعوم بالذكاء الاصطناعي",
    description: "تحليل آلي للبيانات مع توليد تقارير ذكية وتوصيات قابلة للتطبيق"
  }, {
    icon: <img src={analyticsIcon} alt="تقارير شاملة" className="w-16 h-16" />,
    title: "تقارير جاهزة للتنزيل",
    description: "تصدير تقارير PDF وExcel مع رسوم بيانية تفاعلية وإحصائيات دقيقة"
  }];
  const stats = [{
    value: "8",
    label: "برامج أكاديمية",
    icon: <Users className="w-6 h-6" />
  }, {
    value: "100%",
    label: "آلي بالكامل",
    icon: <Sparkles className="w-6 h-6" />
  }, {
    value: "AI",
    label: "تحليل ذكي",
    icon: <Brain className="w-6 h-6" />
  }, {
    value: "PDF+Excel",
    label: "تقارير احترافية",
    icon: <Download className="w-6 h-6" />
  }];
  return <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">منظومة  ادارة الجودة الشاملة الذكية</h1>
                <p className="text-xs text-muted-foreground">كلية العلوم الإنسانية والاجتماعية</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost">عن النظام</Button>
              <Link to="/auth">
                <Button variant="outline">تسجيل الدخول</Button>
              </Link>
              <Link to="/auth">
                <Button variant="hero">ابدأ الآن</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-5" />
        <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url(${heroBanner})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }} />
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 animate-float">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">مدعوم بالذكاء الاصطناعي المتقدم</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
              منظومة متكاملة لإدارة الجودة الشاملة
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              صمم، وزّع، وحلل استبياناتك بذكاء اصطناعي متقدم. احصل على تقارير احترافية جاهزة للتنزيل بصيغ PDF وExcel مع
              تحليلات عميقة وتوصيات قابلة للتطبيق
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/auth">
                <Button variant="hero" size="lg" className="text-lg px-8">
                  <Sparkles className="w-5 h-5 ml-2" />
                  ابدأ الآن
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg">
                <BarChart3 className="w-5 h-5 ml-2" />
                استكشف المزايا
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => <Card key={index} className="p-6 text-center hover:shadow-card transition-all gradient-card">
                <div className="flex justify-center mb-3 text-primary">{stat.icon}</div>
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">مزايا متقدمة لتجربة استثنائية</h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              كل ما تحتاجه لإدارة استبيانات عالية الجودة في مكان واحد
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => <Card key={index} className="p-8 hover:shadow-elegant transition-all gradient-card group">
                <div className="mb-6 transform group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h4 className="text-2xl font-bold mb-4">{feature.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">البرامج الأكاديمية</h3>
            <p className="text-xl text-muted-foreground">ثمانية برامج متميزة في كلية العلوم الإنسانية والاجتماعية</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {programs.map(program => <Card key={program.id} className="p-6 hover:shadow-elegant transition-all cursor-pointer group gradient-card">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{program.icon}</div>
                <h5 className="font-bold text-lg leading-relaxed">{program.name}</h5>
              </Card>)}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">كيف يعمل النظام؟</h3>
            <p className="text-xl text-muted-foreground">ثلاث خطوات بسيطة للحصول على تقارير احترافية</p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 gradient-hero rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-elegant">
                  1
                </div>
                <h4 className="text-xl font-bold mb-3">صمم الاستبيان</h4>
                <p className="text-muted-foreground">استخدم واجهة سهلة مع قوالب جاهزة ومقاييس ليكرت</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-secondary to-accent rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-elegant">
                  2
                </div>
                <h4 className="text-xl font-bold mb-3">وزّع وجمّع الردود</h4>
                <p className="text-muted-foreground">شارك عبر روابط أو باركود واجمع الاستجابات آليًا</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 gradient-accent rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-elegant">
                  3
                </div>
                <h4 className="text-xl font-bold mb-3">احصل على التقارير</h4>
                <p className="text-muted-foreground">تقارير جاهزة بالذكاء الاصطناعي بصيغ PDF وExcel</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h3 className="text-4xl font-bold mb-6">جاهز للبدء؟</h3>
            <p className="text-xl mb-8 opacity-90">
              انضم إلى منظومة ادارة الجودة الشاملة الذكية وابدأ في إنشاء استبيانات احترافية اليوم
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/auth">
                <Button variant="accent" size="lg" className="text-lg">
                  <Users className="w-5 h-5 ml-2" />
                  ابدأ الآن
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg bg-white/10 text-white border-white/30 hover:bg-white/20">
                <Shield className="w-5 h-5 ml-2" />
                تواصل معنا
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h6 className="font-bold mb-4">عن المنظومة</h6>
              <p className="text-sm text-muted-foreground leading-relaxed">
                نظام ذكي متكامل لتصميم وإدارة وتحليل الاستبيانات الأكاديمية
              </p>
            </div>
            <div>
              <h6 className="font-bold mb-4">روابط سريعة</h6>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    الرئيسية
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    البرامج
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    المزايا
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h6 className="font-bold mb-4">الدعم</h6>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    مركز المساعدة
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    الأسئلة الشائعة
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    اتصل بنا
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h6 className="font-bold mb-4">تواصل معنا</h6>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>كلية العلوم الإنسانية والاجتماعية</li>
                <li>info@college.edu</li>
                <li>+966 XX XXX XXXX</li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 منظومة ادارة الجودة الشاملة الذكية - كلية العلوم الإنسانية والاجتماعية. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;