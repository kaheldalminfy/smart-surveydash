import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BarChart3, Brain, FileText, Users, CheckCircle, TrendingUp, Sparkles, Download, Shield } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";
import aiIcon from "@/assets/ai-icon.png";
import surveyIcon from "@/assets/survey-icon.png";
import analyticsIcon from "@/assets/analytics-icon.png";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { t, language } = useLanguage();
  
  const programs = language === 'ar' ? [
    { id: 1, name: "برنامج القانون", icon: "⚖️" },
    { id: 2, name: "برنامج التسويق", icon: "📊" },
    { id: 3, name: "برنامج إدارة الأعمال", icon: "💼" },
    { id: 4, name: "برنامج التمويل والمصارف", icon: "💰" },
    { id: 5, name: "برنامج إدارة المشاريع", icon: "📋" },
    { id: 6, name: "برنامج إدارة الرعاية الصحية", icon: "🏥" },
    { id: 7, name: "برنامج اللغة الإنجليزية والتواصل العالمي", icon: "🌍" },
    { id: 8, name: "برنامج ماجستير إدارة الرعاية الصحية", icon: "🎓" }
  ] : [
    { id: 1, name: "Law Program", icon: "⚖️" },
    { id: 2, name: "Marketing Program", icon: "📊" },
    { id: 3, name: "Business Administration", icon: "💼" },
    { id: 4, name: "Finance & Banking", icon: "💰" },
    { id: 5, name: "Project Management", icon: "📋" },
    { id: 6, name: "Healthcare Management", icon: "🏥" },
    { id: 7, name: "English & Global Communication", icon: "🌍" },
    { id: 8, name: "Master of Healthcare Management", icon: "🎓" }
  ];

  const features = language === 'ar' ? [
    {
      icon: <img src={surveyIcon} alt="تصميم الاستبيانات" className="w-16 h-16" />,
      title: "تصميم استبيانات ذكي",
      description: "واجهة سهلة لإنشاء استبيانات احترافية بمقاييس ليكرت والأسئلة المفتوحة والمغلقة"
    },
    {
      icon: <img src={aiIcon} alt="تحليل ذكي" className="w-16 h-16" />,
      title: "تحليل مدعوم بالذكاء الاصطناعي",
      description: "تحليل آلي للبيانات مع توليد تقارير ذكية وتوصيات قابلة للتطبيق"
    },
    {
      icon: <img src={analyticsIcon} alt="تقارير شاملة" className="w-16 h-16" />,
      title: "تقارير جاهزة للتنزيل",
      description: "تصدير تقارير PDF وExcel مع رسوم بيانية تفاعلية وإحصائيات دقيقة"
    }
  ] : [
    {
      icon: <img src={surveyIcon} alt="Survey Design" className="w-16 h-16" />,
      title: "Smart Survey Design",
      description: "Easy interface to create professional surveys with Likert scales and open/closed questions"
    },
    {
      icon: <img src={aiIcon} alt="AI Analysis" className="w-16 h-16" />,
      title: "AI-Powered Analysis",
      description: "Automatic data analysis with smart report generation and actionable recommendations"
    },
    {
      icon: <img src={analyticsIcon} alt="Reports" className="w-16 h-16" />,
      title: "Downloadable Reports",
      description: "Export PDF and Excel reports with interactive charts and accurate statistics"
    }
  ];

  const stats = language === 'ar' ? [
    { value: "8", label: "برامج أكاديمية", icon: <Users className="w-6 h-6" /> },
    { value: "100%", label: "آلي بالكامل", icon: <Sparkles className="w-6 h-6" /> },
    { value: "AI", label: "تحليل ذكي", icon: <Brain className="w-6 h-6" /> },
    { value: "PDF+Excel", label: "تقارير احترافية", icon: <Download className="w-6 h-6" /> }
  ] : [
    { value: "8", label: "Academic Programs", icon: <Users className="w-6 h-6" /> },
    { value: "100%", label: "Fully Automated", icon: <Sparkles className="w-6 h-6" /> },
    { value: "AI", label: "Smart Analysis", icon: <Brain className="w-6 h-6" /> },
    { value: "PDF+Excel", label: "Professional Reports", icon: <Download className="w-6 h-6" /> }
  ];

  const content = language === 'ar' ? {
    navTitle: "منظومة ادارة الجودة الشاملة الذكية",
    navSubtitle: "كلية العلوم الإنسانية والاجتماعية",
    aboutSystem: "عن النظام",
    submitComplaint: "تقديم شكوى",
    login: "تسجيل الدخول",
    getStarted: "ابدأ الآن",
    heroTag: "مدعوم بالذكاء الاصطناعي المتقدم",
    heroTitle: "منظومة متكاملة لإدارة الجودة الشاملة",
    heroDesc: "صمم، وزّع، وحلل استبياناتك بذكاء اصطناعي متقدم. احصل على تقارير احترافية جاهزة للتنزيل بصيغ PDF وExcel مع تحليلات عميقة وتوصيات قابلة للتطبيق",
    exploreFeatures: "استكشف المزايا",
    featuresTitle: "مزايا متقدمة لتجربة استثنائية",
    featuresDesc: "كل ما تحتاجه لإدارة استبيانات عالية الجودة في مكان واحد",
    programsTitle: "البرامج الأكاديمية",
    programsDesc: "ثمانية برامج متميزة في كلية العلوم الإنسانية والاجتماعية",
    howItWorks: "كيف يعمل النظام؟",
    howItWorksDesc: "ثلاث خطوات بسيطة للحصول على تقارير احترافية",
    step1Title: "صمم الاستبيان",
    step1Desc: "استخدم واجهة سهلة مع قوالب جاهزة ومقاييس ليكرت",
    step2Title: "وزّع وجمّع الردود",
    step2Desc: "شارك عبر روابط أو باركود واجمع الاستجابات آليًا",
    step3Title: "احصل على التقارير",
    step3Desc: "تقارير جاهزة بالذكاء الاصطناعي بصيغ PDF وExcel",
    ctaTitle: "جاهز للبدء؟",
    ctaDesc: "انضم إلى منظومة ادارة الجودة الشاملة الذكية وابدأ في إنشاء استبيانات احترافية اليوم",
    contactUs: "تواصل معنا",
    aboutSystemFooter: "عن المنظومة",
    aboutSystemDesc: "نظام ذكي متكامل لتصميم وإدارة وتحليل الاستبيانات الأكاديمية",
    quickLinks: "روابط سريعة",
    home: "الرئيسية",
    programs: "البرامج",
    features: "المزايا",
    support: "الدعم",
    helpCenter: "مركز المساعدة",
    faq: "الأسئلة الشائعة",
    contact: "اتصل بنا",
    contactInfo: "تواصل معنا",
    collegeName: "كلية العلوم الإنسانية والاجتماعية",
    copyright: "© 2025 منظومة ادارة الجودة الشاملة الذكية - كلية العلوم الإنسانية والاجتماعية. جميع الحقوق محفوظة."
  } : {
    navTitle: "Smart Quality Management System",
    navSubtitle: "College of Humanities and Social Sciences",
    aboutSystem: "About System",
    submitComplaint: "Submit Complaint",
    login: "Login",
    getStarted: "Get Started",
    heroTag: "Powered by Advanced AI",
    heroTitle: "Integrated Quality Management System",
    heroDesc: "Design, distribute, and analyze your surveys with advanced AI. Get professional reports ready to download in PDF and Excel formats with deep analytics and actionable recommendations",
    exploreFeatures: "Explore Features",
    featuresTitle: "Advanced Features for an Exceptional Experience",
    featuresDesc: "Everything you need to manage high-quality surveys in one place",
    programsTitle: "Academic Programs",
    programsDesc: "Eight distinguished programs at the College of Humanities and Social Sciences",
    howItWorks: "How It Works?",
    howItWorksDesc: "Three simple steps to get professional reports",
    step1Title: "Design the Survey",
    step1Desc: "Use an easy interface with ready templates and Likert scales",
    step2Title: "Distribute & Collect",
    step2Desc: "Share via links or QR codes and collect responses automatically",
    step3Title: "Get Reports",
    step3Desc: "AI-generated reports ready in PDF and Excel formats",
    ctaTitle: "Ready to Start?",
    ctaDesc: "Join the Smart Quality Management System and start creating professional surveys today",
    contactUs: "Contact Us",
    aboutSystemFooter: "About System",
    aboutSystemDesc: "An integrated smart system for designing, managing, and analyzing academic surveys",
    quickLinks: "Quick Links",
    home: "Home",
    programs: "Programs",
    features: "Features",
    support: "Support",
    helpCenter: "Help Center",
    faq: "FAQ",
    contact: "Contact Us",
    contactInfo: "Contact Info",
    collegeName: "College of Humanities and Social Sciences",
    copyright: "© 2025 Smart Quality Management System - College of Humanities and Social Sciences. All rights reserved."
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{content.navTitle}</h1>
                <p className="text-xs text-muted-foreground">{content.navSubtitle}</p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <LanguageToggle />
              <Button variant="ghost">{content.aboutSystem}</Button>
              <Link to="/submit-complaint">
                <Button variant="ghost">{content.submitComplaint}</Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline">{content.login}</Button>
              </Link>
              <Link to="/auth">
                <Button variant="hero">{content.getStarted}</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-5" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(${heroBanner})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 animate-float">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">{content.heroTag}</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
              {content.heroTitle}
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              {content.heroDesc}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/auth">
                <Button variant="hero" size="lg" className="text-lg px-8">
                  <Sparkles className="w-5 h-5 mx-2" />
                  {content.getStarted}
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg">
                <BarChart3 className="w-5 h-5 mx-2" />
                {content.exploreFeatures}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="p-6 text-center hover:shadow-card transition-all gradient-card">
                <div className="flex justify-center mb-3 text-primary">{stat.icon}</div>
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">{content.featuresTitle}</h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {content.featuresDesc}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-8 hover:shadow-elegant transition-all gradient-card group">
                <div className="mb-6 transform group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h4 className="text-2xl font-bold mb-4">{feature.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">{content.programsTitle}</h3>
            <p className="text-xl text-muted-foreground">{content.programsDesc}</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {programs.map((program) => (
              <Card key={program.id} className="p-6 hover:shadow-elegant transition-all cursor-pointer group gradient-card">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{program.icon}</div>
                <h5 className="font-bold text-lg leading-relaxed">{program.name}</h5>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">{content.howItWorks}</h3>
            <p className="text-xl text-muted-foreground">{content.howItWorksDesc}</p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 gradient-hero rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-elegant">
                  1
                </div>
                <h4 className="text-xl font-bold mb-3">{content.step1Title}</h4>
                <p className="text-muted-foreground">{content.step1Desc}</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-secondary to-accent rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-elegant">
                  2
                </div>
                <h4 className="text-xl font-bold mb-3">{content.step2Title}</h4>
                <p className="text-muted-foreground">{content.step2Desc}</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 gradient-accent rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-elegant">
                  3
                </div>
                <h4 className="text-xl font-bold mb-3">{content.step3Title}</h4>
                <p className="text-muted-foreground">{content.step3Desc}</p>
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
            <h3 className="text-4xl font-bold mb-6">{content.ctaTitle}</h3>
            <p className="text-xl mb-8 opacity-90">{content.ctaDesc}</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/auth">
                <Button variant="accent" size="lg" className="text-lg">
                  <Users className="w-5 h-5 mx-2" />
                  {content.getStarted}
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg bg-white/10 text-white border-white/30 hover:bg-white/20">
                <Shield className="w-5 h-5 mx-2" />
                {content.contactUs}
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
              <h6 className="font-bold mb-4">{content.aboutSystemFooter}</h6>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content.aboutSystemDesc}
              </p>
            </div>
            <div>
              <h6 className="font-bold mb-4">{content.quickLinks}</h6>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {content.home}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {content.programs}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {content.features}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h6 className="font-bold mb-4">{content.support}</h6>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {content.helpCenter}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {content.faq}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {content.contact}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h6 className="font-bold mb-4">{content.contactInfo}</h6>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{content.collegeName}</li>
                <li>info@college.edu</li>
                <li>+966 XX XXX XXXX</li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>{content.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
