import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.surveys': 'الاستبيانات',
    'nav.complaints': 'الشكاوى',
    'nav.recommendations': 'التوصيات',
    'nav.archives': 'الأرشيف',
    'nav.comparison': 'مقارنة البرامج',
    'nav.users': 'المستخدمون',
    'nav.settings': 'الإعدادات',
    'nav.logout': 'تسجيل الخروج',
    
    // Dashboard
    'dashboard.title': 'لوحة التحكم',
    'dashboard.welcome': 'مرحباً بك في نظام إدارة الاستبيانات',
    'dashboard.totalSurveys': 'إجمالي الاستبيانات',
    'dashboard.activeSurveys': 'الاستبيانات النشطة',
    'dashboard.totalResponses': 'إجمالي الردود',
    'dashboard.pendingComplaints': 'الشكاوى المعلقة',
    'dashboard.recentActivity': 'النشاط الأخير',
    'dashboard.quickActions': 'إجراءات سريعة',
    'dashboard.createSurvey': 'إنشاء استبيان جديد',
    'dashboard.viewReports': 'عرض التقارير',
    'dashboard.manageComplaints': 'إدارة الشكاوى',
    
    // Surveys
    'surveys.title': 'الاستبيانات',
    'surveys.create': 'إنشاء استبيان',
    'surveys.edit': 'تعديل',
    'surveys.delete': 'حذف',
    'surveys.view': 'عرض',
    'surveys.status': 'الحالة',
    'surveys.responses': 'الردود',
    'surveys.actions': 'الإجراءات',
    'surveys.draft': 'مسودة',
    'surveys.active': 'نشط',
    'surveys.closed': 'مغلق',
    'surveys.noSurveys': 'لا توجد استبيانات',
    
    // Complaints
    'complaints.title': 'الشكاوى',
    'complaints.submit': 'تقديم شكوى',
    'complaints.status': 'الحالة',
    'complaints.pending': 'قيد الانتظار',
    'complaints.inProgress': 'قيد المعالجة',
    'complaints.resolved': 'تم الحل',
    'complaints.closed': 'مغلقة',
    'complaints.subject': 'الموضوع',
    'complaints.description': 'الوصف',
    'complaints.type': 'النوع',
    'complaints.date': 'التاريخ',
    
    // Recommendations
    'recommendations.title': 'التوصيات',
    'recommendations.add': 'إضافة توصية',
    'recommendations.edit': 'تعديل',
    'recommendations.priority': 'الأولوية',
    'recommendations.status': 'الحالة',
    'recommendations.high': 'عالية',
    'recommendations.medium': 'متوسطة',
    'recommendations.low': 'منخفضة',
    
    // Common
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة',
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.export': 'تصدير',
    'common.import': 'استيراد',
    'common.loading': 'جاري التحميل...',
    'common.noData': 'لا توجد بيانات',
    'common.confirm': 'تأكيد',
    'common.yes': 'نعم',
    'common.no': 'لا',
    'common.close': 'إغلاق',
    'common.actions': 'الإجراءات',
    'common.name': 'الاسم',
    'common.email': 'البريد الإلكتروني',
    'common.date': 'التاريخ',
    'common.program': 'البرنامج',
    'common.semester': 'الفصل الدراسي',
    'common.academicYear': 'السنة الأكاديمية',
    
    // Auth
    'auth.login': 'تسجيل الدخول',
    'auth.logout': 'تسجيل الخروج',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.register': 'إنشاء حساب',
    
    // Reports
    'reports.title': 'التقارير',
    'reports.generate': 'إنشاء تقرير',
    'reports.download': 'تحميل',
    'reports.exportPdf': 'تصدير PDF',
    'reports.exportExcel': 'تصدير Excel',
    
    // Users
    'users.title': 'المستخدمون',
    'users.add': 'إضافة مستخدم',
    'users.role': 'الدور',
    'users.admin': 'مدير',
    'users.coordinator': 'منسق',
    'users.faculty': 'عضو هيئة تدريس',
    
    // Settings
    'settings.title': 'إعدادات النظام',
    'settings.general': 'عام',
    'settings.notifications': 'الإشعارات',
    'settings.security': 'الأمان',
    
    // Archives
    'archives.title': 'الأرشيف',
    'archives.view': 'عرض الأرشيف',
    'archives.restore': 'استعادة',
    
    // Comparison
    'comparison.title': 'مقارنة البرامج',
    'comparison.select': 'اختر البرامج للمقارنة',
    
    // Index/Landing
    'index.title': 'نظام إدارة الاستبيانات',
    'index.subtitle': 'منصة متكاملة لإدارة الاستبيانات والشكاوى',
    'index.getStarted': 'ابدأ الآن',
    'index.login': 'تسجيل الدخول',
    'index.features': 'المميزات',
    'index.feature1.title': 'استبيانات ذكية',
    'index.feature1.desc': 'إنشاء وإدارة استبيانات متنوعة بسهولة',
    'index.feature2.title': 'تحليلات متقدمة',
    'index.feature2.desc': 'تقارير وتحليلات تفصيلية للبيانات',
    'index.feature3.title': 'إدارة الشكاوى',
    'index.feature3.desc': 'نظام متكامل لإدارة ومتابعة الشكاوى',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.surveys': 'Surveys',
    'nav.complaints': 'Complaints',
    'nav.recommendations': 'Recommendations',
    'nav.archives': 'Archives',
    'nav.comparison': 'Program Comparison',
    'nav.users': 'Users',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome to Survey Management System',
    'dashboard.totalSurveys': 'Total Surveys',
    'dashboard.activeSurveys': 'Active Surveys',
    'dashboard.totalResponses': 'Total Responses',
    'dashboard.pendingComplaints': 'Pending Complaints',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.createSurvey': 'Create New Survey',
    'dashboard.viewReports': 'View Reports',
    'dashboard.manageComplaints': 'Manage Complaints',
    
    // Surveys
    'surveys.title': 'Surveys',
    'surveys.create': 'Create Survey',
    'surveys.edit': 'Edit',
    'surveys.delete': 'Delete',
    'surveys.view': 'View',
    'surveys.status': 'Status',
    'surveys.responses': 'Responses',
    'surveys.actions': 'Actions',
    'surveys.draft': 'Draft',
    'surveys.active': 'Active',
    'surveys.closed': 'Closed',
    'surveys.noSurveys': 'No surveys found',
    
    // Complaints
    'complaints.title': 'Complaints',
    'complaints.submit': 'Submit Complaint',
    'complaints.status': 'Status',
    'complaints.pending': 'Pending',
    'complaints.inProgress': 'In Progress',
    'complaints.resolved': 'Resolved',
    'complaints.closed': 'Closed',
    'complaints.subject': 'Subject',
    'complaints.description': 'Description',
    'complaints.type': 'Type',
    'complaints.date': 'Date',
    
    // Recommendations
    'recommendations.title': 'Recommendations',
    'recommendations.add': 'Add Recommendation',
    'recommendations.edit': 'Edit',
    'recommendations.priority': 'Priority',
    'recommendations.status': 'Status',
    'recommendations.high': 'High',
    'recommendations.medium': 'Medium',
    'recommendations.low': 'Low',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.loading': 'Loading...',
    'common.noData': 'No data available',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.close': 'Close',
    'common.actions': 'Actions',
    'common.name': 'Name',
    'common.email': 'Email',
    'common.date': 'Date',
    'common.program': 'Program',
    'common.semester': 'Semester',
    'common.academicYear': 'Academic Year',
    
    // Auth
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.register': 'Register',
    
    // Reports
    'reports.title': 'Reports',
    'reports.generate': 'Generate Report',
    'reports.download': 'Download',
    'reports.exportPdf': 'Export PDF',
    'reports.exportExcel': 'Export Excel',
    
    // Users
    'users.title': 'Users',
    'users.add': 'Add User',
    'users.role': 'Role',
    'users.admin': 'Admin',
    'users.coordinator': 'Coordinator',
    'users.faculty': 'Faculty',
    
    // Settings
    'settings.title': 'System Settings',
    'settings.general': 'General',
    'settings.notifications': 'Notifications',
    'settings.security': 'Security',
    
    // Archives
    'archives.title': 'Archives',
    'archives.view': 'View Archive',
    'archives.restore': 'Restore',
    
    // Comparison
    'comparison.title': 'Program Comparison',
    'comparison.select': 'Select programs to compare',
    
    // Index/Landing
    'index.title': 'Survey Management System',
    'index.subtitle': 'Integrated platform for managing surveys and complaints',
    'index.getStarted': 'Get Started',
    'index.login': 'Login',
    'index.features': 'Features',
    'index.feature1.title': 'Smart Surveys',
    'index.feature1.desc': 'Create and manage various surveys easily',
    'index.feature2.title': 'Advanced Analytics',
    'index.feature2.desc': 'Detailed reports and data analytics',
    'index.feature3.title': 'Complaint Management',
    'index.feature3.desc': 'Integrated system for managing and tracking complaints',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'ar';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
