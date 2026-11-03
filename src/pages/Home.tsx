import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import {
  Sparkles,
  Zap,
  Video,
  PenTool,
  LayoutTemplate,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  Play,
  Calendar,
  Compass,
  BookOpen,
  Globe,
  ArrowRight,
  Clock,
  Settings,
  Save,
  ChevronDown,
  HelpCircle
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent } from "@/components/ui/Card";
import { useLanguage } from "@/contexts/LanguageContext";
import UpgradeModal from "@/components/UpgradeModal";

export default function Home() {
  const { user, signInWithGoogle, logOut, isPro, setShowUpgradeModal } = useAuth();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const isAr = language === "Arabic";
  const [activeWalkthroughTab, setActiveWalkthroughTab] = useState("calendar");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      qEn: "What is Hookify and how does it work?",
      qAr: "ما هو هوكيفاي وكيف يعمل؟",
      aEn: "Hookify is an advanced, AI-powered copywriting workspace designed specifically for creators, marketers, and businesses. It transforms single-sentence ideas into comprehensive 30-day content calendars, viral video hook scripts, SEO-friendly captions, and competitor gap audits in seconds.",
      aAr: "هوكيفاي هو مساحة عمل كتابية متطورة مدعومة بالذكاء الاصطناعي ومخصصة لصناع المحتوى، والمسوقين، وأصحاب المشاريع. يحوّل الأفكار البسيطة إلى تقويم منشورات كامل لـ 30 يوماً، وسيناريوهات تصوير مشهدية للفيديوهات، وخطافات فيروسية تجذب الانتباه في ثوانٍ معدودة."
    },
    {
      qEn: "Does Hookify support the Arabic language fluently?",
      qAr: "هل يدعم هوكيفاي اللغة العربية بشكل ممتاز؟",
      aEn: "Absolutely! Hookify has state-of-the-art Arabic AI engine templates tuned directly for Middle Eastern audience hooks, local slang, conversion copywriting, and engaging reels storytelling patterns.",
      aAr: "بكل تأكيد! تم تصميم وتدريب هوكيفاي ليدعم اللغة العربية الفصحى واللهجات المحلية بدقة فائقة. ينتج أنماط خطافات وقوالب ريلز وسيناريوهات تصوير مهيأة خصيصاً لجذب وثني إبهام المتصفح العربي بمعدل تصفح قياسي."
    },
    {
      qEn: "Can I try Hookify for free?",
      qAr: "هل يمكنني تجربة المنصة مجاناً؟",
      aEn: "Yes, you can register and generate content using our Free Tier with daily refresh limits. No credit card required. If you want infinite power, you can upgrade to the Pro plan anytime.",
      aAr: "نعم، يمكنك التسجيل وتوليد المحتوى بشكل مجاني تماماً عبر خطتنا المجانية ذات التجديد اليومي دون الحاجة لبطاقة ائتمانية. لتفعيل القوة القصوى للأداة، يمكنك الترقية إلى الخطة الاحترافية (Pro) في أي وقت."
    },
    {
      qEn: "Can I cancel my Pro subscription at any time?",
      qAr: "هل يمكنني إلغاء اشتراكي الاحترافي في أي وقت?",
      aEn: "Yes, you can manage or cancel your subscription directly from your settings dashboard with zero hidden strings.",
      aAr: "بالتأكيد! يمكنك إدارة أو إلغاء اشتراكك بنقرة واحدة من لوحة التحكم والإعدادات الخاصة بحسابك، دون أي شروط مخفية أو التزامات طويلة الأجل."
    }
  ];

  // State elements for the Live Title & Hook CTR Analyzer Sandbox
  const [testTitle, setTestTitle] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [scores, setScores] = useState({ curiosity: 0, emotional: 0, clarity: 0, overall: 0 });
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const analyzeTitle = () => {
    if (!testTitle.trim()) return;
    const len = testTitle.length;
    
    // Scoring logic
    let curiosity = Math.min(96, Math.max(30, len * 1.8 + (testTitle.includes("؟") || testTitle.includes("?") ? 22 : 0)));
    let emotional = Math.min(94, Math.max(25, 40 + (testTitle.match(/(سر|كيف|الذهب|أموال|خسارة|سرقة|أرباح|فضائح|كذب|تحذير|خسرت|lying|secret|cheat|million|fail|mistake|shock|warning|hack|reveal)/gi) ? 45 : 0)));
    let clarity = Math.min(98, Math.max(35, len < 12 ? 35 : len > 110 ? 45 : 88));
    
    // Balanced penalty or random variation
    if (testTitle.length > 150) {
      clarity = Math.max(20, clarity - 30);
    }
    
    const overall = Math.round((curiosity * 0.4) + (emotional * 0.4) + (clarity * 0.2));
    
    const arabicTips = [];
    if (len < 15) {
      arabicTips.push("⚠️ العنوان قصير جداً - أضف تفصيلاً يصف الفائدة الحقيقية أو الجائزة التي سيحصدها المشاهد.");
    }
    if (!testTitle.includes("؟") && !testTitle.includes("?")) {
      arabicTips.push("💡 جرّب صياغة العنوان بأسلوب سؤال («هل»، «ماذا لو»..) لإثارة فضول المتابع بشكل حاد.");
    }
    if (!testTitle.match(/(سر|كيف|لماذا|أفضل|حقيقة|أخطاء|تحذير|طريقة)/)) {
      arabicTips.push("🔥 أضف كلمة قوية تفاعلية مثل (سر، حقيقة، أسرار، أخطاء فادحة، احذر) لزيادة قوة النقر.");
    }
    if (arabicTips.length === 0) {
      arabicTips.push("✅ صياغة في غاية الروعة! العنوان متوازن، يثير حب الاستطلاع، وله وضوح فائق، جاهز للنشر.");
    }

    const englishTips = [];
    if (len < 15) {
      englishTips.push("⚠️ Title is too short - add a descriptive context to explain the actual value.");
    }
    if (!testTitle.includes("?") && !testTitle.includes("y") && !testTitle.includes("w")) {
      englishTips.push("💡 Try adding a question mark (?) or word-prompts like 'How' or 'Why' to increase curiosity.");
    }
    if (!testTitle.match(/(secret|lying|cheat|mistake|earn|million|blueprint|guide|warning|proven|hack|reveal)/i)) {
      englishTips.push("🔥 Use hyper-trigger keywords like 'blueprint', 'warning', 'secrets', or 'fatal mistakes' to pump click authority.");
    }
    if (englishTips.length === 0) {
      englishTips.push("✅ Excellent heading hook! It has high emotional response quotients. Ready to go live!");
    }

    setScores({ curiosity, emotional, clarity, overall });
    setSuggestions(language === "English" ? englishTips : arabicTips);
    setAnalyzed(true);
  };

  const handleSignIn = async () => {
    if (!user) {
      try {
        await signInWithGoogle();
        navigate("/dashboard");
      } catch (error: any) {
        if (error?.code === "auth/popup-closed-by-user") {
          alert("Sign-in popup was closed before completing. If it was blocked, please allow popups for this site, or open the preview in a new tab.");
        } else if (error?.code === "auth/popup-blocked") {
          alert("Sign-in popup was blocked by your browser. Please allow popups or open the preview in a new tab.");
        } else {
          alert("Error signing in: " + (error?.message || "Unknown error"));
        }
      }
    } else {
      await logOut();
    }
  };

  const handleGetStarted = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      navigate("/dashboard");
    } else {
      handleSignIn();
    }
  };

  const handleNavigateToFeature = (path: string) => {
    if (user) {
      navigate(path);
    } else {
      handleSignIn();
    }
  };

  // Walkthrough Simulator previews
  const walkthroughData: Record<string, {
    titleEn: string;
    titleAr: string;
    descEn: string;
    descAr: string;
    icon: any;
    demoOutputEn: string;
    demoOutputAr: string;
    fieldEn: string;
    fieldAr: string;
    path: string;
  }> = {
    full: {
      titleEn: "Full Content Generator",
      titleAr: "صوت وشكل متكامل للخدمة",
      descEn: "Generate complete, professional articles or posts from a tiny spark of an idea.",
      descAr: "أنشئ منشوراً تسويقياً متكاملاً يحتوي على الخطاف الصادم، وجسم المنشور المثير، والدعوة للإجراء.",
      icon: LayoutTemplate,
      fieldEn: "Create fully strategic article or post from 1 sentence.",
      fieldAr: "إنشاء منشور استراتيجي كامل من فكرة بسيطة.",
      path: "/dashboard/full",
      demoOutputEn: `**💥 Hook:** Stop trying to sell your product benefits. Nobody cares about them. Here's why...\n\n**📝 Body:** Customers don't buy "features". They buy a better version of themselves. If you are selling digital tools, don't sell "organized files" — sell getting home at 5 PM. Focus on the emotional shift.\n\n**🚀 Call To Action:** Let me know down in the comments: what emotional payoff does your product offer?`,
      demoOutputAr: `**💥 مقدمة خاطفة:** توقف عن بيع ميزات منتجك الفنية. لا أحد يكترث بها! إليك السر...\n\n**📝 صلب المنشور:** العملاء لا يشترون الميزات، بل يشترون النسخة الأفضل من أنفسهم التي سيوفرها منتجك. إذا كنت تبيع تطبيقاً لإدارة الوقت، لا تلح في الحديث عن "جداول العمل المتزامنة" — بل بعهم "راحة البال والعودة للمنزل مبكراً في الخامسة مساءً". ركز دائماً على القيمة الشعورية الحقيقية.\n\n**🚀 دعوة للتفاعل:** اكتب لي في التعليقات الآن: ما هي القيمة العاطفية التي يقدمها منتجك لعملائك؟`
    },
    calendar: {
      titleEn: "30-Day Content Planner",
      titleAr: "تقويم ومخطط المحتوى",
      descEn: "Say goodbye to 'what should I post today?' Plan an authentic monthly agenda with 1-click.",
      descAr: "وداعاً للتشتت والحيرة اليومية! خطط لجدول منشوراتك لشهر كامل بضغطة واحدة وبذكاء تسويقي خارق.",
      icon: Calendar,
      fieldEn: "Generate structured 30-day posting outline & ideas.",
      fieldAr: "جدول محتوى تفاعلي 30 يوم من الأفكار والسيناريوهات.",
      path: "/dashboard/calendar",
      demoOutputEn: `📅 **Week 1 Focus: The authority building loop**\n- **Day 1**: Bust the biggest mythical lie in your niche (Authority Angle).\n- **Day 3**: Share a high-growth personal lesson you learned the hard way.\n- **Day 5**: Showcase a real transformation or framework sheet.`,
      demoOutputAr: `📅 **تركيز الأسبوع الأول: حلقة بناء الثقة والسلطة**\n- **اليوم 1**: اهدم الخرافة الأكبر الشائعة في مجالك التسويقي (زاوية السلطة والخبرة).\n- **اليوم 3**: شارك تجربة شخصية أو دراسة حالة صعبة تفوقت بها وعلمتك درساً ثميناً.\n- **اليوم 5**: استعرض قصة نجاح حية لأحد عملائك قبل استخدام منتجك وبعده.`
    },
    competitor: {
      titleEn: "Competitor Intelligence",
      titleAr: "استخبارات وذكاء المنافسين",
      descEn: "Spy on leading competitor content strategies, spot gaps, and out-smart their best viral hits.",
      descAr: "حلل حسابات ومحتوى منافسيك المفضلين بذكاء، واكتشف فجوات السوق، والخطافات لجذب جمهورهم إليك.",
      icon: Compass,
      fieldEn: "Audit competitor keywords, channels, and content hooks.",
      fieldAr: "حلل الكلمات المفتاحية لمنافسيك وثغرات الانتشار لديهم.",
      path: "/dashboard/competitor-intel",
      demoOutputEn: `🔮 **Competitor Strategy Audit**\n• **Core Hook Pattern**: "The forbidden secret about [X]..." (CTR: High)\n• **Content Gap**: All competitors talk about 'WHAT' tools to use, but zero competitors explain 'HOW' to implement the workflow. Make raw implementation guides.`,
      demoOutputAr: `🔮 **تدقيق استراتيجيات المنافسين**\n• **صيغة خطافاتهم الأكثر انتشاراً**: "السر المحظور الذي يخفيه خبراء الـ [X] عنك..." (معدل تصفح مرتفع جداً).\n• **الفجوة التسويقية المتاحة**: جميع منافسيك يتحدثون فقط عن "ما هي" الأدوات، ولكن لا أحد يوضح "كيف" يتم دمجها عملياً. ركز على شروحات التثبيت المباشرة.`
    },
    swipe: {
      titleEn: "Exclusive Swipe File",
      titleAr: "مكتبة المحتوى الجاهز (Swipe)",
      descEn: "Access hundreds of winning, customizable formulas tested across millions of views.",
      descAr: "احصل على مئات الصيغ والنماذج الجاهزة التي حققت ملايين المشاهدات للتعديل الفوري والاستفادة منها.",
      icon: BookOpen,
      fieldEn: "Browse top hook templates, viral angles, & CTAs.",
      fieldAr: "تصفح أفضل قوالب الخطافات في السوشيال ميديا.",
      path: "/dashboard/swipe-file",
      demoOutputEn: `🚀 **Formula: The Direct Reality Shock (1.2M views average)**\n- **Template**: "Everyone is lying to you about [Topic]. Here is the actual truth: [Truth]"\n- **Example**: "Everyone is lying to you about SaaS coding. Here is the actual truth: you don't need a CS degree to earn $10k/mo."`,
      demoOutputAr: `🚀 **صيغة: الصدمة الواقعية المباشرة (معدل انتشار 1.2M مشاهدة)**\n- **الهيكل الجاهز**: "الجميع يكذب عليك بخصوص [الموضوع]. إليك الحقيقة التي يخفونها: [الحقيقة]"\n- **مثال تطبيقي**: "الجميع يكذب عليك بخصوص كتابة الأكواد. إليك الحقيقة الصادقة: لست بحاجة لشهادة جامعية لتربح 5 آلاف دولار شهرياً."`
    }
  };

  const activeWalkthrough = walkthroughData[activeWalkthroughTab] || walkthroughData.calendar;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-transparent text-slate-100 selection:bg-purple-900 selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-blue-400 shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 dark:from-white dark:to-slate-400 tracking-tight">
              Hookify
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              {isAr ? "المميزات" : "Features"}
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              {isAr ? "كيف يعمل؟" : "How it Works"}
            </a>
            <a
              href="#demo"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              {isAr ? "التحليل الذكي (تجربة)" : "Live Demo"}
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              {isAr ? "الأسعار" : "Pricing"}
            </a>
          </div>

          <div className="flex items-center gap-3">
            {/* Elegant Language Switcher on Nav Header (Responsive) */}
            <Button
              variant="outline"
              size="sm"
              className="px-2.5 h-9 bg-white/5 border-white/10 text-slate-200 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
              onClick={() => setLanguage(language === "English" ? "Arabic" : "English")}
              title={isAr ? "Switch UI to English" : "تحويل الواجهة للعربية"}
            >
              <Globe className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold">
                {isAr ? "EN" : "العربية"}
              </span>
            </Button>

            <Button variant="ghost" className="hidden sm:inline-flex" onClick={handleSignIn}>
              {user ? (isAr ? "تسجيل الخروج" : "Sign Out") : (isAr ? "تسجيل الدخول" : "Sign In")}
            </Button>
            <Button variant="gradient" className="shadow-lg shadow-purple-500/10" onClick={handleGetStarted}>
              {user ? (isAr ? "لوحة التحكم" : "Go to Dashboard") : (isAr ? "ابدأ مجاناً" : "Get Started Free")}
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-28">
          {/* Decorative ambient background glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs sm:text-sm font-medium mb-8 shadow-lg shadow-purple-500/10"
            >
              <Sparkles className="w-4 h-4 animate-pulse text-purple-400" />
              <span>
                {language === "English" 
                  ? "Brand New Version 2.0 with Content Calendars & Spy Audits" 
                  : "إطلاق الإصدار 2.0 الجديد كلياً مع مخططات المحتوى ومراقبة المنافسين"}
              </span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-7xl font-heading font-extrabold tracking-tight mb-6 leading-[1.15]"
            >
              {language === "English" ? (
                <>
                  Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400">Viral Content</span>
                  <br /> & Smart Calendars with AI
                </>
              ) : (
                <>
                  ضاعف نتائجك واصنع <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400">محتوى فيروسي</span>
                  <br /> وخطط ذكية بالذكاء الاصطناعي
                </>
              )}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              {language === "English" 
                ? "Stop staring at a blank page. Transform raw ideas into ready-to-publish reels, calendars, hook lists, spy audits, and storytelling scripts optimized perfectly for your business growth."
                : "وداعاً لأزمتك مع إنتاج الأفكار. حوّل الكلمة الواحدة لتقويم كامل لشهرك، وسيناريوهات تصوير لفيديوهاتك، ونصوص كابشن وخطافات بمعدل مشاهدات قياسي بضغطة زر واحدة."}
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto sm:max-w-none"
            >
              <Button
                variant="gradient"
                size="lg"
                className="w-full sm:w-auto text-base px-8 h-12 shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                onClick={handleGetStarted}
              >
                {t("Start Generating Free ")}
                <ChevronRight className="w-4 h-4 rtl:mr-1 ltr:ml-1 rtl:-scale-x-100" />
              </Button>
              <a href="#demo" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base h-12 border-white/10 bg-white/5 hover:bg-white/10"
                >
                  <Play className="w-4 h-4 rtl:ml-2 ltr:mr-2 fill-current" /> {t("Watch Demo")}
                </Button>
              </a>
            </motion.div>

            {/* Premium Generated Interactive Visual Showcase */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-16 relative max-w-5xl mx-auto"
            >
              {/* Outer light bar and shadow container */}
              <div className="absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-65 blur-xs" />
              <div className="absolute -inset-1 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-3xl opacity-20 blur-xl pointer-events-none" />

              {/* The gorgeous mock browser frame */}
              <div className="rounded-3xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl overflow-hidden text-left rtl:text-right relative">
                
                {/* Browser top-bar */}
                <div className="h-12 border-b border-white/10 bg-white/5 flex items-center justify-between px-6">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="text-xs text-slate-500 font-mono ml-4 rtl:mr-4 rtl:ml-0">https://hookify.co/dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black font-mono">
                      {language === "English" ? "Active VIP Connection" : "اتصال مشفّر نشط"}
                    </span>
                  </div>
                </div>

                {/* Main showcase grid */}
                <div className="grid lg:grid-cols-12">
                  
                  {/* Sidebar Simulator */}
                  <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 bg-white/[0.01] p-5 space-y-4">
                    <p className="text-slate-500 text-xs font-black uppercase tracking-wider">
                      {language === "English" ? "Interactive Demo Modules" : "استعراض الخدمات تفاعلياً"}
                    </p>
                    <div className="space-y-1.5">
                      {Object.entries(walkthroughData).map(([key, data]) => {
                        const Icon = data.icon;
                        const isSelected = activeWalkthroughTab === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setActiveWalkthroughTab(key)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-left rtl:text-right relative ${
                              isSelected
                                ? "bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-transparent text-white border border-purple-500/20 shadow-inner"
                                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? "text-purple-400" : "text-slate-500"}`} />
                            <span className="flex-1">
                              {language === "English" ? data.titleEn : data.titleAr}
                            </span>
                            {isSelected && (
                              <span className="absolute right-3 rtl:right-auto rtl:left-3 w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/10 to-transparent border border-purple-500/10">
                      <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-1">
                        {language === "English" ? "Real-Time AI Output" : "مخرجات الذكاء الاصطناعي الفورية"}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {language === "English"
                          ? "Click each tab above to see the actual structure, formats and output options available with Gemini 3.5 support."
                          : "اضغط على أي تبويب بالأعلى لترى التخطيط الحقيقي، والمخرجات الفعلية التي ينتجها الذكاء الاصطناعي."}
                      </p>
                    </div>
                  </div>

                  {/* Simulator Main Content Grid Area */}
                  <div className="lg:col-span-8 p-6 flex flex-col gap-5 justify-between bg-slate-950">
                    
                    {/* Header info of active item */}
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 text-xs text-purple-400 font-bold bg-purple-500/10 px-2.5 py-1 rounded-md">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{language === "English" ? activeWalkthrough.titleEn : activeWalkthrough.titleAr}</span>
                      </div>
                      <h4 className="text-lg font-bold text-white mt-1.5">
                        {language === "English" ? activeWalkthrough.descEn : activeWalkthrough.descAr}
                      </h4>
                    </div>

                    {/* Rich simulated generated block */}
                    <div className="flex-1 bg-white/[0.03] rounded-2xl border border-white/10 p-5 font-sans relative overflow-hidden group">
                      <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2 bg-white/5 text-[9px] font-mono px-2 py-0.5 rounded text-slate-400">
                        {language === "English" ? "Gemini Pro Generation" : "توليد فوري فائق الدقة"}
                      </div>
                      <div className="space-y-3 whitespace-pre-line text-sm text-slate-200 leading-relaxed">
                        {language === "English" ? activeWalkthrough.demoOutputEn : activeWalkthrough.demoOutputAr}
                      </div>
                    </div>

                    {/* Bottom action trigger bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-4">
                      <p className="text-xs text-slate-400">
                        {language === "English" 
                          ? "⚡ Directly connected to social media engines." 
                          : "⚡ متصل مباشرة بمحركات الانتشار وتهيئة المحركات."}
                      </p>
                      <Button
                        variant="gradient"
                        size="sm"
                        className="w-full sm:w-auto text-xs"
                        onClick={() => handleNavigateToFeature(activeWalkthrough.path)}
                      >
                        {language === "English" ? `Go to ${activeWalkthrough.titleEn}` : `الانتقال لمحرك: ${activeWalkthrough.titleAr}`}
                        <ChevronRight className="w-4 h-4 rtl:mr-1 ltr:ml-1 rtl:-scale-x-100" />
                      </Button>
                    </div>

                  </div>

                </div>

              </div>
            </motion.div>
          </div>
        </section>

        {/* Interactive Title CTR & Hook Analyzer Sandbox (Suggestion 2) */}
        <section id="demo" className="py-20 relative overflow-hidden bg-slate-950/20 border-t border-white/5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/5 rounded-full blur-[140px] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-5xl font-heading font-extrabold mb-3 text-slate-100">
                {language === "English" ? "Instant Viral Title Scorer" : "محلل وجاذب العناوين الفوري"}
              </h2>
              <p className="text-slate-400 text-base">
                {language === "English"
                  ? "Test your video hooks or LinkedIn headlines in real time. Optimize for 2.5x higher click retention."
                  : "اختبر قوة عنوان الفيديو أو عنوان منشورك الآن تفاعلياً. احصل على نقاط كفاءة ونصائح تحسين فورية."}
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
              
              {/* Input side */}
              <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-md flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest block font-mono">
                      {language === "English" ? "Enter Your Draft Hook / Title" : "اكتب مسودة عنوانك أو خطافك هنا"}
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {testTitle.length} ch
                    </span>
                  </div>
                  
                  <textarea
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder={
                      language === "English"
                        ? "e.g., 3 mistakes everyone makes when starting a software agency..."
                        : "مثال: 3 أخطاء فادحة تجعلك تخسر 80% من أرباح متجرك الإلكتروني..."
                    }
                    className="w-full h-32 bg-black/60 border border-white/10 rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-500 font-sans focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={analyzeTitle}
                    disabled={!testTitle.trim()}
                    variant="gradient"
                    className="flex-1 py-3 h-11 text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-lg shadow-purple-500/10 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5 ltr:inline rtl:hidden" />
                    <span>{language === "English" ? "Analyze Attraction Potential" : "تحليل قوة جذب العنوان"}</span>
                    <Sparkles className="w-4 h-4 ml-1.5 rtl:inline ltr:hidden" />
                  </Button>
                  {testTitle && (
                    <Button
                      onClick={() => {
                        setTestTitle("");
                        setAnalyzed(false);
                      }}
                      variant="outline"
                      className="border-white/10 hover:bg-white/5 text-slate-400 shrink-0 h-11 px-4 rounded-xl text-xs"
                    >
                      {language === "English" ? "Clear" : "مسح"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Score Results side */}
              <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-md flex flex-col justify-center">
                {analyzed ? (
                  <div className="space-y-6">
                    {/* Big score indicator */}
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 font-mono">
                        {language === "English" ? "Overall Viral Quotient" : "التقييم الفيروسي العام"}
                      </span>
                      <div className="relative inline-flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-full blur-xl opacity-30 animate-pulse" />
                        <span className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 font-mono tracking-tight relative z-10">
                          {scores.overall}%
                        </span>
                      </div>
                    </div>

                    {/* Breakdown sliders */}
                    <div className="space-y-3 pt-2">
                      {[
                        { 
                          label: language === "English" ? "Curiosity & Mystery" : "إثارة الفضول والغموض", 
                          score: scores.curiosity, 
                          color: "from-purple-500 to-pink-500" 
                        },
                        { 
                          label: language === "English" ? "Emotional Trigger" : "الدافع والتأثير العاطفي", 
                          score: scores.emotional, 
                          color: "from-indigo-500 to-blue-500" 
                        },
                        { 
                          label: language === "English" ? "Clarity & Simplicity" : "الوضوح وسهولة الاستيعاب", 
                          score: scores.clarity, 
                          color: "from-emerald-500 to-teal-500" 
                        },
                      ].map((bar, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-300">
                            <span>{bar.label}</span>
                            <span className="font-mono">{bar.score}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${bar.score}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className={`h-full bg-gradient-to-r ${bar.color} rounded-full`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AI Feedback tips */}
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block mb-2 font-mono">
                        {language === "English" ? "AI Copywriting Feedback" : "توصيات الذكاء الاصطناعي الفورية"}
                      </span>
                      <ul className="space-y-2">
                        {suggestions.map((tip, index) => (
                          <li key={index} className="text-xs text-slate-300 leading-relaxed flex items-start gap-1.5">
                            <span className="text-purple-400 select-none">✦</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto shadow-inner text-2xl">
                      🔮
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">
                        {language === "English" ? "Analyze your CTR" : "بانتظار عنوانك لتحليله"}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-normal">
                        {language === "English"
                          ? "Enter a potential draft title on the left to unpack curiosity triggers and score rankings instantly."
                          : "اكتب مسودة عنوان منشورك وسيقوم النظام فوراً باحتساب نسب الجلب العاطفي ومعدلات النقر المقدرة لدينا."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-24 relative overflow-hidden bg-white/[0.01]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-heading font-extrabold mb-4 text-slate-100">
                {t("How It Works")}
              </h2>
              <p className="text-slate-400 text-lg">
                {language === "English" 
                  ? "A simplified workflow designed to scale your content system without exhaustion"
                  : "دورتك الإنتاجية المتكاملة بلا تشتت أو استنزاف مستمر للجهد والوقت"}
              </p>
            </div>
            
            <div className="grid md:grid-cols-4 gap-8 relative">
              <div className="hidden md:block absolute top-8 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-purple-500/0 via-purple-500/25 to-purple-500/0" />
              {[
                { 
                  step: "1", 
                  titleEn: "Enter Topic & Brand", 
                  titleAr: "أدخل الفكرة والبراند", 
                  descEn: "Provide a quick topic idea, selected demographics, and the desired voice guidelines.", 
                  descAr: "اكتب موضوعاً بسيطاً أو فكرة عامة، وحدد جمهورك المستهدف ونبرة علامتك لكي يتكلم الذكاء الاصطناعي باسمك." 
                },
                { 
                  step: "2", 
                  titleEn: "Draft Dynamic Calendar", 
                  titleAr: "أنشئ تقويماً تفاعلياً", 
                  descEn: "Use the calendar tool to lay down cohesive monthly themes that keep viewers hooked.", 
                  descAr: "اضغط لتوزيع الفكرة على جدول متكامل مبني استراتيجياً ليربط جمهورك بك طوال الشهر بدون فراغات." 
                },
                { 
                  step: "3", 
                  titleEn: "Audit and Optimize", 
                  titleAr: "حلل المنافسين وطوّر", 
                  descEn: "Instantly screen top competitors for angles and formulas to bypass their best results.", 
                  descAr: "افحص أساليب المنافسين واحصل على تقارير تفصيلية لتطوير أفضل الخطافات والكابشنز والسيناريوهات." 
                },
                { 
                  step: "4", 
                  titleEn: "Download and Publish", 
                  titleAr: "حمّل واحصد المشاهدات", 
                  descEn: "Export your viral hooks, storytelling scripts, and calendars directly to step up immediately.", 
                  descAr: "احصل على النصوص الجاهزة والسيناريوهات المشهدية للتصوير، وحقّق النتائج التي تحلم بها فوراً." 
                }
              ].map((s, i) => (
                <div key={i} className="text-center space-y-4 relative z-10 bg-white/[0.02] p-5 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-purple-500/40 text-purple-400 text-xl font-black flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">
                    {language === "English" ? s.titleEn : s.titleAr}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {language === "English" ? s.descEn : s.descAr}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid Section (Representing all 8 services offered) */}
        <section
          id="features"
          className="py-24 bg-white/[0.02] border-y border-white/10 relative"
        >
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-heading font-extrabold mb-4 text-slate-100">
                {language === "English" ? "Everything You Need to Go Viral" : "منظومتك المتكاملة لتصدّر التريند"}
              </h2>
              <p className="text-slate-400 text-lg">
                {language === "English"
                  ? "Say goodbye to random unsystematic posting. Use our suite of 8 specific AI content modules."
                  : "توقف عن النشر العشوائي تماماً. استغل قوة 8 أدوات تسويقية متكاملة تدير دورة صناعة المحتوى الخاصة بك."}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: LayoutTemplate,
                  titleEn: "Full Content Composer",
                  titleAr: "صانع المنشورات المتكامل",
                  descEn: "Generates complete high-impact social posts from raw notes complete with formatting.",
                  descAr: "يكتب منشورك التسويقي المتكامل متضمناً خطافاً جذاباً، وصياغة مقنعة ودعوى للاتصال والتفاعل.",
                  path: "/dashboard/full"
                },
                {
                  icon: Zap,
                  titleEn: "Viral Hooks Engine",
                  titleAr: "مُولّد الخطافات الفيروسية",
                  descEn: "10 high-conversions hook options crafted instantly for TikTok, Reels, or LinkedIn.",
                  descAr: "صمم 10 خطافات افتتاحية لمقاطع الفيديو أو التغريدات لجذب التمرير وجبر المتابعين الفوري.",
                  path: "/dashboard/hooks"
                },
                {
                  icon: PenTool,
                  titleEn: "Engagement Caption AI",
                  titleAr: "توليد كابشن ذكي تفاعلي",
                  descEn: "Storytelling, promotional, or value-driven social captions packed with relevant hashtags.",
                  descAr: "اكتب نصوص شرح تفصيلية تسرد قصة أو تعزز المبيعات مع الرموز التعبيرية المعبرة بدقة.",
                  path: "/dashboard/captions"
                },
                {
                  icon: Video,
                  titleEn: "Reel Script Writer",
                  titleAr: "سيناريوهات تصوير للفيديوهات",
                  descEn: "Full scene breakdowns with specific camera orientations and premium B-Roll visuals description.",
                  descAr: "تنظيم سيناريوهات احترافية مشهداً بمشهد لإنتاج الفلوقات ولقطات البي رول بشكل يجبر المتابعة.",
                  path: "/dashboard/scripts"
                },
                {
                  icon: MessageSquare,
                  titleEn: "Unique Marketing Angles",
                  titleAr: "زوايا تسويقية فريدة لعلامتك",
                  descEn: "Instantly flip a single simple topic into 5 creative target marketing viewpoints.",
                  descAr: "حوّل المفهوم الواحد المعتاد إلى 5 أفكار مختلفة للتقديم لتصل لشرائح جمهور متعددة ومتنوعة.",
                  path: "/dashboard/angles"
                },
                {
                  icon: Calendar,
                  titleEn: "Content Calendar Planner",
                  titleAr: "تقويم ومخطط المحتوى الشهري",
                  descEn: "Generate structured weekly or monthly agenda content maps aligning with your targets.",
                  descAr: "أنشئ جدولًا استراتيجياً غنياً بالأفكار والمواعيد لتتحكم بريتم النشر وتحافظ على تواجد علامتك.",
                  path: "/dashboard/calendar"
                },
                {
                  icon: Compass,
                  titleEn: "Competitor Intelligence",
                  titleAr: "استخبارات تحليل المنافسين",
                  descEn: "Audit rival accounts in seconds to locate active formulas, hooks, and content gaps.",
                  descAr: "افحص حسابات منافسيك التسويقية واكتشف أثمن الثغرات التي يتجاهلونها وحولها لصالحك فوراً.",
                  path: "/dashboard/competitor-intel"
                },
                {
                  icon: BookOpen,
                  titleEn: "Proven Swipe File Library",
                  titleAr: "مكتبة وثلاجة صناعة الإلهام",
                  descEn: "Access verified framework templates, layout codes, and hooks proven to convert.",
                  descAr: "تصفح أسرار وصيغ كبار المؤثرين والمسوقين وحوّلها لأفكارك بنقرة واحدة لتضمن النجاح والانتشار.",
                  path: "/dashboard/swipe-file"
                },
              ].map((f, i) => {
                const Icon = f.icon;
                return (
                  <Card
                    key={i}
                    onClick={() => handleNavigateToFeature(f.path)}
                    className="bg-transparent border-white/10 hover:border-purple-500/50 hover:bg-white/[0.03] transition-all cursor-pointer group hover:scale-[1.01] active:scale-95 flex flex-col justify-between"
                  >
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 transition-all group-hover:bg-purple-500/20 group-hover:scale-105">
                        <Icon className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
                      </div>
                      <h3 className="text-lg font-bold mb-2 text-slate-100">
                        {language === "English" ? f.titleEn : f.titleAr}
                      </h3>
                      <p className="text-slate-400 font-sans text-xs leading-relaxed">
                        {language === "English" ? f.descEn : f.descAr}
                      </p>
                    </CardContent>
                    
                    <div className="px-6 pb-6 pt-0 flex items-center gap-1.5 text-xs font-semibold text-purple-400 group-hover:text-purple-300">
                      <span>{language === "English" ? "Launch Tool" : "شغّل الأداة الآن"}</span>
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="py-24 bg-white/[0.01] border-y border-white/10"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-heading font-extrabold mb-4 text-slate-100">
                {isAr ? "أسعار بسيطة وشفافة" : "Simple, Transparent Pricing"}
              </h2>
              <p className="text-slate-400 text-lg font-sans">
                {isAr ? "ابدأ مجانًا، وقم بالترقية عندما تحتاج إلى وظائف أقوى." : "Start for free, upgrade when you need more power."}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Plan */}
              <Card className="bg-transparent border-white/10 rounded-3xl relative overflow-hidden max-w-sm sm:max-w-none mx-auto w-full">
                <CardContent className="p-8 flex flex-col justify-between h-full">
                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-slate-100">
                      {isAr ? "الخطة المجانية" : "Free Plan"}
                    </h3>
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-4xl font-extrabold text-slate-100">{isAr ? "$0" : "$0"}</span>
                      <span className="text-slate-505 text-slate-500">{isAr ? "/ مدى الحياة" : "/ forever"}</span>
                    </div>
                    <ul className="space-y-4 mb-8">
                      {[
                        isAr ? "5 عمليات توليد محتوى يومية" : "5 Generations per day",
                        isAr ? "كتابة الخطافات والكابشن الأساسية" : "Basic Hooks & Captions",
                        isAr ? "أساليب ونبرات نصية قياسية" : "Standard Tones",
                        isAr ? "دعم فني وتوجيه قياسي" : "Standard Support",
                      ].map((feat, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-300 text-sm">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button variant="outline" className="w-full h-11 border-white/15 hover:bg-white/5" onClick={handleGetStarted}>
                    {isAr ? "ابدأ مجاناً الآن" : "Start Free"}
                  </Button>
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card className="bg-gradient-to-b from-white/[0.04] to-transparent border-purple-500/50 shadow-[0_0_35px_-10px_rgba(168,85,247,0.35)] relative overflow-hidden rounded-3xl max-w-sm sm:max-w-none mx-auto w-full">
                <div className="absolute top-0 right-0 rtl:right-auto rtl:left-0 bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl rtl:rounded-bl-none rtl:rounded-br-xl">
                  {isAr ? "الأكثر تميزاً" : "POPULAR"}
                </div>
                <CardContent className="p-8 flex flex-col justify-between h-full">
                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-purple-400">
                      {isAr ? "الخطة الاحترافية (Pro)" : "Pro Plan"}
                    </h3>
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-4xl font-extrabold text-slate-100">{isAr ? "$19" : "$19"}</span>
                      <span className="text-slate-500">{isAr ? "/ شهرياً" : "/ month"}</span>
                    </div>
                    <ul className="space-y-4 mb-8">
                      {[
                        isAr ? "عمليات توليد وتصدير غير محدودة" : "Unlimited Generations",
                        isAr ? "أدوات مخصصة للانتشار وصناعة التريند" : "Advanced Viral Angles",
                        isAr ? "صيغ ونماذج VIP حصرية للانتشار" : "Premium Templates",
                        isAr ? "مطابقة دقيقة لنبرة صوت علامتك التجارية" : "Custom Tone Matches",
                        isAr ? "دعم فني ذو أولوية فائقة 24/7" : "Priority Support",
                      ].map((feat, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                          <span className="text-slate-300 text-sm">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {isPro ? (
                    <Button variant="outline" className="w-full h-11 border-amber-500/30 text-amber-300 hover:bg-amber-500/5 hover:text-white" onClick={() => navigate("/dashboard")}>
                      <Sparkles className="w-4 h-4 mr-1.5 inline font-bold text-amber-400" />
                      {isAr ? "الاشتراك نشط - دخول لوحة التحكم" : "Pro Active - Enter App"}
                    </Button>
                  ) : (
                    <Button variant="gradient" className="w-full h-11" onClick={() => {
                      if (!user) {
                        signInWithGoogle().then(() => setShowUpgradeModal(true)).catch(() => {});
                      } else {
                        setShowUpgradeModal(true);
                      }
                    }}>
                      {isAr ? "رقّ حسابك لـ Pro الآن" : "Upgrade to Pro"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section className="py-24 bg-slate-950/50 border-b border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-heading font-extrabold mb-4 text-slate-100">
                {isAr ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
              </h2>
              <p className="text-slate-400 text-base font-sans">
                {isAr ? "أجوبة شفافة ومباشرة لمعرفة كل تفاصيل منصة هوكيفاي" : "Clear answers to everything you need to know about Hookify."}
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-white/5 bg-slate-900/60 rounded-2xl overflow-hidden transition-all duration-300 hover:border-purple-500/20"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full flex items-center justify-between p-6 text-left rtl:text-right gap-4 cursor-pointer focus:outline-none"
                    >
                      <span className="text-base font-bold text-slate-100 flex items-center gap-3">
                        <span className="text-purple-400 text-lg">✦</span>
                        <span>{isAr ? faq.qAr : faq.qEn}</span>
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                          isOpen ? "rotate-180 text-purple-400" : ""
                        }`}
                      />
                    </button>

                    <div
                      className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isOpen ? "max-h-60 opacity-100 border-t border-white/5" : "max-h-0 opacity-0 pointer-events-none"
                      }`}
                    >
                      <p className="p-6 text-sm text-slate-300 leading-relaxed bg-slate-950/20 whitespace-pre-line font-sans">
                        {isAr ? faq.aAr : faq.aEn}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-28 relative overflow-hidden text-center">
          <div className="absolute inset-x-0 bottom-0 top-1/2 bg-purple-900/10 pointer-events-none blur-3xl rounded-full" />
          <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-6 text-slate-100 px-4 leading-normal">
            {isAr ? "ابدأ بصناعة محتوى أفضل وأسرع اليوم" : "Start Creating Better Content Today"}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto px-4 font-sans">
            {isAr ? "انضم إلى آلاف المسوقين وصنّاع المحتوى الذين يختصرون الساعات أسبوعياً مع هوكيفاي." : "Join thousands of creators saving hours every week using Hookify."}
          </p>
          <Button variant="gradient" size="lg" className="text-base px-10 h-12 shadow-xl shadow-purple-500/20" onClick={handleGetStarted}>
            {isAr ? "ابدأ الآن مجاناً" : "Get Started for Free"}
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-tr from-purple-500 to-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-slate-100 tracking-tight">Hookify</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link to="/privacy" className="hover:text-white transition-colors">
              {t("Privacy Policy")}
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              {t("Terms of Service")}
            </Link>
            <a href="mailto:abdlrhmanmahmoud69@gmail.com" className="hover:text-white transition-colors">
              {t("Contact")}
            </a>
          </div>
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Hookify. {t("All rights reserved.")}
          </p>
        </div>
      </footer>
      <UpgradeModal />
    </div>
  );
}

