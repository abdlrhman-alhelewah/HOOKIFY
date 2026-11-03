import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LayoutTemplate,
  ArrowRight,
  Video,
  FileText,
  CheckCircle,
  MessageSquare,
  Building2,
  Shirt,
  HeartPulse,
  UtensilsCrossed,
  GraduationCap,
  Sparkles,
  Search,
  ChevronRight,
  ShoppingBag
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface MarketplaceTemplate {
  id: string;
  industry: "real-estate" | "fashion" | "clinic" | "restaurant" | "coach";
  title: string;
  description: string;
  suggestedPrompt: string;
  tone: string;
  platform: string;
  language: string;
  goal: string;
  icon: any;
  badge: string;
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<"all" | "real-estate" | "fashion" | "clinic" | "restaurant" | "coach">("all");

  const coreCategories = [
    {
      type: "hook",
      title: "Viral Hooks",
      desc: "Proven patterns to grab attention in the first 3 seconds.",
      link: "/dashboard/hooks",
      icon: Video,
      color: "from-blue-500/10 to-cyan-500/10"
    },
    {
      type: "caption",
      title: "Engagement Captions",
      desc: "Captions designed to drive comments, saves, and shares.",
      link: "/dashboard/captions",
      icon: FileText,
      color: "from-purple-500/10 to-pink-500/10"
    },
    {
      type: "script",
      title: "Storytelling Scripts",
      desc: "Full 60-second video scripts with strong hooks and CTAs.",
      link: "/dashboard/scripts",
      icon: CheckCircle,
      color: "from-orange-500/10 to-red-500/10"
    },
    {
      type: "angle",
      title: "Unique Angles",
      desc: "Marketing angles that spark debate and go viral.",
      link: "/dashboard/angles",
      icon: MessageSquare,
      color: "from-green-500/10 to-emerald-500/10"
    }
  ];

  const marketplaceTemplates: MarketplaceTemplate[] = [
    // --- REAL ESTATE ---
    {
      id: "re-1",
      industry: "real-estate",
      badge: language === "Arabic" ? "عقارات فاخرة" : "Luxury Real Estate",
      title: language === "Arabic" ? "عرض شقة أو فيلا فاخرة بأسلوب سينمائي" : "Cinematic Villa / Apartment Walkthrough",
      description: language === "Arabic" ? "قالب سيناريو كامل يستعرض التشطيبات الفاخرة والموقع لتعبئة الرغبة بالشراء." : "Full walkthrough script outlining luxury materials, layout, and urgency.",
      tone: "Luxury / Premium",
      platform: "Instagram Reels",
      language: "Modern Standard Arabic (Classical)",
      goal: "Generate Leads",
      icon: Building2,
      suggestedPrompt: "اكتب سيناريو ريلز مشوق يستعرض فيلا فاخرة للبيع (مساحة 600م، حمام سباحة، تشطيب ألترا مودرن، موقع مميز بالتجمع الخامس). ابدأ بخطاف يشد المشترين الأثرياء بخصوص امتلاك خصوصية كاملة، ثم استعرض المنافع والجنانات، وانهِ بـ CTA يدعو للتواصل عبر رسائل الصفحة لطلب السعر ولقطات المعاينة الخاصة."
    },
    {
      id: "re-2",
      industry: "real-estate",
      badge: language === "Arabic" ? "استثمار عقاري" : "RE Investment",
      title: language === "Arabic" ? "3 أخطاء تضيع أموالك في شراء العقار" : "3 Pitfalls in Real Estate Investing",
      description: language === "Arabic" ? "منشور تثقيفي يبني سلطة ومعرفة للمشتريين العقاريين ويوجههم لشركتك." : "Authority-building carousel or caption detailing transaction mistakes.",
      tone: "Educational",
      platform: "LinkedIn",
      language: "Modern Standard Arabic (Classical)",
      goal: "Brand Authority",
      icon: Building2,
      suggestedPrompt: "اكتب منشور طويل وواضح ومنظم بخصوص 3 أخطاء فادحة يقع فيها المشترون الجدد عند شراء شققهم في العاصة الإدارية أو القاهرة الجديدة (مثلاً عدم مراجعة البند القانوني، الجري وراء أطول قسط غير مناسب، إهمال معاينة الاستلام). صغها بأسلوب يدعونا للاستثمار الأذكى ويقترح شركتنا كاستشاري مجاني مأمون."
    },

    // --- FASHION ---
    {
      id: "f-1",
      industry: "fashion",
      badge: language === "Arabic" ? "أزياء وموضة" : "Fashion & Clothing",
      title: language === "Arabic" ? "تنسيق ملابس لجمهور المناسبات أو العمل" : "Styling Guide for Capsule Wardrobe",
      description: language === "Arabic" ? "سيناريو سريع وممتع يعرض كيفية تنسيق قطع ملابس متعددة بذكاء." : "Engaging transition video script showing smart matching of clothing sets.",
      tone: "Inspiring / Aesthetic",
      platform: "TikTok",
      language: "Modern Standard Arabic (Classical)",
      goal: "Community Growth",
      icon: Shirt,
      suggestedPrompt: "اكتب سيناريو فيديو تيك توك قصير مع تنسيقات (Outfits) لكبسولة ملابس صيفية مريحة جداً وموفرة تناسب الشباب في اجتماعات العمل أو المقابلات الرسمية والطلعات العادية. ركّز على بساطة التنسيقات وتفاصيل الأقمشة وانهِ بـ CTA يدعوهم لكتابة 'تنسيق' في التعليقات للحصول على خصم 15٪ وكوبون الدفع من متجرنا."
    },

    // --- CLINICS & DOCTORS ---
    {
      id: "dr-1",
      industry: "clinic",
      badge: language === "Arabic" ? "عيادات وتجميل" : "Clinics & Medical",
      title: language === "Arabic" ? "أسرار تفادي المشاكل الطبية الشائعة" : "How to Avoid Common Medical Myth",
      description: language === "Arabic" ? "خطاب علمي موثوق يدحض خرافة طبية شائعة ويبني شعبية الطبيب." : "Evidence-based, trustable caption disproving generic healthcare myths.",
      tone: "Educational / Authoritative",
      platform: "Instagram Reels",
      language: "Modern Standard Arabic (Classical)",
      goal: "Generate Appointments",
      icon: HeartPulse,
      suggestedPrompt: "اكتب محتوى منشور طبي دقيق وجاذب لعيادة أسنان (أو جلدية وتجميل) بخصوص دحض خرافة شائعة (مثال: معجون الأسنان المبيض المنزلي يدمر المينا، أو أهمية واقي الشمس داخل المنزل). ابنِ نبرة بروفيسور محبب وحريص واستعرض الحقيقة العلمية بدقائق، وضع دعوة للإجراء (CTA) لحجز موعد استشارة وتشخيص مجاني بالعيادة."
    },

    // --- RESTAURANTS ---
    {
      id: "res-1",
      industry: "restaurant",
      badge: language === "Arabic" ? "مطاعم مأكولات" : "Restaurants & Food",
      title: language === "Arabic" ? "كواليس تحضير وسر الطبق الأكثر مبيعاً" : "Behind-The-Scenes of Best-Selling Dish",
      description: language === "Arabic" ? "سيناريو يسلب العقول يركز على جوع العميل وجودة وطزاجة الطهي والمكونات." : "Sizzling behind-the-scenes video script focusing on taste & freshness.",
      tone: "Excited / Sensory",
      platform: "TikTok",
      language: "Modern Standard Arabic (Classical)",
      goal: "Drive Deliveries / Visits",
      icon: UtensilsCrossed,
      suggestedPrompt: "اكتب سيناريو غامر وممتلئ بالحماس لطهي وتحضير برجر ضخم ممتلئ بجبنة الشيدر الساخنة ومقرمش من أسرار مطعمنا. ركز على التفاصيل السمعية والبصرية (أصوات القرمشة، سقوط الجبن الساخن) وصياغة نص يسيل له اللعاب لدرجة الشبع البصري، وضع عنوان الإجراء: بطلب الأوردر المباشر بالواتساب والديلفري شغال 24 ساعة."
    },

    // --- COACHES & CONSULTANTS ---
    {
      id: "ch-1",
      industry: "coach",
      badge: language === "Arabic" ? "استشارات وتطوير" : "Coaching & B2B",
      title: language === "Arabic" ? "ماذا لم يخبروك به عن صناعة الكورسات المستقلة" : "Reality check of Course Creation Strategy",
      description: language === "Arabic" ? "منشور جريء يتحدث عن صعوبات حقيقية في الكيرير وكيفية تجاوزها." : "Bold polarizing point about career progression & your guide to fixing it.",
      tone: "Controversial",
      platform: "LinkedIn",
      language: "Modern Standard Arabic (Classical)",
      goal: "Lead Generation",
      icon: GraduationCap,
      suggestedPrompt: "اكتب منشور رأي صادم ومثير للجدل لكنه مليء بالقيمة والفائدة بخصوص لماذا تفشل 90٪ من كورسات تطوير الذات ومدربي اللايف كوتشينج (لأنهم يبيعون نظريات حالمة دون تطبيق). استعرض كيف تبني منهجاً حقيقياً بالأرقام والتجارب، واختم بـ CTA يدعو المهتمين لحجز جلسة تشخيص مجانية 15 دقيقة معك لمراجعة خطة تسيير الكورسات الخاصة بهم."
    }
  ];

  const handleUseTemplate = (t: MarketplaceTemplate) => {
    navigate("/dashboard/full", {
      state: {
        reuse: {
          topic: t.suggestedPrompt,
          tone: t.tone,
          platform: t.platform,
          language: t.language,
          goal: t.goal
        }
      }
    });
  };

  const filteredMarketplace = marketplaceTemplates.filter((item) => {
    // Search query check
    const query = searchQuery.toLowerCase();
    const matchesSearch = item.title.toLowerCase().includes(query) ||
                          item.description.toLowerCase().includes(query) ||
                          item.badge.toLowerCase().includes(query) ||
                          item.suggestedPrompt.toLowerCase().includes(query);

    // Industry sector check
    const matchesIndustry = selectedIndustry === "all" || item.industry === selectedIndustry;

    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-10 flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Introduction */}
      <div>
        <h1 className="text-3xl font-bold font-heading mb-2">{t("Templates")}</h1>
        <p className="text-slate-400">
          {language === "Arabic"
            ? "اختر الفئة الأساسية، أو استكشف 'سوق القوالب الجاهزة' المعدة خصيصاً لتفجير نشاطك التجاري."
            : "Select a base category, or browse the marketplace for optimized high-converting industry scripts."}
        </p>
      </div>

      {/* Segment 1: Core Formats */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-300 flex items-center gap-1.5 border-b border-white/5 pb-2">
          <LayoutTemplate className="w-5 h-5 text-purple-400" />
          {language === "Arabic" ? "القوالب الإنشائية الأساسية" : "Primary Structural Creators"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {coreCategories.map((template, idx) => {
            const Icon = template.icon;
            return (
              <Link key={idx} to={template.link}>
                <Card className={`h-full bg-gradient-to-br ${template.color} border-white/5 hover:border-white/10 transition-all hover:-translate-y-1`}>
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div>
                      <div className="p-2 bg-white/5 rounded-xl border border-white/5 w-fit mb-3">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-md font-bold text-white mb-1.5">{template.title}</h3>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        {template.desc}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-purple-300 font-bold mt-4">
                      <span>{language === "Arabic" ? "فتح المولد" : "Launch Board"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Segment 2: Arabic Templates Marketplace */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              {language === "Arabic" ? "سوق القوالب الجاهزة بالعربي (Marketplace)" : "Premium Social Media Marketplace Templates"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {language === "Arabic"
                ? "قوالب تسويقية دقيقة صممتها كوادر مبيعات احترافية لضمان تفاعل واهتمام جمهورك العربي."
                : "Real, ready-to-launch prompts optimized to drive sales, clients, and authority."}
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder={language === "Arabic" ? "البحث عن قالب في السوق..." : "Search marketplace..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rtl:pl-3 rtl:pr-9 bg-black/40 border-white/10"
            />
          </div>
        </div>

        {/* Industry filter selectors */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: language === "Arabic" ? "كل المجالات" : "All Niches", icon: ShoppingBag },
            { id: "real-estate", label: language === "Arabic" ? "العقارات" : "Real Estate", icon: Building2 },
            { id: "fashion", label: language === "Arabic" ? "الأزياء والملابس" : "Fashion & Clothing", icon: Shirt },
            { id: "clinic", label: language === "Arabic" ? "العيادات والتجميل" : "Clinics & Doctors", icon: HeartPulse },
            { id: "restaurant", label: language === "Arabic" ? "المطاعم والأغذية" : "Restaurants", icon: UtensilsCrossed },
            { id: "coach", label: language === "Arabic" ? "المدربون والاستشارات" : "Coaching & B2B", icon: GraduationCap }
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedIndustry(cat.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                  selectedIndustry === cat.id
                    ? "bg-purple-600/20 text-purple-300 border-purple-500/30 shadow-lg shadow-purple-950/40"
                    : "text-slate-400 border-white/5 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Templates Deck */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarketplace.map((tmpl) => {
            const IconComponent = tmpl.icon;
            return (
              <div
                key={tmpl.id}
                className="bg-white/5 border border-white/10 hover:border-white/20 transition-all rounded-3xl p-5 flex flex-col justify-between relative group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                      {tmpl.badge}
                    </span>
                    <div className="p-2 bg-white/5 rounded-xl border border-white/5 text-purple-400">
                      <IconComponent className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-bold text-slate-100 leading-snug group-hover:text-white transition-colors">{tmpl.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1.5">{tmpl.description}</p>
                  </div>

                  <div className="text-[10px] text-slate-500 font-semibold space-y-1 border-t border-white/5 pt-3">
                    <p>🎯 <span className="text-slate-400 font-medium">{language === "Arabic" ? "الهدف: " : "Goal: "}</span>{tmpl.goal}</p>
                    <p>📈 <span className="text-slate-400 font-medium">{language === "Arabic" ? "الصف المنصة: " : "Platform: "}</span>{tmpl.platform}</p>
                    <p>💬 <span className="text-slate-400 font-medium">{language === "Arabic" ? "النبرة المقترحة: " : "Tone Suggest: "}</span>{tmpl.tone}</p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/5">
                  <Button
                    variant="gradient"
                    onClick={() => handleUseTemplate(tmpl)}
                    className="w-full text-xs h-9 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{language === "Arabic" ? "تطبيق فوري في المولد ⚡" : "Load in Generator ⚡"}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredMarketplace.length === 0 && (
          <div className="text-center py-16 bg-white/5 border border-white/10 rounded-3xl text-xs text-slate-500">
            {language === "Arabic" ? "لم نجد قوالب تطابق الكلمات المدخلة في سوق القوالب." : "No marketplace templates matched your search constraints."}
          </div>
        )}
      </div>
    </div>
  );
}
