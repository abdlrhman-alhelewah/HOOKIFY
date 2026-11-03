import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchWithBackoff } from "@/utils/apiRetry";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Eye,
  TrendingUp,
  Sparkles,
  Copy,
  Check,
  Zap,
  Flame,
  MessageSquareCode,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Gauge,
  HelpCircle as InfoIcon,
  Cpu,
  Trophy,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card, CardContent } from "@/components/ui/Card";
import Markdown from "react-markdown";

interface CompetitorAnalysis {
  hookStyle: string;
  hookScore: number;
  hookTips: string;
  ctaStyle: string;
  ctaScore: number;
  ctaTips: string;
  toneStyle: string;
  toneScore: number;
  outperformContent: string;
  upgradedHooks: string[];
  upgradedCtas: string[];
}

export default function CompetitorIntelPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [competitorContent, setCompetitorContent] = useState("");
  const [competitorPlatform, setCompetitorPlatform] = useState("Instagram Reels");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [retryState, setRetryState] = useState<{
    attempt: number;
    maxRetries: number;
    delayMs: number;
    isActive: boolean;
    reason: string;
  } | null>(null);
  const [rawOutput, setRawOutput] = useState("");
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const startAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competitorContent.trim()) return;

    setIsAnalyzing(true);
    setError("");
    setRawOutput("");
    setAnalysis(null);

    try {
      // Craft a robust structured output prompt to analyze competitor content & propose outperform options
      const prompt = `Act as an elite social media director and viral growth optimizer operating in the year 2026.
Analyze this competitor's social media content or profile description:
"""
${competitorContent}
"""
Platform: ${competitorPlatform}. Desired analysis language: ${language === "Arabic" ? "Arabic" : "English"}.

Analyze the competitor's strategy across three key indicators: Hook Style, CTA Style, and Tone. Then, suggest high-performing improvements and draft an optimized, viral post that completely outperforms theirs in every aspect.

IMPORTANT: You MUST write the entire analysis and content suggest strictly in ${language === "Arabic" ? "Arabic (لوحة واضحة باللهجة الطبيعية أو الفصحى)" : "English"}. 

Format your final reply strictly using the XML/Custom block tokens below so it can be parsed:
<HOOK_STYLE>Write analysis of their Hook style. Why it is weak or strong.</HOOK_STYLE>
<HOOK_SCORE>Write a rating number representing their Hook quality from 1 to 100.</HOOK_SCORE>
<HOOK_TIPS>Write tips on how to improve this Hook.</HOOK_TIPS>

<CTA_STYLE>Write analysis of their CTA style.</CTA_STYLE>
<CTA_SCORE>Write a rating number representing their CTA quality from 1 to 100.</CTA_SCORE>
<CTA_TIPS>Write tips on how to make their Call to Action highly clickable/commentable.</TIPS>

<TONE_STYLE>Write analysis of their Tone of Voice and Audience focus.</TONE_STYLE>
<TONE_SCORE>Write a rating number representing their tone strength/clarity from 1 to 100.</TONE_SCORE>

<UPGRADED_HOOKS>
- Hook 1 Option
- Hook 2 Option
- Hook 3 Option
</UPGRADED_HOOKS>

<UPGRADED_CTAS>
- CTA 1 Option
- CTA 2 Option
- CTA 3 Option
</UPGRADED_CTAS>

<OUTPERFORM_CONTENT>
Write a superior, fully drafted, viral version of this piece of content that outdates theirs, incorporating a lethal hook, magnetic value, emojis, line breaks, and an incredible CTA.
</OUTPERFORM_CONTENT>

Keep the output structured with these exact tags.`;

      setRetryState(null);
      const response = await fetchWithBackoff("/api/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-UID": user?.uid || "",
          "X-User-Email": user?.email || ""
        },
        body: JSON.stringify({ prompt }),
      }, {
        onRetry: (state) => {
          setRetryState({
            attempt: state.attempt,
            maxRetries: state.maxRetries,
            delayMs: state.delayMs,
            isActive: true,
            reason: state.error?.message || "Rate limit or network fluctuation"
          });
        }
      });
      setRetryState(null);

      if (!response.ok) {
        let errMsg = "Could not talk to our AI Engine";
        try {
          const errData = await response.json();
          // Adjust message depending on current UI language
          if (errData && errData.error) {
            errMsg = errData.error; // or localized error if provided
          }
        } catch (e) {}
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let fullText = "";
      let buffer = "";

      if (reader) {
        let chunk;
        while (!(chunk = await reader.read()).done) {
          buffer += decoder.decode(chunk.value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
               const data = line.slice(6);
               if (data === '[DONE]') break;
               try {
                 const parsed = JSON.parse(data);
                 if (parsed.text) {
                   fullText += parsed.text;
                   setRawOutput(fullText);
                 }
               } catch (e) {}
            }
          }
        }
      }

      const text = fullText.trim();
      
      // Parse token nodes
      const extractTag = (tag: string, source: string) => {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
        const match = source.match(regex);
        return match ? match[1].trim() : "";
      };

      const hStyle = extractTag("HOOK_STYLE", text);
      const hScore = Number(extractTag("HOOK_SCORE", text)) || 60;
      const hTips = extractTag("HOOK_TIPS", text) || extractTag("TIPS", text);
      const cStyle = extractTag("CTA_STYLE", text);
      const cScore = Number(extractTag("CTA_SCORE", text)) || 50;
      const cTips = extractTag("CTA_TIPS", text);
      const tStyle = extractTag("TONE_STYLE", text);
      const tScore = Number(extractTag("TONE_SCORE", text)) || 65;
      const outperform = extractTag("OUTPERFORM_CONTENT", text);
      
      const hooksStr = extractTag("UPGRADED_HOOKS", text);
      const ctasStr = extractTag("UPGRADED_CTAS", text);

      const parsedHooks = hooksStr
        .split("\n")
        .map(h => h.replace(/^-\s*/, "").trim())
        .filter(h => h.length > 0);

      const parsedCtas = ctasStr
        .split("\n")
        .map(c => c.replace(/^-\s*/, "").trim())
        .filter(c => c.length > 0);

      const finalAnalysis: CompetitorAnalysis = {
        hookStyle: hStyle || (language === "Arabic" ? "خطاف كلاسيكي مباشر" : "Standard generic hook"),
        hookScore: hScore,
        hookTips: hTips || (language === "Arabic" ? "اجعل الكلمات الأولى تتضمن أرقام كبرى أو أسرار مخفية." : "Incorporate numerical hooks or extreme curiosity triggers."),
        ctaStyle: cStyle || (language === "Arabic" ? "دعوة بسيطة مكررة" : "Low urgency Call To Action"),
        ctaScore: cScore,
        ctaTips: cTips || (language === "Arabic" ? "اجذب الجمهور ليكتبوا تعليقًا بكلمة مخصصة لإرسال المادة لهم." : "Leverage lead-magnets by asking readers to comment standard words."),
        toneStyle: tStyle || (language === "Arabic" ? "نبرة حيادية عامة" : "Neutral/general brand voice"),
        toneScore: tScore,
        outperformContent: outperform || text,
        upgradedHooks: parsedHooks.length > 0 ? parsedHooks : [
          language === "Arabic" ? "السر اللي مخبيه عنك 99٪ من أصحاب المشاريع..." : "The secret 99% of creators are hiding from you...",
          language === "Arabic" ? "توقف فوراً عن هذا الخطأ الفادح..." : "Stop making this critical error today..."
        ],
        upgradedCtas: parsedCtas.length > 0 ? parsedCtas : [
          language === "Arabic" ? "اكتب كلمة 'تفاصيل' في التعليقات وسأرسل لك الدليل فوراً!" : "Comment the word 'GUIDE' & I will DM you the system!",
          language === "Arabic" ? "احفظ هذا المنشور قبل أن يحذفه إنستجرام!" : "Save this absolute goldmine before Instagram flags it!"
        ]
      };

      setAnalysis(finalAnalysis);

      // Save to Firebase Activity log
      if (user) {
        try {
          await addDoc(collection(db, "activity_logs"), {
            userId: user.uid,
            email: user.email,
            type: "competitor_analysis",
            action: "competitor_analysis",
            platform: competitorPlatform,
            timestamp: serverTimestamp()
          });
        } catch (e) {}
      }

    } catch (err: any) {
      setRetryState(null);
      console.error(err);
      
      const isRateLimit = err?.message?.includes("429") || err?.toString()?.toLowerCase()?.includes("rate limit");
      const isNetwork = err?.toString()?.toLowerCase()?.includes("fetch") || err?.toString()?.toLowerCase()?.includes("network");

      let customMsg = "";
      if (isRateLimit) {
        customMsg = language === "Arabic"
          ? "الخدمة متوقفة مؤقتاً بسبب تجاوز معدل طلبات النموذج (Rate Limit - 429). يحدث هذا نتيجة كثرة عمليات الفحص المتزامنة للمنافسين على مفتاح الترخيص المجاني للاختبار. يرجى التريث لمدة 30-60 ثانية والمحاولة مجدداً."
          : "Audit service is temporarily unavailable due to rate limits (429). This occurs under high concurrent usage of our preview key. Please take a 30-60 second break and try again.";
      } else if (isNetwork) {
        customMsg = language === "Arabic"
          ? "حدث خلل مفاجئ في الاتصال بالشبكة ولم يحظى الاتصال بالخادم بالاستقرار الكافي لتمرير فحص المنافسين. تأكد من اتصال الإنترنت وحاول ثانية."
          : "A network glitch interrupted transmitting this. Automatic exponential backoff retired. Please check your connectivity state and run the analyzer once more.";
      } else {
        customMsg = language === "Arabic"
          ? `حدث خطأ أثناء فحص محتوى المنافس. التفاصيل: ${err?.message || "تعذر التحليل"}. الرجاء المحاولة مرة أخرى.`
          : `An error occurred during competitor audit. Detail: ${err?.message || "parsing issue"}. Please check the format and try again.`;
      }
      setError(customMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copySection = (sectionId: string, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-bold font-heading mb-2 text-slate-100 flex items-center gap-2">
          <Eye className="w-8 h-8 text-violet-400" />
          {language === "Arabic" ? "تحليل ذكاء المنافسين" : "Competitor Intelligence Intelligence"}
        </h1>
        <p className="text-slate-400">
          {language === "Arabic"
            ? "حلل خطافات منافسيك، ونبراتهم، وأساليبهم في المبيعات، بضربة واحدة واجعل الذكاء الاصطناعي يقترح محتوىً فتاكًا يكتسح منشوراتهم."
            : "Analyze competitor hooks, call-to-actions, and content styles. Instantly auto-generate enhanced concepts that beat them in the algorithm."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Paste Form block */}
        <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400 animate-pulse" />
            {language === "Arabic" ? "بيانات منشور المنافس" : "Competitor Material Input"}
          </h2>
          
          <form onSubmit={startAnalysis} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                {language === "Arabic" ? "المنصة الأصلية" : "Original Platform"}
              </label>
              <Select
                value={competitorPlatform}
                onChange={(e) => setCompetitorPlatform(e.target.value)}
                className="bg-black/30 border-white/10"
              >
                <option value="Instagram Reels">Instagram Reels</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube Shorts">YouTube Shorts</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Twitter / X">Twitter / X</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                {language === "Arabic" ? "ألصق محتوى المنافس أو الـ Bio الخاص به" : "Paste Corrupt Competitor Post/Bio"}
              </label>
              <Textarea
                placeholder={
                  language === "Arabic"
                    ? "ألصق هنا المنشور أو السيناريو أو الفكرة البديلة التي تستخدمها المنافسة..."
                    : "Paste competitor's captions, script notes, profile bios, or raw marketing draft here..."
                }
                value={competitorContent}
                onChange={(e) => setCompetitorContent(e.target.value)}
                className="resize-none min-h-[160px] bg-black/40 text-sm border-white/10 text-slate-200"
                required
              />
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full h-12 text-sm"
              disabled={isAnalyzing || !competitorContent.trim()}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === "Arabic" ? "جاري كشف أسرار المنافس وحلوله..." : "Analyzing competitor strategy..."}
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {language === "Arabic" ? "تحليل واقتراح محتوى أفضل 🎯" : "Analyze & Outperform 🎯"}
                </>
              )}
            </Button>
          </form>
          
          {retryState && retryState.isActive && (
            <div className="p-4 bg-amber-400/10 border border-amber-500/20 rounded-2xl text-amber-400 text-xs flex flex-col gap-1.5 animate-pulse">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="font-semibold text-slate-200">
                  {language === "Arabic" ? "جاري محاولة اتصال تلقائي..." : "Retrying automatically..."}
                </span>
              </div>
              <p>
                {language === "Arabic"
                  ? `المحاولة رقم ${retryState.attempt} من أصل ${retryState.maxRetries}`
                  : `Attempt ${retryState.attempt} of ${retryState.maxRetries}`}
              </p>
              <p className="opacity-80 text-[11px]">
                {language === "Arabic"
                  ? `الانتظار للتبريد الأمني وإعادة الفحص بعد ${Math.round(retryState.delayMs / 1000)} ثوانٍ...`
                  : `Waiting ${Math.round(retryState.delayMs / 1000)}s to clear model rate bounds safely...`}
              </p>
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-400/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Audit Results analysis board */}
        <div className="lg:col-span-7">
          {isAnalyzing && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center flex flex-col justify-center items-center py-20 gap-4">
              <Cpu className="w-12 h-12 text-purple-400 animate-spin" />
              <div>
                <h3 className="text-lg font-bold text-slate-300">
                  {language === "Arabic" ? "جاري التمحيص الإملائي وتوليد الاستراتيجية..." : "De-compiling post structure..."}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {language === "Arabic"
                    ? "يتم الآن مقارنة الخطافات بمقاييس الفيروسية لعام 2026 وتقييم مستوى تفاعل الروابط المجدولة."
                    : "Running hooks across viral databases, checking visual breaks & generating superior copywriting offsets."}
                </p>
              </div>
              <div className="w-full bg-slate-900/60 rounded-full h-1.5 max-w-xs mt-2 overflow-hidden border border-white/5">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full animate-pulse" style={{ width: "65%" }}></div>
              </div>
            </div>
          )}

          {!isAnalyzing && !analysis && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-slate-500 flex flex-col justify-center items-center gap-3">
              <Eye className="w-12 h-12 text-slate-600" />
              <h3 className="text-lg font-bold text-slate-400">{language === "Arabic" ? "تقارير فحص ومنافسة دقيقة" : "Awaiting competitor analysis"}</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                {language === "Arabic"
                  ? "أدخل المحتوى في اللوحة الجانبية، لستخرج لك درجات تقييم الخطاف، الفجوات، نصائح الصياغة وهيكل المحتوى الجديد."
                  : "Input competitor content on the sidebar. Our system will break down Hook, Call behavior, Voice index, and suggestion alternatives."}
              </p>
            </div>
          )}

          {!isAnalyzing && analysis && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Score breakdown metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{language === "Arabic" ? "قوة الخطاف" : "Hook Power"}</span>
                  <p className="text-3xl font-extrabold text-violet-400 mt-1">{analysis.hookScore}<span className="text-xs text-slate-500">/100</span></p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{language === "Arabic" ? "عناوين الإجراء" : "CTA Impact"}</span>
                  <p className="text-3xl font-extrabold text-pink-400 mt-1">{analysis.ctaScore}<span className="text-xs text-slate-500">/100</span></p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{language === "Arabic" ? "وضوح الهوية" : "Identity Clarity"}</span>
                  <p className="text-3xl font-extrabold text-emerald-400 mt-1">{analysis.toneScore}<span className="text-xs text-slate-500">/100</span></p>
                </div>
              </div>

              {/* Hook Analysis details */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Flame className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-bold text-slate-200">{language === "Arabic" ? "تحليل الخطاف الأصلي (Hook Analysis)" : "Hook Analysis"}</h3>
                </div>
                <div className="text-xs space-y-2">
                  <p className="text-slate-300 leading-relaxed"><strong className="text-slate-200">{language === "Arabic" ? "طبيعة الأسلوب: " : "Competitor Formula: "}</strong> {analysis.hookStyle}</p>
                  <p className="text-slate-400 bg-black/20 p-3 rounded-xl border border-white/5 leading-relaxed"><strong className="text-purple-400">{language === "Arabic" ? "إستراتيجية التطوير: " : "Alternative Tips: "}</strong> {analysis.hookTips}</p>
                </div>
              </div>

              {/* Link CTA metrics */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <TrendingUp className="w-4 h-4 text-pink-400" />
                  <h3 className="text-sm font-bold text-slate-200">{language === "Arabic" ? "تحليل دعوة الإجراء (CTA Analysis)" : "Call-To-Action Analysis"}</h3>
                </div>
                <div className="text-xs space-y-2">
                  <p className="text-slate-300 leading-relaxed"><strong className="text-slate-200">{language === "Arabic" ? "طبيعة الأسلوب: " : "Competitor Style: "}</strong> {analysis.ctaStyle}</p>
                  <p className="text-slate-400 bg-black/20 p-3 rounded-xl border border-white/5 leading-relaxed"><strong className="text-pink-400">{language === "Arabic" ? "نصيحة الصياغة: " : "Outflow Advice: "}</strong> {analysis.ctaTips}</p>
                </div>
              </div>

              {/* Upgraded micro blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 3 Upgraded Hooks */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-violet-400 uppercase tracking-widest">{language === "Arabic" ? "3 خطافات بديلة خارقة 🔥" : "3 Superior Hook Alternatives 🔥"}</h4>
                  <div className="space-y-2">
                    {analysis.upgradedHooks.map((h, idx) => (
                      <div key={idx} className="bg-black/20 p-2.5 rounded-xl border border-white/5 text-xs text-slate-200 flex justify-between items-start gap-2">
                        <span className="leading-relaxed grow">{h}</span>
                        <button onClick={() => copySection(`h-${idx}`, h)} className="text-slate-500 hover:text-white shrink-0 p-1">
                          {copiedSection === `h-${idx}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3 Upgraded CTAs */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-pink-400 uppercase tracking-widest">{language === "Arabic" ? "3 دعوات إجراء عالية التحويل ⚡" : "3 High-Converting CTA Upgrades ⚡"}</h4>
                  <div className="space-y-2">
                    {analysis.upgradedCtas.map((c, idx) => (
                      <div key={idx} className="bg-black/20 p-2.5 rounded-xl border border-white/5 text-xs text-slate-200 flex justify-between items-start gap-2">
                        <span className="leading-relaxed grow">{c}</span>
                        <button onClick={() => copySection(`c-${idx}`, c)} className="text-slate-500 hover:text-white shrink-0 p-1">
                          {copiedSection === `c-${idx}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* The superior outperform content */}
              <div className="bg-gradient-to-tr from-purple-900/10 to-transparent border border-purple-500/20 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400 animate-bounce" />
                    <h3 className="font-bold text-slate-100">{language === "Arabic" ? "المنشور المقترح للاكتساح والتفوق" : "Superior Outperforming Post Draft"}</h3>
                  </div>
                  <Button 
                    size="sm" 
                    variant="gradient"
                    onClick={() => copySection("outperform", analysis.outperformContent)}
                    className="h-8 text-xs flex items-center gap-1.5"
                  >
                    {copiedSection === "outperform" ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        {language === "Arabic" ? "تم نسخ المنشور" : "Copied Post"}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        {language === "Arabic" ? "نسخ المنشور" : "Copy Outperform Post"}
                      </>
                    )}
                  </Button>
                </div>
                
                <div 
                  dir={analysis.outperformContent && /[\u0600-\u06FF]/.test(analysis.outperformContent) ? "rtl" : "ltr"}
                  className="markdown-body prose prose-invert prose-sm xl:prose-base text-slate-300 bg-black/30 p-4 rounded-2xl border border-white/5 text-sm leading-relaxed max-h-[300px] overflow-y-auto"
                >
                  <Markdown
                    components={{
                      p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                      h1: ({ children }) => <h1 className="font-bold mt-4 mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="font-bold mt-3 mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="font-bold mt-2 mb-1">{children}</h3>,
                      h4: ({ children }) => <h4 className="font-bold mt-2 mb-1">{children}</h4>,
                      h5: ({ children }) => <h5 className="font-bold mt-1 mb-1">{children}</h5>,
                      h6: ({ children }) => <h6 className="font-bold mt-1 mb-1">{children}</h6>,
                      li: ({ children }) => <li>{children}</li>,
                      ul: ({ children }) => <ul className="list-disc pl-5 rtl:pl-0 rtl:pr-5 my-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 rtl:pl-0 rtl:pr-5 my-2">{children}</ol>,
                    }}
                  >
                    {analysis.outperformContent}
                  </Markdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
