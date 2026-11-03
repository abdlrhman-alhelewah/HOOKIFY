import { Link } from "react-router-dom";
import { ArrowLeft, Scale, ShieldAlert, Code2, AlertTriangle, Copyright, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/Button";

export default function TermsPage() {
  const { language, t } = useLanguage();
  const isAr = language === "Arabic";

  return (
    <div className="min-h-screen bg-[#060608] text-slate-100 font-sans selection:bg-violet-900 selection:text-white pb-20">
      {/* Background radial glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium mb-4">
          <Scale className="w-3.5 h-3.5" />
          <span>{isAr ? "حماية حقوق الملكية الفكرية والفكرة" : "Safeguarding Ideas & Code Ownership"}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight mb-4">
          {isAr ? "شروط الاستخدام والملكيات" : "Terms & Conditions"}
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
          {isAr
            ? "يرجى قراءة البنود التالية بعناية. بدخولك وتجربة هذا التطبيق، فإنك تقر وتلتزم التزاماً كاملاً بحماية الملكية وعدم سرقة الكود أو الفكرة."
            : "Please read our trade-protection terms thoroughly. By accessing this trial app, you legally commit to respecting intellectual property."}
        </p>
        <p className="text-xs text-slate-500 mt-2">
          {isAr ? "آخر تحديث: يونيو 2026" : "Last updated: June 2026"}
        </p>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 md:p-10 shadow-2xl space-y-12">
          
          {/* IP Alert - Bilingual warnings */}
          <div className="p-6 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200">
            <div className="flex gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm leading-relaxed">
                <span className="font-bold block">
                  {isAr 
                    ? "تحذير قانوني صارم بشأن الملكية الفكرية والكود المصدر:" 
                    : "Strict Intellectual Property & Code Protection Alert:"}
                </span>
                <p>
                  {isAr
                    ? "هذا التطبيق بكافة خوارزمياته، رموزه (Source Code)، وتصميمه الهندسي وفكرته الإبداعية مملوك بالكامل وحصرياً لصاحب تطبيق Hookify. يُحظر حظراً تاماً نسخ، أو تعديل، أو إعادة تصميم وتوليف، أو نشر نسخة مقلدة (Remix) أو انتحال المجهود البرمجي دون موافقة كتابية صريحة. سنلزم أي جهة مخالفة بالتبعات القانونية فورا."
                    : "This application's architecture, workflows, algorithms, styling details, and source code are the proprietary assets of the Hookify Creator. Recreating, copying, scraping, cloning, or compiling remixes of this software constitutes direct copyright violation, punishable under absolute federal intellectual property laws."}
                </p>
              </div>
            </div>
          </div>

          {/* Three Column Features highlighting security and legal */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
              <Code2 className="w-6 h-6 text-purple-400 mx-auto" />
              <h4 className="font-bold text-sm text-white">{isAr ? "شفرة مشفرة ومحميّة" : "Source Code Protected"}</h4>
              <p className="text-slate-400 text-xs leading-normal">
                {isAr ? "نحن لا نتيح الكود لأطراف خارجية لمنع الهندسة العكسية." : "We never expose raw server logic, preventing exploitation."}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
              <AlertTriangle className="w-6 h-6 text-blue-400 mx-auto" />
              <h4 className="font-bold text-sm text-white">{isAr ? "حظر الاستحواذ أو السرقة" : "Reverse-Engineering Bar"}</h4>
              <p className="text-slate-400 text-xs leading-normal">
                {isAr ? "الدخول للتجربة والتعلم فقط، وليس لنقل وتعديل الأفكار." : "Access is strictly for trial & feedback, not code duplication."}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
              <Copyright className="w-6 h-6 text-amber-400 mx-auto" />
              <h4 className="font-bold text-sm text-white">{isAr ? "حقوق الفكرة والابتكار" : "Absolute Concept Rights"}</h4>
              <p className="text-slate-400 text-xs leading-normal">
                {isAr ? "كافة النماذج المبتكرة والزوايا مُسجلة باسم صاحبها الأصلي." : "Proprietary generative formulas are entirely owned."}
              </p>
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Detailed Clauses - Arabic Section */}
          <div className="space-y-6 text-right" dir="rtl">
            <h2 className="text-2xl font-bold border-r-4 border-purple-500 pr-3 text-white">
              بنود وشروط الاستخدام بالتفصيل
            </h2>
            
            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">1. رخصة التجريب المحدودة</h3>
                <p>
                  نمنحك دخولًا آمنًا وتجريبيًا ومؤقتًا للموقع لاختباره وإرسال آرائك واقتراحاتك كصانع محتوى. هذه الرخصة لا تعني بأي شكل من الأشكال التنازل عن أي جزء من واجهات التطبيق، أو ملفاته، أو محتواه الداخلي.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">2. عدم أحقية النسخ والـ Remix</h3>
                <p>
                  يمنع منعاً باتاً إنشاء تطبيق مماثل تماماً أو استخدام ميكانيزم العمل من قِبل أي مستخدم آخر ونسبها لأنفسهم. أي محاولة لعمل "ريمكس" أو سحب الأكواد البرمجية (Scraping) أو استنساخ البنية المنطقية سيعتبر انتهاكاً إجرامياً للملكية الفكرية.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">3. ملكية الكود والتصميم والرموز</h3>
                <p>
                  جميع تصاميم الأزرار، التوزيعات اللونية، النصوص، أكواد الربط ومحاولات الاتصال بالشبكة (الـ Retries)، ونماذج التوجيه الخاصة بالذكاء الاصطناعي هي ملك حصري لمطور الأداة، ومحميّة بموجب القوانين المحلية والدولية لحق المطور الرقمي.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">4. حدود المسؤولية والضمانات</h3>
                <p>
                  التطبيق ما زال في نسخته التجريبية الأولى وقد يشهد تحسينات أو انقطاعات مؤقتة بداعي الصيانة أو تحديث حدود الأمان. هدفنا الأساسي من توفير النسخة هو التقييم وتطوير المنتج للأفضل لخدمتكم، لذا يرجى مراعاة ذلك.
                </p>
              </section>
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Detailed Clauses - English Section */}
          <div className="space-y-6 text-left" dir="ltr">
            <h2 className="text-2xl font-bold border-l-4 border-blue-500 pl-3 text-white">
              Detailed Terms of Trial and Security
            </h2>
            
            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">1. Limited Non-Exclusive License</h3>
                <p>
                  Unauthorized production reproduction is strongly barred. We grant you a standard, temporary, revocable, single-profile key to review visual components and offer feedback. No title transfer occurs.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">2. Prohibitions on Remixing and Cloning</h3>
                <p>
                  Extracting source files, scraping dynamic configurations, copying database hierarchies, or releasing clone clones (or direct derivatives) under identical or rewritten branding is completely prohibited. Proprietary assets remain copyrighted.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">3. Intellectual Code & Prompt Ownership</h3>
                <p>
                  Our internal system designs, structured prompting templates, styling profiles, and connection strategies are safeguarded. Any replication or trade-secret interception will incur direct legal actions.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-white">4. Trial Liability Limits</h3>
                <p>
                  Since this tool represents a beta-phase pre-release model, features can shift or temporarily halt. We utilize automatic retries and secure rules to maximize performance and shield work against data loss or leaks.
                </p>
              </section>
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Support/Footer block */}
          <div className="text-center space-y-4 pt-4">
            <h3 className="font-bold text-lg text-white">
              {isAr ? "هل ترغب في الحصول على شراكة قانونية برمجية؟" : "Interested in code licensing or partnership?"}
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              {isAr
                ? "نحن نرحب بالأفكار التعاونية شريطة حفظ كل طرف لجهوده وأفكاره. تواصل معنا لأي استفسار رسمي."
                : "We welcome collaborative business ideas, provided all proprietary work is preserved. Reach out of any official request."}
            </p>
            <div className="flex justify-center gap-4">
              <a href="mailto:abdlrhmanmahmoud69@gmail.com">
                <Button variant="outline" size="sm">
                  {isAr ? "المرور بالبريد الرسمي" : "Email Creator"}
                </Button>
              </a>
              <Link to="/">
                <Button variant="gradient" size="sm">
                  {isAr ? "رئيسية التطبيق" : "Back to Home"}
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
