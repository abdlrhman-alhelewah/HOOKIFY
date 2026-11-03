import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, FileText, Globe, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/Button";

export default function PrivacyPage() {
  const { language, t } = useLanguage();
  const isAr = language === "Arabic";

  return (
    <div className="min-h-screen bg-[#060608] text-slate-100 font-sans selection:bg-violet-900 selection:text-white pb-20">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 w-full z-50 border-b border-white/10 bg-[#060608]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:-translate-x-1 transition-all" />
            <span className="text-sm font-medium text-slate-400 group-hover:text-white">
              {isAr ? "الرجوع للرئيسية" : "Back to Home"}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-gradient-to-tr from-purple-500 to-blue-400">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 dark:from-white dark:to-slate-400 font-heading">
              Hookify
            </span>
          </div>
        </div>
      </header>

      {/* Title Hero */}
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-4">
          <Shield className="w-3.5 h-3.5" />
          <span>{isAr ? "حماية خصوصيتك وبياناتك" : "Protecting Your Privacy & Data"}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight mb-4">
          {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
          {isAr
            ? "نلتزم بحماية بياناتك الشخصية وحقوق ملكيتك الفكرية بأعلى معايير الأمان باستخدام تقنيات تشفير السحابية المستقرة."
            : "We are committed to protecting your personal data and intellectual property rights using top tier secure cloud security systems."}
        </p>
        <p className="text-xs text-slate-500 mt-2">
          {isAr ? "آخر تحديث: يونيو 2026" : "Last updated: June 2026"}
        </p>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 md:p-10 shadow-2xl space-y-12">
          
          {/* Intro Section - Bilingual cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2.5 mb-3 text-purple-400">
                <Lock className="w-5 h-5" />
                <h3 className="font-bold text-base">أمان فائق للبيانات</h3>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                يتم حماية وتخزين ملفاتك، منشوراتك، وتحليلات المنافسين الخاصة بك بأمان متقدم عبر قواعد بيانات Google Firebase المشفرة، ولا يمكن لأي مستخدم آخر الاطلاع عليها.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2.5 mb-3 text-blue-400">
                <Eye className="w-5 h-5" />
                <h3 className="font-bold text-base">Secure Cloud Storage</h3>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Your metrics, generated ideas, competitor analysis files, and calendar scheduling are secured via Firestore Rules. No external parties can view or copy your private intellectual work.
              </p>
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Detailed Clauses - Arabic Section */}
          <div className="space-y-6 text-right" dir="rtl">
            <h2 className="text-2xl font-bold border-r-4 border-purple-500 pr-3 text-white">
              بنود سياسة الخصوصية بالتفصيل
            </h2>
            
            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">1. جمع البيانات واستخدامها</h3>
                <p>
                  نقوم بجمع المعلومات الضرورية والأساسية لتقديم خدمات توليد المحتوى، مثل الاسم والبريد الإلكتروني عند تسجيل الدخول باستخدام حساب Google الخاص بك لتصنيف وتأمين أرشيف الهوية التجارية الخاص بك.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">2. معالجة وتوليد الذكاء الاصطناعي (Gemini AI API)</h3>
                <p>
                  يتم تمرير الأفكار والعناوين التي تدخلها لمعالجتها بأمان تام عبر واجهة برمجية سحابية خاصة غير معلنة (Gemini API server-side). لا تُستخدم بياناتك لتدريب النماذج العامة، وتبقي أفكارك وتوجهات مشروعك ملكك بالكامل.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">3. تأمين خوادم وقواعد البيانات</h3>
                <p>
                  نستثمر في تشفير بروتوكول طبقة المنافذ الآمنة (SSL)، بجانب نظام قواعد البيانات السحابية المدار من قِبل Google Cloud. وهذا يضمن منع تداخل البيانات أو تسريب مفاتيح واجهة التطبيقات البرمجية الخاصة بك للمتصفح.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">4. ملفات تعريف الارتباط وتحليلات الأداء</h3>
                <p>
                  نستخدم ملفات السجل القياسية وملفات تعريف الارتباط المؤقتة لتذكر تفضيلاتك اللغوية (عربي/إنجليزي)، المظهر البصري المناسب لعينك، وحفظ حالة جلسة التصفح من أجل راحتك وضمان عودة سلسة لمحتواك.
                </p>
              </section>
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Detailed Clauses - English Section */}
          <div className="space-y-6 text-left" dir="ltr">
            <h2 className="text-2xl font-bold border-l-4 border-blue-500 pl-3 text-white">
              Data Privacy & Usage Clauses
            </h2>
            
            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">1. Data Collection & Federation</h3>
                <p>
                  We securely obtain primary validation details such as email records when processing single-sign-on (Google Identity) to authenticate your user profile and load your customized dashboard safely.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">2. AI Processing Standard (Gemini Secure Routing)</h3>
                <p>
                  Generative inputs are routed dynamically through private, custom-coded server endpoints safeguarding proprietary keys. Your generated topics are never aggregated or indexed to feed models or public catalogs.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">3. Protection of Intellectual Assets</h3>
                <p>
                  To secure your brand profiles and strategies against potential copycats or leaks, we enforce strict isolated user namespaces in Firestore. Only authorized logins can view or download content from your project workspace.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">4. Cookies and System Storage</h3>
                <p>
                  Local storage mechanisms persist selected UI values (e.g. Arabic/English preferences, dark style status, and active content brief drafts) to reduce request latency and maintain user session stability.
                </p>
              </section>
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Support/Footer block */}
          <div className="text-center space-y-4 pt-4">
            <h3 className="font-bold text-lg text-white">
              {isAr ? "لديك أي استفسارات أو تخوفات؟" : "Have any questions or concerns?"}
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              {isAr
                ? "إذا كنت ترغب في مراجعة بياناتك، أو الاستفسار عن جدار الحماية الأمني لتطبيقنا، يسعدنا تواصلك الدائم."
                : "Should you desire to request your account deletion, audit data flags, or inquire about firewalls, we support you thoroughly."}
            </p>
            <div className="flex justify-center gap-4">
              <a href="mailto:abdlrhmanmahmoud69@gmail.com">
                <Button variant="outline" size="sm">
                  {isAr ? "مراسلة الإدارة بالبريد" : "Contact Admin via Email"}
                </Button>
              </a>
              <Link to="/">
                <Button variant="gradient" size="sm">
                  {isAr ? "العودة للرئيسية" : "Home Page"}
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
