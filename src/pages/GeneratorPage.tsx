import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles, Copy, RefreshCw, CheckCircle2, Dices, Download, Bookmark, BookmarkCheck, Eraser, Heart, Globe, Target, Sliders, Settings2, MessageCircle, Share2, Send, MoreHorizontal, ThumbsUp, Flame, Play, Eye, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import Markdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { fetchWithBackoff } from "@/utils/apiRetry";
import { telemetry } from "@/lib/telemetry";

type GeneratorType = "full" | "hook" | "caption" | "script" | "angle" | "analyzer";

const enabledOptions: Record<GeneratorType, {
  platform: boolean;
  audience: boolean;
  goal: boolean;
  tone: boolean;
  language: boolean;
  length: boolean;
  negativeWords: boolean;
}> = {
  full: { platform: true, audience: true, goal: true, tone: true, language: true, length: true, negativeWords: true },
  hook: { platform: true, audience: true, goal: true, tone: true, language: true, length: false, negativeWords: true },
  caption: { platform: true, audience: true, goal: true, tone: true, language: true, length: true, negativeWords: true },
  script: { platform: true, audience: true, goal: true, tone: true, language: true, length: true, negativeWords: true },
  angle: { platform: true, audience: true, goal: true, tone: true, language: true, length: false, negativeWords: true },
  analyzer: { platform: true, audience: true, goal: true, tone: false, language: true, length: false, negativeWords: false },
};

const getLengthOptions = (type: GeneratorType) => {
  if (type === "caption") {
    return [
      { value: "Short (One-liner)", label: "Short (One-liner)" },
      { value: "Medium (1-2 paragraphs)", label: "Medium (1-2 paragraphs)" },
      { value: "Long (Detailed story & bullets)", label: "Long (Detailed story & bullets)" },
    ];
  }
  if (type === "script") {
    return [
      { value: "Short (< 30s Video)", label: "Short (< 30s Video)" },
      { value: "Medium (30-60s Video)", label: "Medium (30-60s Video)" },
      { value: "Long (> 60s Video)", label: "Long (> 60s Video)" },
    ];
  }
  return [
    { value: "Short (Quick post)", label: "Short (Quick post)" },
    { value: "Medium (Standard post)", label: "Medium (Standard post)" },
    { value: "Long (Deep dive post)", label: "Long (Deep dive post)" },
  ];
};

const analyzeContent = (text: string, platformName: string, tFunc: (k: string) => string) => {
  if (!text) return { score: 0, criteria: [] };

  let score = 50; // Base score
  const criteria: Array<{ label: string; passed: boolean; tip: string }> = [];

  // 1. Hook check (First line length and impact words)
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const firstLine = lines[0] || "";
  
  // High emotion/hooks words
  const viralTriggers = [
    "secret", "secrets", "stop", "never", "mistake", "mistakes", "how to", "why", "shocking", "reveal", "hide", "destroy", "win", "lose",
    "سر", "أسرار", "توقف", "إياك", "خطأ", "أخطاء", "كيف", "لماذا", "صادم", "حقيقة", "خسارة", "ربح", "تويتر", "إنستغرام", "شاهد", "احذر", "فرصة", "عاجل"
  ];
  const hasTrigger = viralTriggers.some(word => firstLine.toLowerCase().includes(word));
  if (hasTrigger) {
    score += 15;
  }
  criteria.push({
    label: tFunc("First Line Hook"),
    passed: hasTrigger,
    tip: hasTrigger 
      ? tFunc("Strong Scroll-stopping hook word detected in the opener.") 
      : tFunc("Start with strong trigger words like: 'Secrets', 'Stop doing this' or 'How to...'.")
  });

  // 2. Curiosity trigger: Includes a question mark or numbers
  const hasQuestion = text.includes('?') || text.includes('؟');
  const hasNumbers = /\d+/.test(text);
  const hasCuriosity = hasQuestion || hasNumbers;
  if (hasCuriosity) {
    score += 15;
  }
  criteria.push({
    label: tFunc("Curiosity Factor"),
    passed: hasCuriosity,
    tip: hasCuriosity 
      ? tFunc("Excellent! Use of lists or questions will spike initial impressions.") 
      : tFunc("Incorporate numbers ('3 Ways...') or an intriguing question to build interest.")
  });

  // 3. Emojis and visual readability
  const hasEmoji = /[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}/gu.test(text);
  if (hasEmoji) {
    score += 10;
  }
  const hasLineBreaks = lines.length >= 4;
  if (hasLineBreaks) {
    score += 10;
  }
  criteria.push({
    label: tFunc("Visual Readability"),
    passed: hasEmoji && hasLineBreaks,
    tip: (hasEmoji && hasLineBreaks)
      ? tFunc("Polished formatting! Space breaks and icons are highly engaging and clear.")
      : tFunc("Use visual line breaks and relevant emojis to keep reading effortless.")
  });

  // 4. CTA (Call To Action) Presence
  const ctaWords = [
    "comment", "share", "write", "save", "click", "follow", "link", "insta", "youtube", "tiktok",
    "اكتب", "شارك", "تابع", "احفظ", "رابط", "تعليق", "التعليقات", "إنستجرام", "اليوتيوب", "تيك توك"
  ];
  const hasCTA = ctaWords.some(word => text.toLowerCase().includes(word));
  if (hasCTA) {
    score += 10;
  }
  criteria.push({
    label: tFunc("Call to Action (CTA)"),
    passed: hasCTA,
    tip: hasCTA 
      ? tFunc("Strong retention loop! Clear direction encouraging shares, comments or saves.") 
      : tFunc("Always prompt viewers to save, comment or click the link in bio.")
  });

  score = Math.min(score, 100);

  return { score, criteria };
};

const getRichAuditScores = (text: string, platformName: string, isAr: boolean) => {
  if (!text) {
    return { hook: 0, clarity: 0, cta: 0, engagement: 0, overall: 0, explanation: "" };
  }

  // Normalize lowercased text
  const normText = text.toLowerCase();
  
  // Basic properties
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordsCount = words.length;
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const linesCount = lines.length;
  const firstLine = text.trim().split("\n")[0] || "";
  
  // --- Hook Score logic ---
  let hookScore = 50;
  
  const viralTriggers = [
    "secret", "secrets", "stop", "never", "mistake", "mistakes", "how to", "why", "shocking", "reveal", "hide", "destroy", "win", "lose", "exclusive",
    "سر", "أسرار", "توقف", "إياك", "خطأ", "أخطاء", "كيف", "لماذا", "صادم", "حقيقة", "خسارة", "ربح", "احذر", "فرصة", "عاجل", "حصري", "طريقة"
  ];
  const hasHookTrigger = viralTriggers.some(word => firstLine.toLowerCase().includes(word));
  if (hasHookTrigger) hookScore += 25;
  
  const firstLineHasEmoji = /[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}/gu.test(firstLine);
  if (firstLineHasEmoji) hookScore += 10;
  
  if (firstLine.includes("?") || firstLine.includes("؟") || firstLine.includes("!")) hookScore += 10;
  if (firstLine.trim().startsWith("**")) hookScore += 10; // Bolded typography header
  if (firstLine.length >= 15 && firstLine.length <= 90) hookScore += 10; // optimal visual balance

  hookScore = Math.min(100, Math.max(45, hookScore));

  // --- Readability & Clarity logic ---
  let clarityScore = 50;
  
  const hasGenerousSpacing = text.includes("\n\n") || text.includes("\r\n\r\n");
  if (hasGenerousSpacing) clarityScore += 20;

  const hasBulletPoints = /[-•*📍👉📝📌1\.2\.3\.]/.test(text);
  if (hasBulletPoints) clarityScore += 15;

  // Paragraph lengths: checking average words per line
  const avgWordsPerLine = linesCount > 0 ? wordsCount / linesCount : 20;
  if (avgWordsPerLine < 15) {
    clarityScore += 15; // snappy and fast to scan
  } else if (avgWordsPerLine < 30) {
    clarityScore += 8;
  }

  // Ideal length bounds
  if (wordsCount >= 35 && wordsCount <= 280) {
    clarityScore += 10;
  }

  clarityScore = Math.min(100, Math.max(45, clarityScore));

  // --- CTA Score logic ---
  let ctaScore = 45;
  
  const ctaWords = [
    "comment", "share", "write", "save", "click", "follow", "link", "insta", "youtube", "tiktok", "bookmark", "bio", "dm", "type",
    "اكتب", "شارك", "تابع", "احفظ", "رابط", "تعليق", "التعليقات", "إنستجرام", "اليوتيوب", "تيك توك", "سجل", "انضم", "رأيك", "قوليلي", "اضغط"
  ];
  const hasCTA = ctaWords.some(word => normText.includes(word));
  if (hasCTA) ctaScore += 25;

  // Check last few lines for interactive questions or comments request
  const lastLines = lines.slice(-3).join("\n");
  const lastLinesHaveQuestion = lastLines.includes("?") || lastLines.includes("؟");
  if (lastLinesHaveQuestion) ctaScore += 20;

  const mentionsInteractiveKeyword = normText.includes("comment word") || normText.includes("اكتب كلمة");
  if (mentionsInteractiveKeyword) ctaScore += 15;

  ctaScore = Math.min(100, Math.max(40, ctaScore));

  // --- Expected Share & Saves Score ---
  let engagementScore = 45;
  
  const saveWords = [
    "save this", "bookmark", "for later", "reference", "احفظ", "مفضلة", "الرجع", "مرجع"
  ];
  const promptsToSave = saveWords.some(word => normText.includes(word));
  if (promptsToSave) engagementScore += 25;

  const hasHighlyShareableEmojis = /[😂🤣😅☠️🔥🚀💯🦾👑💡🤔🎯]/.test(text);
  if (hasHighlyShareableEmojis) engagementScore += 15;

  // Lists/step-by-step formats are highly saved
  const bulletCount = (text.match(/[-•*📍👉📝📌]/g) || []).length;
  if (bulletCount >= 3) {
    engagementScore += 20;
  }

  if (wordsCount > 60) {
    engagementScore += 10; // actual depth of content
  }

  engagementScore = Math.min(100, Math.max(40, engagementScore));

  // --- Overall Calculation ---
  const overallScore = Math.round((hookScore * 0.3) + (clarityScore * 0.2) + (ctaScore * 0.2) + (engagementScore * 0.3));

  // --- Tailored Explanation Generation (Dynamic & High Value) ---
  let explanation = "";
  
  // Egyptian Arabic Detection
  const hasEgyptian = /عشان|ايه|بقى|دا|طب|اكتبلي|يا جماعة|معايا|كده|بص/.test(normText);
  // Saudi Arabic Detection
  const hasSaudi = /وش|تبغى|وشلون|ياهلا|ابي|الحين|حياكم|مرة/.test(normText);
  // Humor detection
  const hasHumor = /[😂🤣😅☠️]|هههه/.test(text);

  if (isAr) {
    if (overallScore >= 82) {
      explanation = "مذهل! هذا النص مهيأ بنسبة 100% ليصعد بقوة في خوارزميات عام 2026. ";
      if (hasEgyptian) {
        explanation += "اللمسة المصرية والتعابير المستخدمة تعطي دفئاً وقرباً طبيعياً شديد القوة يزيد من بقاء الزائر.";
      } else if (hasSaudi) {
        explanation += "استخدام اللهجة السعودية البيضاء منسق جداً ويزيد من مصداقية وثقة المهتمين والمستثمرين بالخليج.";
      } else {
        explanation += "الهيكلة متزنة للغاية والفواصل مريحة جداً لمسح الأعين السريع.";
      }
      
      if (promptsToSave) {
        explanation += " وجود طلب الحفظ المباشر سيحقق لك أرقام سيفز ممتازة للانتشار التراكمي.";
      }
    } else if (overallScore >= 65) {
      explanation = "تنسيق النص رائع والوضوح ممتاز. ";
      if (hasHumor) {
        explanation += "دمج الحس الفكاهي الطريف ممتاز لجعل القارئ يبتسم، ";
      }
      explanation += "ولكن لتحقيق انفجار في أرقام الوصول، نقترح كتابة سؤال تفاعلي مثير بأول المنشور أو حث المتابعين على حفظ البوست كمرجع تفصيلي.";
    } else {
      explanation = "البنية مقبولة ولكنها تحتاج قوة أكبر. ننصح بإضافة بعض الكلمات التحفيزية الحماسية (أسرار، توقف، طريقة) بالخطاف أو تحويل صياغة الكلام لأسلوب مرن وتفاعلي بلهجة قريبة للجمهور.";
    }
  } else {
    if (overallScore >= 82) {
      explanation = "Magnificent! Highly optimized for modern 2026 algorithms. ";
      if (hasEgyptian) {
        explanation += "The beautiful Egyptian flavor builds exceptional organic warmth and increases audience retention.";
      } else if (hasSaudi) {
        explanation += "The native White Saudi dialect carries a very elite and professional vibe that targets the Gulf market flawlessly.";
      } else {
        explanation += "Excellent spacing, powerful formatting, and balanced emoji distributions keep readers hooked.";
      }
      if (promptsToSave) {
        explanation += " Clear save/bookmark prompt guarantees highly compound viral reach.";
      }
    } else if (overallScore >= 65) {
      explanation = "Great job on the layout structure. ";
      if (hasHumor) {
        explanation += "We love the organic light humor you have injected! ";
      }
      explanation += "To raise it to viral heights, focus on building stronger curiosity in the first line, or make your call-to-action (CTA) highly urgent.";
    } else {
      explanation = "Performance can be significantly boosted. Try including curiosity triggers (mistake, secrets, shocking) or making your paragraphs much shorter to prevent eye-strain on mobile.";
    }
  }

  return {
    hook: hookScore,
    clarity: clarityScore,
    cta: ctaScore,
    engagement: engagementScore,
    overall: overallScore,
    explanation
  };
};

const arabicDialects = [
  { code: "ar-EG", label: "العربية (مصر 🇪🇬)", labelEn: "Arabic (Egypt)" },
  { code: "ar-SA", label: "العربية (السعودية 🇸🇦)", labelEn: "Arabic (Saudi Arabia)" },
  { code: "ar-AE", label: "العربية (الإمارات 🇦🇪)", labelEn: "Arabic (United Arab Emirates)" },
  { code: "ar-KW", label: "العربية (الكويت 🇰🇼)", labelEn: "Arabic (Kuwait)" },
  { code: "ar-QA", label: "العربية (قطر 🇶🇦)", labelEn: "Arabic (Qatar)" },
  { code: "ar-DZ", label: "العربية (الجزائر 🇩🇿)", labelEn: "Arabic (Algeria)" },
  { code: "ar-MA", label: "العربية (المغرب 🇲🇦)", labelEn: "Arabic (Morocco)" },
  { code: "ar-IQ", label: "العربية (العراق 🇮🇶)", labelEn: "Arabic (Iraq)" },
  { code: "ar-SY", label: "العربية (سوريا 🇸🇾)", labelEn: "Arabic (Syria)" },
  { code: "ar-JO", label: "العربية (الأردن 🇯🇴)", labelEn: "Arabic (Jordan)" },
  { code: "ar-LB", label: "العربية (لبنان 🇱🇧)", labelEn: "Arabic (Lebanon)" },
  { code: "ar-OM", label: "العربية (عمان 🇴🇲)", labelEn: "Arabic (Oman)" },
  { code: "ar-BH", label: "العربية (البحرين 🇧🇭)", labelEn: "Arabic (Bahrain)" },
];

const englishDialects = [
  { code: "en-US", label: "الإنجليزية (أمريكا 🇺🇸)", labelEn: "English (United States)" },
  { code: "en-GB", label: "الإنجليزية (بريطانيا 🇬🇧)", labelEn: "English (United Kingdom)" },
  { code: "en-AU", label: "الإنجليزية (أستراليا 🇦🇺)", labelEn: "English (Australia)" },
  { code: "en-CA", label: "الإنجليزية (كندا 🇨🇦)", labelEn: "English (Canada)" },
  { code: "en-IN", label: "الإنجليزية (الهند 🇮🇳)", labelEn: "English (India)" },
  { code: "en-ZA", label: "الإنجليزية (جنوب أفريقيا 🇿🇦)", labelEn: "English (South Africa)" },
  { code: "en-NZ", label: "الإنجليزية (نيوزيلندا 🇳🇿)", labelEn: "English (New Zealand)" },
  { code: "en-IE", label: "الإنجليزية (أيرلندا 🇮🇪)", labelEn: "English (Ireland)" },
];

export default function GeneratorPage({ type }: { type: GeneratorType }) {
  const { user } = useAuth();
  const { t, language: uiLanguage } = useLanguage();
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("Instagram (Reels & Posts)");
  const [audience, setAudience] = useState("General Public (Broad mass appeal)");
  const [goal, setGoal] = useState("Virality & High-Volume Views");
  const [tone, setTone] = useState("Curiosity, Hook-Driven & Mysterious");
  const [customTone, setCustomTone] = useState("");
  const [customPlatform, setCustomPlatform] = useState("");
  const [customAudience, setCustomAudience] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [customLanguage, setCustomLanguage] = useState("");
  const [negativeWords, setNegativeWords] = useState("");
  const [language, setLanguage] = useState("English (US / Global Trend-Setter)");
  const [length, setLength] = useState("Medium (30-60s)");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>("");
  const [retryState, setRetryState] = useState<{
    attempt: number;
    maxRetries: number;
    delayMs: number;
    isActive: boolean;
    reason: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"brief" | "strategy" | "advanced">("brief");
  const [viewMode, setViewMode] = useState<"text" | "mockup" | "edit">("text");

  // Speech Synthesis (TTS Player) Engine States
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [selectedDialectCode, setSelectedDialectCode] = useState("ar-EG");
  const [customInstruction, setCustomInstruction] = useState("");

  // AI Voice Emotion & Diacritics States
  const [isEnhancingTTS, setIsEnhancingTTS] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<"Excited" | "Dramatic" | "Warm" | "Professional">("Professional");
  const [pacingNotes, setPacingNotes] = useState("");

  // Custom metadata collections (Brand Voice Profiles & Projects)
  const [brandProfiles, setBrandProfiles] = useState<any[]>([]);
  const [selectedBrandProfileId, setSelectedBrandProfileId] = useState<string>("");
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Content Scheduling panel states
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedDate, setSchedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [schedTime, setSchedTime] = useState("12:00");
  const [schedProject, setSchedProject] = useState("");
  const [schedulingSuccess, setSchedulingSuccess] = useState(false);

  useEffect(() => {
    const fetchGeneratorMetadata = async () => {
      if (!user) return;
      try {
        const qBrands = query(
          collection(db, "brand_profiles"),
          where("userId", "==", user.uid)
        );
        const snapshotBrands = await getDocs(qBrands);
        const fetchedBrands: any[] = [];
        snapshotBrands.forEach((doc) => {
          fetchedBrands.push({ id: doc.id, ...doc.data() });
        });
        setBrandProfiles(fetchedBrands);

        const qProjects = query(
          collection(db, "projects"),
          where("userId", "==", user.uid)
        );
        const snapshotProjects = await getDocs(qProjects);
        const fetchedProjects: any[] = [];
        snapshotProjects.forEach((doc) => {
          fetchedProjects.push({ id: doc.id, ...doc.data() });
        });
        setProjectsList(fetchedProjects);
      } catch (err) {
        console.error("Error loading generator active configurations:", err);
      }
    };
    fetchGeneratorMetadata();
  }, [user]);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const voices = window.speechSynthesis.getVoices();
        const unique = Array.from(new Map(voices.map(v => [v.name, v])).values());
        
        // Remove unnecessary languages from the voiceover, leaving only Arabic and English
        const filtered = unique.filter((v) => {
          const l = v.lang.toLowerCase();
          return l.startsWith("ar") || l.startsWith("en");
        });
        setAvailableVoices(filtered);
        
        // Detect if content is Arabic or UI is Arabic
        const isAr = uiLanguage === "Arabic" || (result && /[\u0600-\u06FF]/.test(result));
        const preferredLang = isAr ? "ar" : "en";
        const defaultVoice = filtered.find(v => v.lang.toLowerCase().startsWith(preferredLang)) || filtered[0];
        if (defaultVoice) {
          setSelectedVoiceName(defaultVoice.name);
          const cleanedLangCode = defaultVoice.lang.replace('_', '-');
          if (isAr) {
            setSelectedDialectCode(cleanedLangCode.startsWith('ar') ? cleanedLangCode : 'ar-EG');
          } else {
            setSelectedDialectCode(cleanedLangCode.startsWith('en') ? cleanedLangCode : 'en-US');
          }
        }
      }
    };
    loadVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [uiLanguage, result]);

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech Synthesis is not fully supported in this iframe. Open preview in a new tab for native voice.");
      return;
    }

    if (isPlayingSpeech) {
      window.speechSynthesis.cancel();
      setIsPlayingSpeech(false);
      telemetry.track({
        category: "Engagement",
        action: "VocalNarratorStop"
      });
      return;
    }

    if (!result) return;

    // Detect actual language of the generated text (Arabic vs English)
    const isTextArabic = /[\u0600-\u06FF]/.test(result);

    // Fully strip markdown symbols, backticks, asterisks, hashtags, emojis, and underscores
    let cleanText = result;
    
    // 1. Remove Markdown images: ![alt](url) -> ""
    cleanText = cleanText.replace(/!\[.*?\]\(.*?\)/g, "");
    
    // 2. Extract text from MD links: [text](url) -> text
    cleanText = cleanText.replace(/\[(.*?)\]\(.*?\)/g, "$1");
    
    // 3. Strip bold/italic markers: **, *, __, _ e.g., **bold** -> bold
    cleanText = cleanText.replace(/\*\*([^*]+)\*\*/g, "$1");
    cleanText = cleanText.replace(/\*([^*]+)\*/g, "$1");
    cleanText = cleanText.replace(/__([^_]+)__/g, "$1");
    cleanText = cleanText.replace(/_([^_]+)_/g, "$1");
    
    // 4. Strip single backticks (inline code): `code` -> code
    cleanText = cleanText.replace(/`([^`]+)`/g, "$1");
    
    // 5. Strip code blocks: ```lang...``` -> ""
    cleanText = cleanText.replace(/```[\s\S]*?```/g, " ");
    
    // 6. Strip hashes at start of lines (headers): #, ##, ###
    cleanText = cleanText.replace(/^\s*#+\s+/gm, "");
    cleanText = cleanText.replace(/#/g, " ");

    // 7. Strip blockquote prefixes: >
    cleanText = cleanText.replace(/^\s*>\s+/gm, "");

    // 8. Strip list indicators: -, *, +, numbers with dots: 1. or 2. at start of lines
    cleanText = cleanText.replace(/^\s*[-*+]\s+/gm, "");
    
    // 9. Strip brackets, parentheses, brace punctuation:
    cleanText = cleanText.replace(/[\[\]\(\)\{\}]/g, " ");
    
    // 10. Strip other markdown and layout dividers: ---, ===, ___, etc.
    cleanText = cleanText.replace(/[-=_]{3,}/g, " ");

    // 11. Keep the existing emoji, dash and unwanted character removal:
    cleanText = cleanText
      .replace(/[-–—•|🗣️🎙️👉📍⚠️🚨📈🔮🤖💡🚀🔥👑🎯✨💥💪📅📝💼🔥🕵️📊]/gu, " ")
      .replace(/[\u{1F300}-\u{1FDFF}\u{1F600}-\u{1F6FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Remove common non-verbal lines sometimes printed by AI models (e.g. system prefixes/meta headers)
    const unwantedPrefixes = [
      "viral hook:", "hook:", "body:", "call to action:", "cta:", "explanation:", "audit score:", "audit:",
      "خطاف فيروسي:", "خطاف:", "النص المقترح:", "النص المنشور:", "الدعوة للتفاعل:", "ملاحظة:"
    ];
    
    unwantedPrefixes.forEach(prefix => {
      const reg = new RegExp("^" + prefix + "\\s*", "i");
      cleanText = cleanText.replace(reg, "");
    });

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Configure voice language with the detected content language or selected dialect
    utterance.lang = selectedDialectCode || (isTextArabic ? "ar-EG" : "en-US");
    
    if (selectedVoiceName) {
      const matchedVoice = availableVoices.find(v => v.name === selectedVoiceName);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    } else {
      // Automatic fallback matching logic based on the desired dialect
      const targetLang = selectedDialectCode || (isTextArabic ? "ar-EG" : "en-US");
      const prefPrefix = targetLang.split('-')[0].toLowerCase();
      const matchedVoice = availableVoices.find(v => 
        v.lang.toLowerCase() === targetLang.toLowerCase() ||
        v.lang.toLowerCase().replace('_', '-').startsWith(targetLang.toLowerCase()) ||
        v.lang.toLowerCase().startsWith(prefPrefix)
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }
    
    // Intelligently calibrate vocal delivery settings based on the detected emotion or tone
    let emotionRateMultiplier = 1.0;
    let emotionPitchMultiplier = 1.0;

    switch (detectedEmotion) {
      case "Excited":
        emotionRateMultiplier = 1.12; // Elevated energy, faster delivery
        emotionPitchMultiplier = 1.15; // Higher animated pitch
        break;
      case "Dramatic":
        emotionRateMultiplier = 0.85; // Serious, slower, cinematic delivery
        emotionPitchMultiplier = 0.92; // Slightly deeper, resonant pitch
        break;
      case "Warm":
        emotionRateMultiplier = 0.92; // Reassuring, conversational pacing
        emotionPitchMultiplier = 1.02; // Warm, friendly delivery tone
        break;
      case "Professional":
      default:
        emotionRateMultiplier = 1.0;
        emotionPitchMultiplier = 1.0;
        break;
    }

    utterance.rate = speechRate * emotionRateMultiplier;
    utterance.pitch = emotionPitchMultiplier;
    
    utterance.onend = () => {
      setIsPlayingSpeech(false);
    };
    utterance.onerror = (e) => {
      setIsPlayingSpeech(false);
      console.warn("[Telemetry Widget] Speech Synthesis error", e);
      telemetry.track({
        category: "Engagement",
        action: "VocalNarratorFailure",
        label: e.error || "Speech Synthesis error occurrence",
        metadata: { voice: selectedVoiceName, reason: String(e.error), details: "Usually autoplay-protection blocking in embedded frames" }
      });
    };

    // Track active play session
    telemetry.track({
      category: "Engagement",
      action: "VocalNarratorPlay",
      label: isTextArabic ? "Arabic Voice" : "English Voice",
      metadata: { dialect: selectedDialectCode || "ar-EG", voiceId: selectedVoiceName || "Default", emotion: detectedEmotion }
    });

    setIsPlayingSpeech(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleAIEnhanceSpeech = async () => {
    if (!result) return;
    setIsEnhancingTTS(true);
    setError("");
    try {
      const isArabic = /[\u0600-\u06FF]/.test(result);
      const prompt = `Act as an expert AI Voice Director, Speech Coach, and Arabist Phonetician.
You are hired to optimize the following script for a completely natural, human-like, non-robotic voiceover.

Here is the Text:
"""
${result}
"""

Instructions:
1. DIACRITICS (TASHKEEL): If the text is in Arabic (العربية), you MUST add comprehensive, precise, and grammatically sound Arabic diacritics/tashkeel (التشكيل التلقائي السليم بالحركات: فتحة، ضمة، كسرة، سكون، شدة، وتنوين) to all letters and end of words so the automated system reads it flawlessly without spelling ambiguity. If the text is in English, keep it as is, but improve phrasing flow with smart punctuation.
2. NATURAL PACING: Inject natural transitions, commas, dashes, and ellipses (...) for pauses and deep breathes.
3. EMOTION ANALYSIS: Gauge the exact emotional tone of this text. Pick exactly one of these labels:
   - "Excited" (High energy, enthusiastic, upbeat, viral callout style)
   - "Dramatic" (Suspenseful, dramatic, serious, slow focus)
   - "Warm" (Sincere, friendly, calming, story-like warmth)
   - "Professional" (Informative, authoritative, balanced)

You MUST respond with a strict, single-record JSON formatted object containing the keys: "diacritizedText", "detectedEmotion", and "pacingNotes". Do NOT append any markdown commentary, prefix, or postfix wrapper.
Example Output Format:
{
  "diacritizedText": "...",
  "detectedEmotion": "Warm",
  "pacingNotes": "..."
}`;

      const response = await fetchWithBackoff("/api/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-UID": user?.uid || "",
          "X-User-Email": user?.email || ""
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to optimize voiceover diacritics and emotional delivery");
      }

      const resData = await response.json();
      let textResponse = resData.result || "";
      if (textResponse.includes("```json")) {
        textResponse = textResponse.split("```json")[1].split("```")[0].trim();
      } else if (textResponse.includes("```")) {
        textResponse = textResponse.split("```")[1].split("```")[0].trim();
      }

      const parsed = JSON.parse(textResponse.trim());
      if (parsed.diacritizedText) {
        setResult(parsed.diacritizedText);
      }
      if (parsed.detectedEmotion) {
        setDetectedEmotion(parsed.detectedEmotion);
      }
      if (parsed.pacingNotes) {
        setPacingNotes(parsed.pacingNotes);
      }

      telemetry.track({
        category: "Engagement",
        action: "SpeechAIEnhanced",
        label: parsed.detectedEmotion,
        metadata: { emotion: parsed.detectedEmotion, diacriticsAdded: isArabic }
      });
    } catch (err: any) {
      console.warn("Speech AI Enhancer fell back to heuristic profiling:", err);
      // Fallback heuristics
      const lower = result.toLowerCase();
      if (lower.includes("secret") || lower.includes("shock") || lower.includes("غريب") || lower.includes("سر")) {
        setDetectedEmotion("Dramatic");
      } else if (lower.includes("!") || lower.includes("now") || lower.includes("free") || lower.includes("تعال")) {
        setDetectedEmotion("Excited");
      } else if (lower.includes("tip") || lower.includes("guide") || lower.includes("كيف") || lower.includes("نصائح")) {
        setDetectedEmotion("Professional");
      } else {
        setDetectedEmotion("Warm");
      }
    } finally {
      setIsEnhancingTTS(false);
    }
  };

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleClear = () => {
    setTopic("");
    setNegativeWords("");
    setResult("");
    setError("");
    setPlatform("Instagram Reels");
    setAudience("General Audience");
    setGoal("Engagement & Views");
    setTone("Curiosity");
    setCustomTone("");
    const defaultLen = getLengthOptions(type)[1]?.value || "Medium (Standard post)";
    setLength(defaultLen);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleRandomize = () => {
    const analyzerTopics = [
      "A gym owner posting daily workout snippets and meal plans",
      "A real estate agent showing luxury apartments in Cairo",
      "A B2B SaaS startup posting about remote work tools",
      "A freelance designer sharing tips on getting high ticket clients",
      "A travel vlogger exploring hidden gems in Egypt",
      "A tech reviewer testing the newest smartphones and laptops",
      "A home-based bakery showing the behind-the-scenes of cake decorating",
      "A financial advisor explaining crypto and stock market trends",
      "An indie game developer sharing devlogs of their upcoming 3D platformer",
      "A productivity coach giving advice on avoiding burnout",
      "A coffee shop owner sharing latte art and daily cafe routines",
      "A polyglot teaching language learning hacks and cultural nuances",
      "A minimalist sharing decluttering tips and aesthetic room makeovers",
      "A career consultant giving resume and interview advice for 2026",
      "A pet trainer demonstrating basic commands and behavioral fixes"
    ];

    const generalTopics = [
      "How to focus better and stop wasting time in 2026",
      "A new side hustle that makes money using AI",
      "Why classic marketing is dead and what you should do instead",
      "3 mistakes you make when starting a new business",
      "Daily vlog: working remotely from a beach in Dahab",
      "The ultimate guide to building a personal brand from scratch",
      "How to prepare healthy meals for the week in under 2 hours",
      "Why you shouldn't buy a house in 2026",
      "5 hidden features in the latest iOS update you need to try",
      "The crazy story of how a small startup beat the giants",
      "A beginner's guide to investing in index funds",
      "How I learned to code in 6 months while working full-time",
      "The truth about digital nomad life (it's not all beaches)",
      "My exact process for editing viral short-form videos",
      "Why most people fail at their New Year's resolutions",
      "The easiest way to start an e-commerce store with zero money",
      "My 5 AM morning routine for maximum productivity",
      "How to negotiate a higher salary at your current job",
      "A review of the most popular AI tools for creators",
      "The secret to taking professional photos with just your phone"
    ];

    const platforms = [
      "Instagram (Reels & Posts)",
      "TikTok / Douyin",
      "YouTube (Shorts & Videos)",
      "LinkedIn (Posts & Newsletters)",
      "Twitter / X (Premium Threads)",
      "Snapchat Spotlight",
      "Pinterest (Idea Pins & Boards)",
      "Threads (By Meta)",
      "Facebook (Groups, Pages & Reels)"
    ];
    const audiences = [
      "General Public (Broad mass appeal)",
      "Gen Z (Short-attention, hyper-digital)",
      "Gen Alpha (Early adopters, gaming cohorts)",
      "Millennials (Value-driven, tech-literate)",
      "High-Ticket B2B (CEOs, Founders, Buyers)",
      "Creatives & Content Creators (Influencers, Editors)",
      "Tech/AI Professionals & Developers",
      "Fitness, Wellness & Health Seekers",
      "E-commerce Sellers & Retailers",
      "College Students & Fresh Graduates"
    ];
    const goals = [
      "Virality & High-Volume Views",
      "Direct Sales & High-Converting Leads",
      "Community Engagement & Active Discussions",
      "High-Ticket Client Nurturing & Trust",
      "Thought Leadership & Education",
      "Saves, Bookmarks & Shared Shares",
      "Brand Loyalty & Authenticity"
    ];
    const tones = [
      "Curiosity, Hook-Driven & Mysterious",
      "Bold, Piercing & Direct",
      "Sarcastic, Witty & Pop-Culture Savvy",
      "Educational, Authoritative & Grounded",
      "Inspiring, Story-Led & Heroic",
      "Warm, Friendly & Empathetic",
      "FOMO, Urgent & Scarcity-Focused",
      "Technical, Analytical & Data-Proven"
    ];
    const languages = [
      "English (US / Global Trend-Setter)",
      "Modern Standard Arabic (Classical & Fluid)",
      "Saudi Dialect (Modern Riyadhi & Gulf Broad)",
      "Egyptian Dialect (Viral Cairene & Fun Dialect)",
      "Gulf Dialect (White Gulf Arab)",
      "Levantine Dialect (Shami Flow)",
      "Iraqi Dialect (Vibrant Mesopotamian)",
      "Combined Franco-Arab (Dynamic Bilingual Mixing)"
    ];
    const lenOpts = getLengthOptions(type).map((opt) => opt.value);

    const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

    let randomTopic;
    do {
      randomTopic = type === "analyzer" ? getRandom(analyzerTopics) : getRandom(generalTopics);
    } while (randomTopic === topic);

    // Reset any custom manual fields to preserve UI integrity and avoid state leakage
    setCustomPlatform("");
    setCustomAudience("");
    setCustomGoal("");
    setCustomTone("");
    setCustomLanguage("");

    // Initialize randomized configurations
    const randomPlatform = getRandom(platforms);
    const randomGoal = getRandom(goals);
    const randomLanguage = getRandom(languages);
    let randomLength = lenOpts.length > 0 ? getRandom(lenOpts) : "";

    setTopic(randomTopic);
    setPlatform(randomPlatform);
    setGoal(randomGoal);
    setLanguage(randomLanguage);
    if (randomLength) {
      setLength(randomLength);
    }

    // 1. Synchronize brand voice profiles constraint update
    let selectedBrandId = "";
    let finalTone = getRandom(tones);
    let finalAudience = getRandom(audiences);
    let finalNegativeWords = "";

    // 50% chance to select a real saved Brand Voice profile if any exist to align with the constraints
    if (brandProfiles && brandProfiles.length > 0 && Math.random() < 0.5) {
      const chosenBrand = getRandom(brandProfiles);
      selectedBrandId = chosenBrand.id;
      if (chosenBrand.tone) finalTone = chosenBrand.tone;
      if (chosenBrand.audience) finalAudience = chosenBrand.audience;
      if (chosenBrand.forbiddenWords) finalNegativeWords = chosenBrand.forbiddenWords;
    } else {
      // Otherwise set to default empty brand and randomize negative words
      const sampleNegatives = [
        "groundbreaking, revolution, paradigm, synergistic",
        "next-level, game-changer, buzzword, disrupt",
        "stellar, premium, ultimate, skyrocket",
        ""
      ];
      finalNegativeWords = getRandom(sampleNegatives);
    }

    setSelectedBrandProfileId(selectedBrandId);
    setTone(finalTone);
    setAudience(finalAudience);
    setNegativeWords(finalNegativeWords);

    // 2. Synchronize project assignment settings update
    let selectedProjId = "";
    if (projectsList && projectsList.length > 0 && Math.random() < 0.5) {
      const chosenProj = getRandom(projectsList);
      selectedProjId = chosenProj.id;
    }
    setSelectedProjectId(selectedProjId);

    // 3. Dispatch global custom browser event to sync state across anything listening globally
    if (typeof window !== "undefined") {
      const eventPayload = {
        topic: randomTopic,
        platform: randomPlatform,
        audience: finalAudience,
        goal: randomGoal,
        tone: finalTone,
        language: randomLanguage,
        length: randomLength,
        negativeWords: finalNegativeWords,
        brandProfileId: selectedBrandId,
        projectId: selectedProjId,
        timestamp: Date.now()
      };
      
      // Store globally in localStorage as well to keep sessions integrated
      localStorage.setItem("creator_last_random_state", JSON.stringify(eventPayload));
      
      window.dispatchEvent(new CustomEvent("creator_randomized", { 
        detail: eventPayload 
      }));
    }

    // Monitor random seed event
    telemetry.track({
      category: "GeneratorAction",
      action: "RandomIdeaTriggered",
      label: randomTopic,
      metadata: { 
        type,
        platform: randomPlatform,
        audience: finalAudience,
        goal: randomGoal,
        tone: finalTone,
        language: randomLanguage,
        brandProfileSelected: !!selectedBrandId,
        projectSelected: !!selectedProjId
      }
    });
  };

  const location = useLocation();

  useEffect(() => {
    setActiveTab("brief");
    if (location.state?.reuse) {
      const s = location.state.reuse;
      if (s.topic) setTopic(s.topic);
      if (s.platform) setPlatform(s.platform);
      if (s.audience) setAudience(s.audience);
      if (s.goal) setGoal(s.goal);
      if (s.tone) setTone(s.tone);
      if (s.language) setLanguage(s.language);
      if (s.length) setLength(s.length);
      
      // Clear location state so it doesn't stick around on refresh
      try {
        window.history.replaceState(null, document.title);
      } catch (e) {
        console.warn("Failed to clear history state:", e);
      }
    } else {
      setTopic("");
      setResult("");
      setError("");
      setCopied(false);
      setSaved(false);
      const defaultLen = getLengthOptions(type)[1]?.value || "Medium (Standard post)";
      setLength(defaultLen);
    }
  }, [type, location.key]);

  const configParams = {
    full: {
      title: "Full Content",
      desc: "Generate a complete post with Hook, Body, and Call to Action.",
      promptTemplate: (
        t: string,
        p: string,
        a: string,
        g: string,
        o: string,
        l: string,
        len: string,
      ) =>
        `Act as an expert social media strategist operating in the year 2026. Create a full, complete piece of content about "${t}".
        Platform: ${p}. Target Audience: ${a}. Primary Goal: ${g}. Tone of voice: ${o}. Language: ${l}. Length: ${len}.
        Important: Tailor the tone EXACTLY to the Target Audience. DO NOT use overly populist language or street slang (شعبية) unless explicitly requested. Maintain a polished style suitable for the audience while using culturally relevant references for 2026. Make sure the content length matches the requirement: ${len}.
        The content MUST be structured into exactly three clear sections:
        1. **Hook**: A scroll-stopping opening sentence or question.
        2. **Body**: The main value, story, or educational content.
        3. **Call to Action (CTA)**: A strong, clear next step for the user.
        Format the output clearly with these exact headings. Include suitable emojis.`,
    },
    hook: {
      title: "Viral Hook Generator",
      desc: "Create attention-grabbing openers for short-form videos.",
      promptTemplate: (
        t: string,
        p: string,
        a: string,
        g: string,
        o: string,
        l: string,
        len: string,
      ) =>
        `Act as an expert social media viral marketer operating in the year 2026. Generate 10 highly engaging, scroll-stopping hooks for a video about "${t}". 
        Platform: ${p}. Target Audience: ${a}. Primary Goal: ${g}. Tone of voice: ${o}. Language: ${l}.
        Important: Tailor the tone EXACTLY to the Target Audience. DO NOT use overly populist language or street slang (شعبية) unless explicitly requested. Maintain a polished style suitable for the audience while using culturally relevant references for the year 2026.
        Format the output as a clear numbered list. Do not include any intro/outro text. Focus strictly on the hooks.`,
    },
    caption: {
      title: "Caption AI",
      desc: "Write compelling captions complete with emojis and hashtags.",
      promptTemplate: (
        t: string,
        p: string,
        a: string,
        g: string,
        o: string,
        l: string,
        len: string,
      ) =>
        `Act as an expert social media copywriter operating in the year 2026. Write a highly engaging caption for a post about "${t}".
        Platform: ${p}. Target Audience: ${a}. Primary Goal: ${g}. Tone of voice: ${o}. Language: ${l}. Length: ${len}.
        Important: Tailor the tone EXACTLY to the Target Audience. DO NOT use overly populist language or street slang (شعبية) unless explicitly requested. Maintain a polished, professional, or natural style suitable for the audience. Use culturally relevant references and platform features for the year 2026. Ensure the caption length represents: ${len}.
        Include appropriate emojis, a strong Call To Action (CTA), and 5-10 relevant hashtags. Format nicely with line breaks.`,
    },
    script: {
      title: "Reel Script Writer",
      desc: "Generate full scene-by-scene video scripts.",
      promptTemplate: (
        t: string,
        p: string,
        a: string,
        g: string,
        o: string,
        l: string,
        len: string,
      ) =>
        `Act as an expert short-form video producer operating in the year 2026. Write a complete, highly engaging video script about "${t}".
        Platform: ${p}. Target Audience: ${a}. Primary Goal: ${g}. Tone of voice: ${o}. Language: ${l}. Overall Length: ${len}.
        Important: Tailor the tone EXACTLY to the Target Audience. DO NOT use overly populist language or street slang (شعبية) unless explicitly requested. Maintain a polished style suitable for the audience while using culturally relevant references for 2026. Adjust the pacing and word count precisely to fit the required length requirement: ${len}.
        Format the output clearly into: 
        1. The Hook (0-3s)
        2. Scene Breakdown (Visuals/B-roll instructions + Audio/Spoken words)
        3. Call to Action (CTA)
        Keep it optimized for high retention.`,
    },
    angle: {
      title: "Viral Angles Generator",
      desc: "Convert one topic into multiple unique marketing angles.",
      promptTemplate: (
        t: string,
        p: string,
        a: string,
        g: string,
        o: string,
        l: string,
        len: string,
      ) =>
        `Act as an expert social media strategist operating in the year 2026. Take the core topic "${t}" and generate 5 completely different specific content angles/perspectives tailored for ${p}.
        Target Audience: ${a}. Primary Goal: ${g}. Use a ${o} tone and output in ${l}.
        Important: Ensure the marketing strategies reflect modern consumer behavior and trends from the year 2026. Tailor the tone EXACTLY to the Target Audience. DO NOT use overly populist language or street slang (شعبية) unless explicitly requested.
        For each angle, provide:
        - Angle Name (e.g. The "Fear of Missing Out" Angle)
        - Brief description of the concept
        - Example Hook.`,
    },
    analyzer: {
      title: "Competitor Analyzer",
      desc: "Analyze a competitor's strategy and get content ideas.",
      promptTemplate: (
        t: string,
        p: string,
        a: string,
        g: string,
        o: string,
        l: string,
        len: string,
      ) =>
        `Act as an expert social media analyst operating in the year 2026. Analyze the following competitor profile/activity description: "${t}".
        Platform: ${p}. Our brand's target audience: ${a}. Our goal: ${g}. Desired output language: ${l}.
        Important: Base your analysis and suggestions on the platform algorithms and best practices as of the year 2026. Maintain a professional analysis tone.
        Provide a detailed analysis including:
        1. Likely tone of voice and content style they use.
        2. Suggested posting strategy based on what might be working for them.
        3. Engagement methods they use.
        4. Actionable ideas on how we can create content in this niche.`,
    },
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setError("");
    setResult("");
    setCopied(false);
    setSaved(false);

    // Track initial Generation event
    telemetry.track({
      category: "ContentCreator",
      action: "GenerationStarted",
      label: type,
      metadata: { topic: topic.slice(0, 50), platform }
    });

    try {
      let finalPlatform = platform === "Custom" ? (customPlatform || "General Platform") : platform;
      let finalAudience = audience === "Custom" ? (customAudience || "General Audience") : audience;
      let finalGoal = goal === "Custom" ? (customGoal || "Engagement & Views") : goal;
      let finalTone = tone === "Custom" ? (customTone || "Natural & Engaging") : tone;
      let finalLanguage = language === "Custom" ? (customLanguage || "English") : language;
      let finalNegativeWords = negativeWords;

      // Brand Voice configuration check
      const chosenBrand = brandProfiles.find(b => b.id === selectedBrandProfileId);
      if (chosenBrand) {
        finalTone = chosenBrand.tone || finalTone;
        finalAudience = chosenBrand.audience || finalAudience;
        if (chosenBrand.forbiddenWords) {
          finalNegativeWords = finalNegativeWords
            ? `${finalNegativeWords}, ${chosenBrand.forbiddenWords}`
            : chosenBrand.forbiddenWords;
        }
      }

      let prompt = configParams[type].promptTemplate(
        topic,
        finalPlatform,
        finalAudience,
        finalGoal,
        finalTone,
        finalLanguage,
        length,
      );
      
      prompt += `\n\nCRITICAL INSTRUCTION: You MUST write your ENTIRE final response strictly in the ${finalLanguage} language/dialect. DO NOT literally translate English phrasing. Always use the native vocabulary, idioms, and natural sentence structures of ${finalLanguage} (e.g., if Egyptian Arabic is requested, use authentic Egyptian colloquialisms and phrasing). Ensure high-quality, natural-sounding, and culturally appropriate content.`;

      if (chosenBrand) {
        prompt += `\n\nCRITICAL BRAND VOICE IDENTITY CONSTRAINT: You MUST align this content with the brand "${chosenBrand.name}":
- Tone and Vibe: "${chosenBrand.tone}"
- Target Client Demographics: "${chosenBrand.audience}"
- Keywords to include or emphasize: "${chosenBrand.keywords}"`;
      }

      if (finalNegativeWords.trim()) {
        prompt += `\n\nCRITICAL INSTRUCTION: You MUST NOT use any of the following words or phrases in your response under any circumstances: ${finalNegativeWords.trim()}`;
      }

      setRetryState(null);
      // Profile the streaming API latency for real-time telemetry analytics
      const response = await telemetry.profileLatency(`Generate_${type}`, () => 
        fetchWithBackoff("/api/generate", {
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

            // Track standard backoff events
            telemetry.track({
              category: "ContentCreator",
              action: "GenerationRetryBackoff",
              label: `Attempt ${state.attempt}`,
              metadata: { attempt: state.attempt, delayMs: state.delayMs }
            });
          }
        })
      );
      setRetryState(null);

      if (!response.ok) {
        let errMsg = `Server returned ${response.status} ${response.statusText}`;
        let errJson: any = null;
        try {
          errJson = await response.json();
          if (errJson && errJson.error) {
            errMsg = uiLanguage === "Arabic" ? (errJson.errorAr || errJson.error) : errJson.error;
          }
        } catch (e) {}
        
        if (response.status === 429) {
          if (errJson) {
            const parsedErr = uiLanguage === "Arabic" ? (errJson.errorAr || errJson.error) : errJson.error;
            throw new Error(parsedErr);
          }
          throw new Error(
            uiLanguage === "Arabic"
              ? "لقد تجاوزت حدود الاستخدام المجاني المؤقتة أو خدمة توليد الذكاء الاصطناعي مضغوطة جدًا حاليًا. يرجى الانتظار دقيقة أو ضبط مستوى تكرار الكتابة."
              : "You have exceeded temporary rate limits or the shared AI engine is currently highly busy. Please wait a minute and retry."
          );
        }
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
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
               const data = line.slice(6);
               if (data === '[DONE]') break;
               try {
                 const parsed = JSON.parse(data);
                 if (parsed.text) {
                   fullText += parsed.text;
                   setResult(fullText);
                 }
               } catch (e) {
                 // ignore parsing errors
               }
            }
          }
        }
      }

      const text = fullText.trim();
      setResult(text);

      if (text) {
        // Track success state
        telemetry.track({
          category: "ContentCreator",
          action: "GenerationSuccess",
          label: type,
          metadata: { 
            platform: finalPlatform, 
            language: finalLanguage, 
            chars: text.length,
            wordsCount: text.split(/\s+/).filter(Boolean).length,
            generatedWords: text
          }
        });

        if (user) {
          try {
            await addDoc(collection(db, "generations"), {
              userId: user.uid,
              type,
              topic,
              platform,
              audience: finalAudience,
              goal,
              tone: finalTone,
              language,
              result: text,
              projectId: selectedProjectId || null,
              createdAt: serverTimestamp(),
            });

            // Log successful generation to telemetry activity_logs
            await addDoc(collection(db, "activity_logs"), {
              userId: user.uid,
              email: user.email,
              type: "generation_success",
              action: "generate_content",
              topic,
              platform,
              contentType: type,
              timestamp: serverTimestamp()
            });
          } catch (dbErr) {
             console.error("Failed to save generation to history:", dbErr);
          }
        }
      } else {
        setError("No content generated. Please try again.");
      }
    } catch (err: any) {
      setRetryState(null);
      console.error(err);
      let errorMessage = err?.message || "An error occurred while communicating with the AI.";
      
      // Clearly explain why content generation might be temporarily unavailable to the user
      const isQuotaError = errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("secrets") || errorMessage.includes("الحصة") || errorMessage.includes("Secrets");
      
      if (!isQuotaError && (errorMessage.includes("429") || errorMessage.toLowerCase().includes("rate limit") || errorMessage.toLowerCase().includes("too many requests"))) {
        errorMessage = uiLanguage === "Arabic"
          ? "توليد المحتوى متوقف مؤقتاً بسبب تجاوز معدل الطلبات المسموح به للنموذج (Rate Limit - 429). يحدث هذا عادةً عند التوليد السريع والمتكرر خلال بضع ثوانٍ، أو بسبب استهلاك الحد المجاني اليومي المتاح. لحل المشكلة، يرجى الانتظار من 30 إلى 60 ثانية قبل المحاولة من جديد لكي تقوم خوادم Gemini بتهدئة الاتصال."
          : "Content generation is temporarily unavailable due to rate limits (429). This happens when too many generations are requested in a short window, or when the free tier shared limits are exhausted. To resolve, kindly take a 30-to-60-second break so that Gemini's server cooled-off period passes successfully.";
      } else if (errorMessage.toLowerCase().includes("fetch") || errorMessage.toLowerCase().includes("network") || errorMessage.toLowerCase().includes("failed to fetch") || errorMessage.toLowerCase().includes("offline")) {
        errorMessage = uiLanguage === "Arabic"
          ? "حدثت مشكلة في الاتصال بالإنترنت أو عدم استقرار في الشبكة. لقد قمنا بالعديد من محاولات الاتصال التلقائي وإعادة المحاولة بفاصل زمني تصاعدي، ولكن تعذر الوصول لخادم الذكاء الاصطناعي بنجاح. يرجى التحقق من جودة الاتصال وتحديث الصفحة ثم المحاولة مجدداً."
          : "A network connectivity or speed fluctuation occurred. We initiated automatic retries with exponential backoff but were unable to reach the AI model server. Please ensure you have a stable active internet connection, update the page, and try again.";
      }
      setError(errorMessage);
      
      // Track content generation failure
      telemetry.track({
        category: "ContentCreator",
        action: "GenerationFailure",
        label: type,
        metadata: { error: errorMessage }
      });
      
      if (user) {
        try {
          await addDoc(collection(db, "activity_logs"), {
            userId: user.uid,
            email: user.email,
            type: "generation_error",
            error: errorMessage,
            topic,
            timestamp: serverTimestamp()
          });
        } catch (e) {
          console.error("Failed to log error", e);
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefinement = async (modifierInstruction: string) => {
    if (!result || isGenerating) return;

    setIsGenerating(true);
    setError("");
    const prevResult = result;
    setResult(""); // Clear result to stream the new refined one nicely!
    setCopied(false);
    setSaved(false);

    // Track modification start
    telemetry.track({
      category: "ContentCreator",
      action: "RefinementStarted",
      label: type,
      metadata: { instruction: modifierInstruction.substring(0, 50) }
    });

    try {
      const prompt = `Act as an expert social media copywriter and growth strategist operating in the year 2026.
Take this existing generated social media content:
"""
${prevResult}
"""

Now, perform the following strict adjustment / refinement: "${modifierInstruction}".

Ensure you:
1. Maintain the platform format (${platform}), language focus (${language}), and target audience alignment (${audience}).
2. Do not translate English tags/structures literally if writing in Arabic dialects; keep colloquial structures native and appealing.
3. Keep the content highly engaging and formatted with appropriate line breaks and emojis.
4. Output ONLY the improved, refined content. Do NOT include any introductory or explanatory text (e.g., do not say "Sure, here's the edited post").`;

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
        let errMsg = `Server returned ${response.status} ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = uiLanguage === "Arabic" ? (errData.errorAr || errData.error) : errData.error;
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
                   setResult(fullText);
                 }
               } catch (e) {}
            }
          }
        }
      }

      const text = fullText.trim();
      if (text) {
        setResult(text);
        
        telemetry.track({
          category: "ContentCreator",
          action: "RefinementSuccess",
          label: type,
          metadata: { 
            instruction: modifierInstruction.substring(0, 50),
            wordsCount: text.split(/\s+/).filter(Boolean).length,
            generatedWords: text
          }
        });

        if (user) {
          try {
            const finalAudience = audience === "Custom" ? (customAudience || "General Audience") : audience;
            const finalGoal = goal === "Custom" ? (customGoal || "Engagement & Views") : goal;
            const finalTone = tone === "Custom" ? (customTone || "Natural & Engaging") : tone;
            const finalPlatform = platform === "Custom" ? (customPlatform || "General Platform") : platform;
            
            // Build a descriptive label indicating this is refined content
            const modifiedTopic = `${topic} (${uiLanguage === "Arabic" ? "تعديل: " : "Refined: "}${modifierInstruction.substring(0, 30)}...)`;

            // Save the newly refined item as a persistent generation so it appears in the History!
            await addDoc(collection(db, "generations"), {
              userId: user.uid,
              type,
              topic: modifiedTopic,
              platform: finalPlatform,
              audience: finalAudience,
              goal: finalGoal,
              tone: finalTone,
              language,
              result: text,
              projectId: selectedProjectId || null,
              createdAt: serverTimestamp(),
            });

            await addDoc(collection(db, "activity_logs"), {
              userId: user.uid,
              action: "refine_content",
              instruction: modifierInstruction,
              timestamp: serverTimestamp()
            });
          } catch (e) {
            console.error("Failed to save refined generation to history database collection:", e);
          }
        }
      } else {
        setResult(prevResult);
      }
    } catch (err: any) {
      setRetryState(null);
      console.error(err);
      let errorMessage = err?.message || "An error occurred while refining content.";
      if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("rate limit") || errorMessage.toLowerCase().includes("too many requests")) {
        errorMessage = uiLanguage === "Arabic"
          ? "تعديل المحتوى وتحسينه متوقف مؤقتاً بسبب تجاوز معدل طلبات النموذج (Rate Limit - 429). يرجى الانتظار دقيقة والضغط لإعادة التحسين."
          : "Refinement is temporarily unavailable due to rate limits (429). Please pause for a short duration and trigger optimization again.";
      } else if (errorMessage.toLowerCase().includes("fetch") || errorMessage.toLowerCase().includes("network") || errorMessage.toLowerCase().includes("failed to fetch")) {
        errorMessage = uiLanguage === "Arabic"
          ? "لم نتمكن من تعديل المقطع بسبب خلل في اتصال الشبكة الإلكترونية. تم تطبيق فواصل انتظار تصاعدية غير أنها تجاوزت الحد. تأكد من ثبات الإنترنت ثم أعد التعديل."
          : "A network-level error prevented refining the content. Connection attempts timed out. Ensure your connection is online and click rewrite again.";
      }
      setError(errorMessage);
      setResult(prevResult);
      
      telemetry.track({
        category: "ContentCreator",
        action: "RefinementFailure",
        label: type,
        metadata: { error: errorMessage, instruction: modifierInstruction.substring(0, 50) }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    telemetry.track({
      category: "ContentCreator",
      action: "CopyContent",
      label: type,
      metadata: { length: result.length }
    });
  };

  const downloadAsText = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-${topic.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    telemetry.track({
      category: "ContentCreator",
      action: "DownloadContent",
      label: type,
      metadata: { length: result.length }
    });
  };

  const saveIdea = async () => {
    if (!result || !user || saved) return;
    try {
      await addDoc(collection(db, "saved_ideas"), {
        userId: user.uid,
        type,
        topic,
        platform,
        audience,
        goal,
        tone,
        language,
        result,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!result || !user) return;
    try {
      setSchedulingSuccess(false);
      await addDoc(collection(db, "calendar_items"), {
        userId: user.uid,
        title: topic.substring(0, 35) || "محتوى مجدول من المولد",
        content: result,
        platform: platform,
        scheduledAt: schedDate,
        time: schedTime,
        projectId: schedProject || null,
        createdAt: serverTimestamp()
      });
      setSchedulingSuccess(true);
      setTimeout(() => {
        setIsScheduling(false);
        setSchedulingSuccess(false);
      }, 2500);
    } catch (e) {
      console.error("Scheduling error:", e);
    }
  };

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 min-h-0 items-start">
      {/* Form Sidebar */}
      <div className="col-span-1 md:col-span-5 md:sticky md:top-6 md:h-[calc(100vh-7rem)] flex flex-col bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-4 overflow-hidden">
        <div className="flex-shrink-0">
          <h2 className="text-3xl font-bold text-slate-100 mb-1">
            {t(configParams[type].title)}
          </h2>
          <p className="text-sm text-slate-400">{t(configParams[type].desc)}</p>
        </div>

        <form onSubmit={handleGenerate} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-5 pr-1.5 pb-2 scrollbar-thin">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase block tracking-wider">
                    {type === "analyzer" ? t("Competitor Info") : t("Topic or Idea")}
                  </label>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={handleClear}
                      className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md hover:bg-red-400/10"
                      title="Clear and Focus"
                    >
                      <Eraser className="w-4 h-4" />
                      <span className="hidden sm:inline">{t("Clear")}</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={handleRandomize}
                      className="text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md hover:bg-purple-400/10"
                      title="Fill with random example"
                    >
                      <Dices className="w-4 h-4" />
                      <span className="hidden sm:inline">{t("Random Idea")}</span>
                    </button>
                  </div>
                </div>
                <Textarea
                  ref={inputRef}
                  placeholder={
                    type === "analyzer"
                      ? "e.g. Competitor Name and what they post about..."
                      : "e.g. 5 steps to start a digital marketing agency..."
                  }
                  className="resize-none h-32"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={4000}
                  required
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-[10px] ${topic.length >= 4000 ? 'text-red-400' : topic.length > 3500 ? 'text-amber-500' : 'text-slate-500'}`}>
                    {topic.length} / 4000
                  </span>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/40 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setActiveTab("brief")}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[10px] sm:text-xs font-semibold gap-1 transition-all duration-200",
                    activeTab === "brief"
                      ? "bg-violet-600/20 text-violet-400 border border-violet-500/20 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                  )}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t("Brief Settings")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("strategy")}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[10px] sm:text-xs font-semibold gap-1 transition-all duration-200",
                    activeTab === "strategy"
                      ? "bg-violet-600/20 text-violet-400 border border-violet-500/20 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                  )}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>{t("Marketing Strategy")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("advanced")}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[10px] sm:text-xs font-semibold gap-1 transition-all duration-200",
                    activeTab === "advanced"
                      ? "bg-violet-600/20 text-violet-400 border border-violet-500/20 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                  )}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{t("Advanced Settings")}</span>
                </button>
              </div>

              {/* Tab Content Areas */}
              <div className="space-y-4">
                {activeTab === "brief" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Brand Voice Profile Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        {uiLanguage === "Arabic" ? "ملف نبرة الهوية" : "Brand Voice Profile"}
                      </label>
                      <Select
                        value={selectedBrandProfileId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedBrandProfileId(val);
                          const chosen = brandProfiles.find(b => b.id === val);
                          if (chosen) {
                            if (chosen.tone) setTone(chosen.tone);
                            if (chosen.audience) setAudience(chosen.audience);
                            if (chosen.forbiddenWords) setNegativeWords(chosen.forbiddenWords);
                          }
                        }}
                      >
                        <option value="">{uiLanguage === "Arabic" ? "عام (بدون هوية مخصصة)" : "None (General Setup)"}</option>
                        {brandProfiles.map((brand) => (
                          <option key={brand.id} value={brand.id}>{brand.name}</option>
                        ))}
                      </Select>
                      {brandProfiles.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic mt-0.5 leading-relaxed">
                          {uiLanguage === "Arabic" ? "💡 يمكنك إضافة نبرة وهوية براند خاصة من صفحة الإعدادات لتثبيتها هنا." : "💡 Tip: Setup brand voice profiles in Settings to enforce key vocabulary."}
                        </p>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                          <span>{uiLanguage === "Arabic" ? "تأثير الهوية مُفعّل تلقائيًا عند تحديد البروفايل" : "Brand parameters lock active"}</span>
                        </div>
                      )}
                    </div>

                    {/* Project Folder Assignment */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        {uiLanguage === "Arabic" ? "مجلد المشروع" : "Project Folder"}
                      </label>
                      <Select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                      >
                        <option value="">{uiLanguage === "Arabic" ? "عام (بدون مجلد مخصص)" : "General (No folder)"}</option>
                        {projectsList.map((proj) => (
                          <option key={proj.id} value={proj.id}>{proj.name}</option>
                        ))}
                      </Select>
                    </div>

                    {enabledOptions[type].platform && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          {t("Platform")}
                        </label>
                        <Select
                          value={platform}
                          onChange={(e) => setPlatform(e.target.value)}
                        >
                          <option value="Instagram (Reels & Posts)">{t("Instagram (Reels & Posts)")}</option>
                          <option value="TikTok / Douyin">{t("TikTok / Douyin")}</option>
                          <option value="YouTube (Shorts & Videos)">{t("YouTube (Shorts & Videos)")}</option>
                          <option value="LinkedIn (Posts & Newsletters)">{t("LinkedIn (Posts & Newsletters)")}</option>
                          <option value="Twitter / X (Premium Threads)">{t("Twitter / X (Premium Threads)")}</option>
                          <option value="Snapchat Spotlight">{t("Snapchat Spotlight")}</option>
                          <option value="Pinterest (Idea Pins & Boards)">{t("Pinterest (Idea Pins & Boards)")}</option>
                          <option value="Threads (By Meta)">{t("Threads (By Meta)")}</option>
                          <option value="Facebook (Groups, Pages & Reels)">{t("Facebook (Groups, Pages & Reels)")}</option>
                          <option value="Custom">{t("Custom (Write own / مخصص)")}</option>
                        </Select>
                        {platform === "Custom" && (
                          <div className="mt-2 text-sm animate-in slide-in-from-top-1 duration-200">
                            <Input 
                              placeholder={t("e.g. Write custom option here...")} 
                              value={customPlatform}
                              onChange={(e) => setCustomPlatform(e.target.value)}
                              className="h-9"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "strategy" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {enabledOptions[type].audience && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          {t("Target Audience")}
                        </label>
                        <Select
                          value={audience}
                          onChange={(e) => setAudience(e.target.value)}
                        >
                          <option value="General Public (Broad mass appeal)">{t("General Public (Broad mass appeal)")}</option>
                          <option value="Gen Z (Short-attention, hyper-digital)">{t("Gen Z (Short-attention, hyper-digital)")}</option>
                          <option value="Gen Alpha (Early adopters, gaming cohorts)">{t("Gen Alpha (Early adopters, gaming cohorts)")}</option>
                          <option value="Millennials (Value-driven, tech-literate)">{t("Millennials (Value-driven, tech-literate)")}</option>
                          <option value="High-Ticket B2B (CEOs, Founders, Buyers)">{t("High-Ticket B2B (CEOs, Founders, Buyers)")}</option>
                          <option value="Creatives & Content Creators (Influencers, Editors)">{t("Creatives & Content Creators (Influencers, Editors)")}</option>
                          <option value="Tech/AI Professionals & Developers">{t("Tech/AI Professionals & Developers")}</option>
                          <option value="Fitness, Wellness & Health Seekers">{t("Fitness, Wellness & Health Seekers")}</option>
                          <option value="E-commerce Sellers & Retailers">{t("E-commerce Sellers & Retailers")}</option>
                          <option value="College Students & Fresh Graduates">{t("College Students & Fresh Graduates")}</option>
                          <option value="Custom">{t("Custom (Write own / مخصص)")}</option>
                        </Select>
                        {audience === "Custom" && (
                          <div className="mt-2 text-sm animate-in slide-in-from-top-1 duration-200">
                            <Input 
                              placeholder={t("e.g. Write custom option here...")} 
                              value={customAudience}
                              onChange={(e) => setCustomAudience(e.target.value)}
                              className="h-9"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {enabledOptions[type].goal && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          {t("Goal")}
                        </label>
                        <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
                          <option value="Virality & High-Volume Views">{t("Virality & High-Volume Views")}</option>
                          <option value="Direct Sales & High-Converting Leads">{t("Direct Sales & High-Converting Leads")}</option>
                          <option value="Community Engagement & Active Discussions">{t("Community Engagement & Active Discussions")}</option>
                          <option value="High-Ticket Client Nurturing & Trust">{t("High-Ticket Client Nurturing & Trust")}</option>
                          <option value="Thought Leadership & Education">{t("Thought Leadership & Education")}</option>
                          <option value="Saves, Bookmarks & Shared Shares">{t("Saves, Bookmarks & Shared Shares")}</option>
                          <option value="Brand Loyalty & Authenticity">{t("Brand Loyalty & Authenticity")}</option>
                          <option value="Custom">{t("Custom (Write own / مخصص)")}</option>
                        </Select>
                        {goal === "Custom" && (
                          <div className="mt-2 text-sm animate-in slide-in-from-top-1 duration-200">
                            <Input 
                              placeholder={t("e.g. Write custom option here...")} 
                              value={customGoal}
                              onChange={(e) => setCustomGoal(e.target.value)}
                              className="h-9"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {enabledOptions[type].tone && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          {t("Tone of Voice")}
                        </label>
                        <Select
                          value={tone}
                          onChange={(e) => setTone(e.target.value)}
                        >
                          <option value="Curiosity, Hook-Driven & Mysterious">{t("Curiosity, Hook-Driven & Mysterious")}</option>
                          <option value="Bold, Piercing & Direct">{t("Bold, Piercing & Direct")}</option>
                          <option value="Sarcastic, Witty & Pop-Culture Savvy">{t("Sarcastic, Witty & Pop-Culture Savvy")}</option>
                          <option value="Educational, Authoritative & Grounded">{t("Educational, Authoritative & Grounded")}</option>
                          <option value="Inspiring, Story-Led & Heroic">{t("Inspiring, Story-Led & Heroic")}</option>
                          <option value="Warm, Friendly & Empathetic">{t("Warm, Friendly & Empathetic")}</option>
                          <option value="FOMO, Urgent & Scarcity-Focused">{t("FOMO, Urgent & Scarcity-Focused")}</option>
                          <option value="Technical, Analytical & Data-Proven">{t("Technical, Analytical & Data-Proven")}</option>
                          <option value="Custom">{t("Custom (Write own / مخصص)")}</option>
                        </Select>
                        {tone === "Custom" && (
                          <div className="mt-2 text-sm animate-in slide-in-from-top-1 duration-200">
                            <Input 
                              placeholder={t("e.g. Sarcastic but friendly")} 
                              value={customTone}
                              onChange={(e) => setCustomTone(e.target.value)}
                              className="h-9"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "advanced" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {enabledOptions[type].language && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          {t("Language")}
                        </label>
                        <Select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                        >
                          <option value="English (US / Global Trend-Setter)">{t("English (US / Global Trend-Setter)")}</option>
                          <option value="Modern Standard Arabic (Classical & Fluid)">{t("Modern Standard Arabic (Classical & Fluid)")}</option>
                          <option value="Saudi Dialect (Modern Riyadhi & Gulf Broad)">{t("Saudi Dialect (Modern Riyadhi & Gulf Broad)")}</option>
                          <option value="Egyptian Dialect (Viral Cairene & Fun Dialect)">{t("Egyptian Dialect (Viral Cairene & Fun Dialect)")}</option>
                          <option value="Gulf Dialect (White Gulf Arab)">{t("Gulf Dialect (White Gulf Arab)")}</option>
                          <option value="Levantine Dialect (Shami Flow)">{t("Levantine Dialect (Shami Flow)")}</option>
                          <option value="Iraqi Dialect (Vibrant Mesopotamian)">{t("Iraqi Dialect (Vibrant Mesopotamian)")}</option>
                          <option value="Combined Franco-Arab (Dynamic Bilingual Mixing)">{t("Combined Franco-Arab (Dynamic Bilingual Mixing)")}</option>
                          <option value="Custom">{t("Custom (Write own / مخصص)")}</option>
                        </Select>
                        {language === "Custom" && (
                          <div className="mt-2 text-sm animate-in slide-in-from-top-1 duration-200">
                            <Input 
                              placeholder={t("e.g. Write custom option here...")} 
                              value={customLanguage}
                              onChange={(e) => setCustomLanguage(e.target.value)}
                              className="h-9"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {enabledOptions[type].length && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          {t("Length")}
                        </label>
                        <Select
                          value={length}
                          onChange={(e) => setLength(e.target.value)}
                        >
                          {getLengthOptions(type).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {t(opt.label)}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}

                    {enabledOptions[type].negativeWords && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          {t("Negative Words")}
                        </label>
                        <Input
                          placeholder={t("e.g. cheap, free (comma separated)")}
                          value={negativeWords}
                          onChange={(e) => setNegativeWords(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 pt-4 border-t border-white/10 bg-transparent mt-auto">
              <Button
                type="submit"
                variant="gradient"
                className="w-full h-14 text-lg"
                disabled={isGenerating || !topic.trim()}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2 animate-spin" />{" "}
                    {t("Generating...")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" /> {t("Generate AI Content")}
                  </>
                )}
              </Button>
            </div>
          </form>
      </div>

      {/* Output Panel */}
      <div className="col-span-1 md:col-span-7 flex flex-col min-h-0 bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.1)]">
          <div className="p-6 border-b border-white/10 flex items-center justify-between flex-shrink-0 flex-wrap gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <span className="text-purple-400">{t("AI")}</span> {t("Output Preview")}
              </h3>
              {result && !isGenerating && (
                 <div className="hidden sm:flex text-xs text-slate-500 gap-3 border-l border-white/10 pl-4 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-4">
                    <span>{result.length} {t("Characters")}</span>
                    <span>{result.split(/\s+/).filter(word => word.length > 0).length} {t("Words")}</span>
                    <span className="text-purple-400/80">~{Math.ceil(result.split(/\s+/).filter(word => word.length > 0).length / 2.5)} {t("Seconds")} {t("Estimated Reading Time")}</span>
                 </div>
              )}
            </div>
            {result && !isGenerating && (
              <div className="flex items-center gap-3 flex-wrap">
                {/* View toggles */}
                <div className="flex bg-slate-950/60 rounded-xl p-0.5 border border-white/10 shadow-sm animate-in fade-in duration-300">
                  <button
                    type="button"
                    onClick={() => setViewMode("text")}
                    className={cn(
                      "px-3 py-1 text-xs rounded-lg transition-all font-semibold flex items-center gap-1",
                      viewMode === "text"
                        ? "bg-violet-600/30 text-violet-400 border border-violet-500/20"
                        : "text-slate-400 hover:text-slate-200 border border-transparent"
                    )}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{uiLanguage === "Arabic" ? "معاينة التنسيق" : "Formatted Preview"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("edit")}
                    className={cn(
                      "px-3 py-1 text-xs rounded-lg transition-all font-semibold flex items-center gap-1.5",
                      viewMode === "edit"
                        ? "bg-violet-600/30 text-violet-400 border border-violet-500/20"
                        : "text-slate-400 hover:text-slate-200 border border-transparent"
                    )}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                    <span>{uiLanguage === "Arabic" ? "تعديل مباشر وقياس فوري" : "Interactive Free Edit"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("mockup")}
                    className={cn(
                      "px-3 py-1 text-xs rounded-lg transition-all font-semibold flex items-center gap-1",
                      viewMode === "mockup"
                        ? "bg-violet-600/30 text-violet-400 border border-violet-500/20"
                        : "text-slate-400 hover:text-slate-200 border border-transparent"
                    )}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{uiLanguage === "Arabic" ? "محاكاة المنشور" : "Social Mockup"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={saveIdea}
                    className={`h-8 px-2 sm:px-3 text-xs ${saved ? "text-pink-500 hover:text-pink-400" : "text-slate-400 hover:text-pink-400"} transition-colors`}
                    disabled={saved}
                  >
                    {saved ? (
                      <>
                        <Heart className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1 fill-current" />{" "}
                        <span className="hidden sm:inline">{t("Saved")}</span>
                      </>
                    ) : (
                      <>
                        <Heart className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" /> <span className="hidden sm:inline">{t("Save")}</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={downloadAsText}
                    className="h-8 px-2 sm:px-3 text-xs text-slate-400 hover:text-white"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" /> <span className="hidden sm:inline">{t("Download")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    className="h-8 px-2 sm:px-3 text-xs text-slate-400 hover:text-white"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1 text-green-500" />{" "}
                        <span className="hidden sm:inline">{t("Copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" /> <span className="hidden sm:inline">{t("Copy")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto relative p-6 flex flex-col max-h-full">
            {!result && !isGenerating && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center empty-state w-full py-10 my-auto">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 mx-auto">
                  <Sparkles className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-300 font-medium mb-1 text-center w-full">
                  {t("Waiting for your ideas")}
                </p>
                <p className="text-sm text-slate-500 max-w-sm mx-auto text-center w-full">
                  {t("Fill out the form and hit generate!")}
                </p>
              </div>
            )}

            {isGenerating && !result && (
              <div className="flex-1 flex flex-col items-center justify-center text-center bg-transparent backdrop-blur-sm z-10 w-full py-10 my-auto">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-4 mx-auto" />
                <p className="text-sm text-slate-400 animate-pulse text-center w-full">
                  {t("Forging viral content...")}
                </p>
              </div>
            )}

            {retryState && retryState.isActive && (
              <div className="p-6 text-amber-400 bg-amber-950/20 rounded-2xl mb-4 border border-amber-900/30 animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                  <p className="font-semibold text-base">
                    {uiLanguage === "Arabic" 
                      ? "جاري إعادة المحاولة التلقائية لتوليد المقطع..." 
                      : "Automatic retry in progress..."}
                  </p>
                </div>
                <p className="text-sm opacity-90 mb-1">
                  {uiLanguage === "Arabic"
                    ? `معدل الطلبات مرتفع أو الشبكة غير مستقرة. المحاولة رقم ${retryState.attempt} من أصل ${retryState.maxRetries}`
                    : `Rate limit or network latency detected. Attempt ${retryState.attempt} of ${retryState.maxRetries}`}
                </p>
                <p className="text-xs text-slate-400">
                  {uiLanguage === "Arabic"
                    ? `جاري الانتظار لمدة ${Math.round(retryState.delayMs / 1000)} ثانية للتبريد وإعادة الطلب بأمان...`
                    : `Cooling down. Fetching again in ${Math.round(retryState.delayMs / 1000)} seconds...`}
                </p>
              </div>
            )}

            {error && (
              <div className="p-6 text-red-400 bg-red-950/20 rounded-2xl mb-4 border border-red-900/30">
                <p className="font-medium mb-1">{t("Error Generating Content")}</p>
                <p className="text-sm opacity-80">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                {/* Platform Character Audit Progress bar limits */}
                <div className="p-4 bg-slate-950/45 border border-white/5 rounded-2xl">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <span>💡</span> {uiLanguage === "Arabic" ? "مدى ملاءمة طول النص للمنصات الكبرى" : "Platform Character Limits compatibility check"}
                  </h4>
                  <div className="flex flex-row items-center gap-2.5 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-thin snap-x scroll-smooth">
                    {[
                      { 
                        name: "Twitter", 
                        max: 280, 
                        icon: (
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                        )
                      },
                      { 
                        name: "Threads", 
                        max: 500, 
                        icon: (
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a10 10 0 1 0 10 10"/>
                            <path d="M12 16a4 4 0 1 1 4-4v1.5a2.5 2.5 0 0 1-5 0V12"/>
                          </svg>
                        )
                      },
                      { 
                        name: "Instagram", 
                        max: 2200, 
                        icon: (
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                          </svg>
                        )
                      },
                      { 
                        name: "TikTok", 
                        max: 4000, 
                        icon: (
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.95.84 2.19 1.34 3.48 1.41V9.5c-1.57-.03-3.12-.51-4.45-1.42-.03 2.82-.01 5.64-.02 8.46-.02 1.48-.48 2.97-1.37 4.13-.96 1.13-2.35 1.86-3.81 2.05-1.89.26-3.87-.29-5.26-1.59-1.36-1.35-1.95-3.35-1.58-5.22.42-1.93 2.02-3.53 3.97-3.92V16c-1.04.22-1.94.97-2.3 1.98-.38 1.2.04 2.58 1.01 3.33.91.68 2.24.71 3.16.03.74-.61 1.11-1.6 1.09-2.55.03-4.14.01-8.28.02-12.42-1.05-.01-2.1-.03-3.15-.01C12.52 4.14 12.53 2.08 12.525.02z"/>
                          </svg>
                        )
                      },
                      { 
                        name: "LinkedIn", 
                        max: 3000, 
                        icon: (
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                          </svg>
                        )
                      },
                      { 
                        name: "YouTube", 
                        max: 5000, 
                        icon: (
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.163c-.272-1.016-1.07-1.815-2.085-2.087C19.56 3.75 12 3.75 12 3.75s-7.56 0-9.413.326c-1.014.272-1.813 1.071-2.085 2.087C.176 8.016.176 12 .176 12s0 3.984.326 5.837c.272 1.016 1.07 1.815 2.085 2.087 1.854.326 9.413.326 9.413.326s7.56 0 9.413-.326c1.016-.272 1.813-1.071 2.085-2.087.326-1.854.326-5.837.326-5.837s0-3.984-.326-5.837zM9.545 15.568V8.182l6.545 3.693-6.545 3.693z"/>
                          </svg>
                        )
                      },
                      { 
                        name: "Facebook", 
                        max: 63206, 
                        icon: (
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                          </svg>
                        )
                      }
                    ].map((platformCheck) => {
                      const charLength = result.length;
                      const isOver = charLength > platformCheck.max;
                      
                      return (
                        <div 
                          key={platformCheck.name} 
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] shrink-0 transition-all backdrop-blur-md snap-start",
                            isOver 
                              ? "bg-red-500/10 border-red-500/30 text-red-100 hover:bg-red-500/15" 
                              : "bg-slate-950/40 border-white/10 text-slate-300 hover:border-emerald-500/20 hover:bg-slate-900/40"
                          )}
                        >
                          <span className="shrink-0 flex items-center justify-center text-slate-300">{platformCheck.icon}</span>
                          <span className="font-semibold text-slate-200">{platformCheck.name}</span>
                          
                          <div className="h-3 w-[1px] bg-white/10 inline-block mx-0.5" />
                          
                          <span className={cn("font-mono font-medium", isOver ? "text-red-400 font-bold" : "text-slate-300")}>
                            {charLength}/{platformCheck.max}
                          </span>
                          
                          <span className={cn(
                            "inline-block w-1.5 h-1.5 rounded-full shrink-0 animate-pulse", 
                            isOver ? "bg-red-500 shadow-[0_0_6px_#ef4444]" : "bg-emerald-500 shadow-[0_0_6px_#10b981]"
                          )} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {viewMode === "text" ? (
                  <div className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 group relative shadow-md animate-in fade-in duration-200">
                    <div 
                      dir={result && /[\u0600-\u06FF]/.test(result) ? "rtl" : "ltr"}
                      className="markdown-body prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-headings:font-bold prose-a:text-purple-400 text-[15px] text-slate-200"
                    >
                      <Markdown
                        components={{
                          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                          h1: ({ children }) => <h1 className="font-bold mt-6 mb-4">{children}</h1>,
                          h2: ({ children }) => <h2 className="font-bold mt-5 mb-3">{children}</h2>,
                          h3: ({ children }) => <h3 className="font-bold mt-4 mb-2">{children}</h3>,
                          h4: ({ children }) => <h4 className="font-bold mt-3 mb-1">{children}</h4>,
                          h5: ({ children }) => <h5 className="font-bold mt-2 mb-1">{children}</h5>,
                          h6: ({ children }) => <h6 className="font-bold mt-1 mb-1">{children}</h6>,
                          li: ({ children }) => <li>{children}</li>,
                          ul: ({ children }) => <ul className="list-disc pl-5 rtl:pl-0 rtl:pr-5 my-3">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 rtl:pl-0 rtl:pr-5 my-3">{children}</ol>,
                        }}
                      >
                        {result}
                      </Markdown>
                    </div>
                    {isGenerating && (
                      <div className="absolute bottom-4 right-4 rtl:right-auto rtl:left-4 flex items-center gap-2 text-purple-400 text-xs font-medium">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="animate-pulse">{t("Generating...")}</span>
                      </div>
                    )}
                  </div>
                ) : viewMode === "edit" ? (
                  <div className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 group relative shadow-md flex flex-col gap-3.5 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                        </span>
                        {uiLanguage === "Arabic" ? "محرر مباشر تفاعلي" : "Active Dynamic Editor"}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-white/5 px-2.5 py-1 rounded-md">
                        {uiLanguage === "Arabic" ? "سيتغير تقييم ومؤشرات الذكاء الاصطناعي مع كل حرف تكتبه" : "The AI audit score adjusts in real-time as you write"}
                      </span>
                    </div>
                    
                    <textarea
                      value={result}
                      onChange={(e) => {
                        setResult(e.target.value);
                        setSaved(false); // Reset saved indicator in catalog when free-edited
                      }}
                      dir="auto"
                      className="w-full min-h-[300px] bg-black/40 border border-white/10 rounded-xl p-4 sm:p-5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all font-sans leading-relaxed text-[15px] resize-y"
                      placeholder={uiLanguage === "Arabic" ? "اكتب أو عدل النص المولد هنا..." : "Edit the generated post content here..."}
                    />
                    
                    {isGenerating && (
                      <div className="absolute bottom-8 right-8 rtl:right-auto rtl:left-8 flex items-center gap-2 text-purple-400 text-xs font-medium bg-slate-950 border border-white/10 px-3 py-1.5 rounded-lg shadow-xl shrink-0">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{t("Generating...")}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center justify-center py-4 animate-in fade-in zoom-in-95 duration-200">
                    {(() => {
                      const lowerPlatform = platform.toLowerCase();
                      
                      // TikTok / Instagram Reels / YouTube Shorts Preview
                      if (lowerPlatform.includes("tiktok") || lowerPlatform.includes("reels") || lowerPlatform.includes("shorts")) {
                        const linesMsg = result.split("\n").filter(l => l.trim().length > 0 && !l.startsWith("#") && !l.startsWith("-") && !l.includes("**") && !l.includes("##"));
                        const topHookMsg = linesMsg[0] || result.substring(0, 100);
                        
                        return (
                          <div className="dark-container relative w-full max-w-[320px] aspect-[9/16] bg-gradient-to-b from-[#030712] via-[#090d16] to-black rounded-[42px] border-[10px] border-[#1e293b] shadow-2xl overflow-hidden flex flex-col justify-between p-4 text-white">
                            {/* Device camera hole */}
                            <div className="absolute top-4 inset-x-0 flex items-center justify-between px-6 z-10">
                              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md py-1 px-2.5 rounded-full text-[9px] border border-white/10 font-bold uppercase tracking-wider text-purple-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <span>{platform} Live View</span>
                              </div>
                              <div className="w-16 h-4 rounded-full bg-[#0f172a] flex items-center justify-center border border-white/10">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#1e293b] border border-white/10" />
                              </div>
                            </div>

                            {/* Soundwave background visually */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                              <div className="w-40 h-40 rounded-full bg-purple-600/10 blur-3xl animate-pulse" />
                              <div className="flex gap-1.5">
                                {[...Array(8)].map((_, i) => (
                                  <span key={i} className="w-1.5 h-10 bg-purple-500/30 rounded-full" />
                                ))}
                              </div>
                            </div>

                            {/* Sticker visual representation of the Hook */}
                            <div className="my-auto z-10 w-full px-2">
                              <div className="bg-yellow-400 text-[#020617] p-4 rounded-2xl shadow-2xl font-black text-center text-sm border-2 border-slate-900 leading-snug transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                                🔥 {topHookMsg.replace(/^Hook:?\s*/i, "").replace(/^[0-9]+[\.\-]\s*/, "")}
                              </div>
                            </div>

                            {/* Lateral Action Buttons */}
                            <div className="absolute right-2 bottom-32 flex flex-col items-center gap-4 z-10">
                              <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:scale-110 active:scale-95 transition-all">
                                  <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                                </div>
                                <span className="text-[10px] font-semibold mt-1">42.8K</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:scale-110 active:scale-95 transition-all">
                                  <MessageCircle className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-semibold mt-1">1,940</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:scale-110 active:scale-95 transition-all">
                                  <BookmarkCheck className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                </div>
                                <span className="text-[10px] font-semibold mt-1">8,105</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:scale-110 active:scale-95 transition-all">
                                  <Share2 className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-semibold mt-1">{t("Share")}</span>
                              </div>
                            </div>

                            {/* Bottom profile overlay */}
                            <div className="z-10 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 rounded-3xl border border-white/5 backdrop-blur-xs">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-xs border border-white/20">
                                  {user?.email ? user.email.substring(0, 2).toUpperCase() : "ME"}
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-xs font-bold flex items-center gap-1">
                                    @{user?.email ? user.email.split("@")[0] : "hookify.creator"}
                                    <BadgeCheck className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                                  </h4>
                                  <p className="text-[9px] text-white/50">Digital Creator</p>
                                </div>
                              </div>
                              <p dir="auto" className="text-[11px] line-clamp-3 text-white/95 leading-relaxed">
                                {result}
                              </p>
                              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-1 text-[10px] text-purple-300 font-medium">
                                <span className="animate-spin duration-3000">💿</span>
                                <span className="truncate">Original Sound - @{user?.email ? user.email.split("@")[0] : "creator"}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // LinkedIn Post style
                      if (lowerPlatform.includes("linkedin")) {
                        return (
                          <div className="w-full max-w-[480px] bg-slate-900/90 border border-white/10 rounded-2xl p-5 text-white font-sans text-left shadow-2xl">
                            {/* LinkedIn content header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex gap-3">
                                <div className="w-11 h-11 rounded-lg bg-indigo-700 flex items-center justify-center font-bold text-md text-white border border-white/10 shadow-sm">
                                  {user?.email ? user.email.substring(0, 2).toUpperCase() : "ME"}
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-sm font-bold flex items-center gap-1 text-slate-100">
                                    {user?.email ? user.email.split("@")[0] : "Creative Strategist"}
                                    <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.2 rounded font-medium">LION</span>
                                  </h4>
                                  <p className="text-[10px] text-slate-400 line-clamp-1">Expert Copywriter | Driving 10x social conversions 🚀</p>
                                  <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <span>Just now</span>
                                    <span>•</span>
                                    <Globe className="w-2.5 h-2.5" />
                                  </p>
                                </div>
                              </div>
                              <button className="text-slate-400 hover:text-white">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Printed text */}
                            <div dir="auto" className="text-xs sm:text-sm leading-relaxed text-slate-100 whitespace-pre-wrap mb-4">
                              {result}
                            </div>

                            {/* LinkedIn Reactions bar */}
                            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3 text-[11px] text-slate-400 flex-wrap gap-2">
                              <div className="flex items-center gap-1">
                                <div className="flex -space-x-1 font-bold text-xs">
                                  <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center border border-slate-900 text-[10px]">👍</span>
                                  <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center border border-slate-900 text-[10px]">💡</span>
                                  <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center border border-slate-900 text-[10px]">❤️</span>
                                </div>
                                <span>312 interactions</span>
                              </div>
                              <div className="flex gap-2">
                                <span>32 comments</span>
                                <span>•</span>
                                <span>14 shares</span>
                              </div>
                            </div>

                            {/* Actions button strip */}
                            <div className="grid grid-cols-4 gap-0.5 text-slate-400 text-center">
                              <button className="hover:bg-white/5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 hover:text-blue-400 transition-colors">
                                <ThumbsUp className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Like</span>
                              </button>
                              <button className="hover:bg-white/5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 hover:text-green-400 transition-colors">
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Comment</span>
                              </button>
                              <button className="hover:bg-white/5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 hover:text-purple-400 transition-colors">
                                <Share2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Repost</span>
                              </button>
                              <button className="hover:bg-white/5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 hover:text-pink-400 transition-colors">
                                <Send className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Send</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // Twitter / X dark post card
                      if (lowerPlatform.includes("twitter") || lowerPlatform.includes("x")) {
                        return (
                          <div className="w-full max-w-[460px] bg-slate-950 border border-white/10 rounded-2xl p-5 text-white font-sans text-left shadow-xl">
                            {/* Header profile */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-full bg-purple-600 border border-white/10 flex items-center justify-center font-bold text-xs font-sans">
                                  {user?.email ? user.email.substring(0, 2).toUpperCase() : "ME"}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold flex items-center gap-1 text-slate-100">
                                    {user?.email ? user.email.split("@")[0] : "hookify.creator"}
                                    <BadgeCheck className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                                  </h4>
                                  <p className="text-[10px] text-slate-500">@{user?.email ? user.email.split("@")[0] : "hookify_cre"}</p>
                                </div>
                              </div>
                              <button className="text-slate-400">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Content */}
                            <div dir="auto" className="text-sm leading-relaxed text-slate-100 whitespace-pre-wrap mb-4">
                              {result}
                            </div>

                            {/* Info */}
                            <div className="text-[10px] text-slate-500 border-b border-white/5 pb-2.5 mb-2.5 flex gap-1.5 font-medium">
                              <span>3:14 PM</span>
                              <span>•</span>
                              <span>Jun 6, 2026</span>
                              <span>•</span>
                              <span className="text-purple-400 font-bold">42.2K Views</span>
                            </div>

                            {/* Stats */}
                            <div className="text-[10px] text-slate-400 border-b border-white/5 pb-2.5 mb-2.5 flex gap-3">
                              <span><strong>42</strong> Reposts</span>
                              <span><strong>230</strong> Likes</span>
                              <span><strong>15</strong> Bookmarks</span>
                            </div>

                            {/* Actions bar icons */}
                            <div className="flex items-center justify-between text-slate-500 max-w-xs px-2">
                              <button className="hover:text-blue-400"><MessageCircle className="w-4 h-4" /></button>
                              <button className="hover:text-green-400"><Share2 className="w-4 h-4" /></button>
                              <button className="hover:text-pink-500 text-pink-500/80"><Heart className="w-4 h-4 fill-pink-500/10" /></button>
                              <button className="hover:text-yellow-400"><BookmarkCheck className="w-4 h-4" /></button>
                            </div>
                          </div>
                        );
                      }

                      // Default Meta/Facebook
                      return (
                        <div className="w-full max-w-[460px] bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-white font-sans text-left shadow-md">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-xs">
                              {user?.email ? user.email.substring(0, 2).toUpperCase() : "ME"}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold leading-none mb-0.5">{user?.email ? user.email.split("@")[0] : "hookify_cre"}</h4>
                              <p className="text-[9px] text-slate-500">Sponsored • 🌐</p>
                            </div>
                          </div>
                          <div dir="auto" className="text-xs sm:text-sm leading-relaxed mb-4 text-slate-100 whitespace-pre-wrap">
                            {result}
                          </div>
                          <div className="border-t border-white/5 pt-2.5 flex justify-between text-[10px] text-slate-500 font-semibold">
                            <span>🚀 Optimized Platform Copy</span>
                            <span>Platform: {platform}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Multi-Dimensional AI Content Audit & Expected Engagement Gauge */}
                {!isGenerating && (() => {
                  const isAr = uiLanguage === "Arabic";
                  const audit = getRichAuditScores(result, platform, isAr);
                  
                  return (
                    <div className="space-y-6">
                      {/* Interactive Audit Bento Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 bg-slate-950/40 border border-white/10 rounded-2xl shadow-xl">
                        
                        {/* Column 1: Performance Prediction gauge */}
                        <div className="md:col-span-5 flex flex-col items-center justify-center text-center p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                          <span className="text-[11px] font-bold tracking-wider text-slate-400 block uppercase mb-3">
                            {isAr ? "نسبة التفاعل المتوقعة" : "Expected Engagement"}
                          </span>
                          
                          {/* Circular progress meter */}
                          <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                className="stroke-white/5" 
                                strokeWidth="8" 
                                fill="transparent" 
                              />
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                className="stroke-violet-500 transition-all duration-1000" 
                                strokeWidth="8" 
                                fill="transparent" 
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (251.2 * audit.overall) / 100}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-black text-slate-100 font-mono">{audit.overall}%</span>
                              <span className="text-[9px] text-amber-400 font-bold tracking-wide uppercase">
                                {audit.overall >= 80 ? (isAr ? "فيروسي جداً" : "Viral Choice") : (isAr ? "متوسط القوة" : "Good Stamina")}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-4">
                            {audit.explanation}
                          </p>
                        </div>
                        
                        {/* Column 2: Detailed Scores */}
                        <div className="md:col-span-7 space-y-4">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-white/5 pb-2">
                            <Target className="w-4 h-4 text-purple-400" />
                            <span>{isAr ? "تحليل جودة الهيكل والذكاء" : "AI Copywriting Audit Hub"}</span>
                          </h4>
                          
                          {/* 1. Hook Score */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold">
                              <span className="text-slate-300">{isAr ? "🪝 قوة السطر الأول (Hook)" : "Opening Hook Score"}</span>
                              <span className="text-purple-400 font-mono pr-1">{audit.hook}/100</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style={{ width: `${audit.hook}%` }} />
                            </div>
                          </div>

                          {/* 2. Clarity Score */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold">
                              <span className="text-slate-300">{isAr ? "📖 الوضوح وسهولة الفهم" : "Readability & Clarity"}</span>
                              <span className="text-teal-400 font-mono pr-1">{audit.clarity}/100</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${audit.clarity}%` }} />
                            </div>
                          </div>

                          {/* 3. CTA Score */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold">
                              <span className="text-slate-300">{isAr ? "🎯 كفاءة الدعوة للإجراء (CTA)" : "CTA Conversion Index"}</span>
                              <span className="text-pink-400 font-mono pr-1">{audit.cta}/100</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-pink-500 rounded-full" style={{ width: `${audit.cta}%` }} />
                            </div>
                          </div>

                          {/* 4. Engagement Prediction */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold">
                              <span className="text-slate-300">{isAr ? "💬 فرص حصد التعليقات والحفّظ" : "Expected Share & Saves"}</span>
                              <span className="text-sky-400 font-mono pr-1">{audit.engagement}/100</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-sky-400 rounded-full" style={{ width: `${audit.engagement}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content Calendar Scheduler inline card form */}
                      {isScheduling ? (
                        <div className="p-5 bg-gradient-to-br from-purple-900/10 via-slate-950/80 to-indigo-900/10 border border-purple-500/30 rounded-2xl space-y-4 animate-in slide-in-from-top duration-300">
                          <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg">📅</span>
                              <h4 className="font-bold text-sm text-slate-100">
                                {isAr ? "جدولة في تقويم المحتوى" : "Schedule to Content Calendar"}
                              </h4>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setIsScheduling(false)}
                              className="text-slate-400 hover:text-slate-200 text-xs font-bold"
                            >
                              {isAr ? "إلغاء التنفيذ" : "Cancel"}
                            </button>
                          </div>

                          {schedulingSuccess ? (
                            <div className="py-4 text-center space-y-2">
                              <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/35 rounded-full flex items-center justify-center mx-auto text-2xl">
                                🎉
                              </div>
                              <p className="text-sm font-bold text-emerald-400">
                                {isAr ? "تم إضافته إلى التقويم بنجاح!" : "Successfully scheduled to Calendar!"}
                              </p>
                              <p className="text-xs text-slate-400">
                                {isAr ? "يمكنك مراجعته وتحرير خطتك من شاشة تقويم المحتوى." : "View or rearrange your schedule inside Content Calendar."}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 block uppercase">
                                    {isAr ? "تاريخ النشر" : "Publish Date"}
                                  </label>
                                  <Input 
                                    type="date" 
                                    value={schedDate} 
                                    onChange={(e) => setSchedDate(e.target.value)}
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 block uppercase">
                                    {isAr ? "توقيت النشر" : "Publish Time"}
                                  </label>
                                  <Input 
                                    type="time" 
                                    value={schedTime} 
                                    onChange={(e) => setSchedTime(e.target.value)}
                                    className="h-9"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 block uppercase">
                                  {isAr ? "ربط بمشروع محدد (اختياري)" : "Select Project Folder (Optional)"}
                                </label>
                                <Select 
                                  value={schedProject} 
                                  onChange={(e) => setSchedProject(e.target.value)}
                                  className="h-9"
                                >
                                  <option value="">{isAr ? "بدون تحديد مشروع" : "None - General Folder"}</option>
                                  {projectsList.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </Select>
                              </div>

                              <Button
                                type="button"
                                variant="gradient"
                                className="w-full h-10 text-xs font-bold"
                                onClick={handleScheduleSubmit}
                              >
                                {isAr ? "📅 تأكيد إضافة البوست للتقويم" : "📅 Confirm Scheduling to Calendar"}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })()}




              </div>
            )}
          </div>

          {result && !isGenerating && (
            <div className="p-4 bg-white/5 border-t border-white/10 flex flex-col gap-4 flex-shrink-0">
              
              {/* Consolidated AI Refinement Console */}
              <div className="space-y-3 border-b border-white/5 pb-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block">
                    {uiLanguage === "Arabic" ? "🤖 لوحة تهذيب المحتوى والتحكم بالذكاء الاصطناعي" : "🤖 Consolidated AI Refinement Console"}
                  </span>
                  <p className="text-[11.5px] text-slate-400 leading-normal">
                    {uiLanguage === "Arabic" 
                      ? "اكتب أي تعديل ترغب به (مثال: أضف هاشتاجات إضافية، حوّل لأسلوب سرد قصصي، اختصر النص للنصف) أو اضغط على الفلاتر السريعة:" 
                      : "Type any custom instruction (e.g. Add hashtags, rewrite as a story, shorten by half) or choose from our optimized presets:"}
                  </p>
                </div>

                {/* Custom Instruction input form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!customInstruction.trim() || isGenerating) return;
                    handleRefinement(customInstruction.trim());
                    setCustomInstruction("");
                  }}
                  className="flex gap-2"
                >
                  <Input
                    type="text"
                    placeholder={uiLanguage === "Arabic" ? "مثال: أضف ٣ تعبيرات مرحة وإلغ الحشو تماماً..." : "e.g. Add 3 hashtags, make it funny, or translate into elegant Arabic..."}
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    disabled={isGenerating}
                    className="flex-1 bg-slate-900 border-white/10 text-xs text-slate-100 placeholder:text-slate-505 rounded-xl h-9"
                  />
                  <Button
                    type="submit"
                    variant="gradient"
                    size="sm"
                    disabled={isGenerating || !customInstruction.trim()}
                    className="px-4 text-xs font-bold shrink-0 rounded-xl h-9"
                  >
                    {uiLanguage === "Arabic" ? "تعديل بالذكاء الاصطناعي" : "Modify with AI"}
                  </Button>
                </form>

                {/* Unified Preset Modifiers */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    {
                      labelAr: "⚡ خطاف فيروسي",
                      labelEn: "⚡ Hot Hook Boost",
                      promptAr: "اجعل الخطاف أكثر حماسية وقوة وإثارة للفضول باللغة المختارة لجذب القارئ فورياً",
                      promptEn: "Make the opening hook 10x more jaw-dropping, curious, exciting, and attention-grabbing"
                    },
                    {
                      labelAr: "😂 طابع فكاهي ومرح",
                      labelEn: "😂 Add Humor",
                      promptAr: "قم بصياغة المقطع وإضافة لمسة كوميدية طريفة ومرحة تناسب طبيعة القراء والشعوب بذكاء",
                      promptEn: "Incorporate organic humor, light banter or funny storytelling tailored to the audience"
                    },
                    {
                      labelAr: "👔 طابع مهني فاخر",
                      labelEn: "👔 High End Elite",
                      promptAr: "اجعل الأسلوب فخم ومحترف ومناسب للعلامات التجارية والنبرة الأنيقة والشركات المرموقة",
                      promptEn: "Rewrite the copy to sound extremely premium, bespoke, elite, authoritative, and high-end"
                    },
                    {
                      labelAr: "🔄 تبسيط وتقصير",
                      labelEn: "🔄 Summarize Text",
                      promptAr: "قم بتبسيط الكلام واختصاره ليكون سريع ومريح ومباشر للقراءة السريعة دون حشو",
                      promptEn: "Shorten and streamline the post, keeping only highly impactful sentences and crucial bullet points"
                    },
                    {
                      labelAr: "💬 سؤال تفاعلي جذاب",
                      labelEn: "💬 Conversational CTA",
                      promptAr: "أضف سؤال تفاعلي مقنع وجاذب في نهاية البوست لتشجيع التعليقات والمشاركات ومشاركة الرأي",
                      promptEn: "Add a powerful interactive question or a highly compelling feedback trigger at the very end"
                    },
                    {
                      labelAr: "🇪🇬 لهجة مصرية مميزة",
                      labelEn: "🇪🇬 Egyptian Touch",
                      promptAr: "حوّل اللهجة بالكامل إلى العامية المصرية الأصيلة المحبوبة بذكاء وثقافة الشارع المصري",
                      promptEn: "Re-write this completely translating it into clean, engaging Egyptian Arabic dialect"
                    },
                    {
                      labelAr: "🇸🇦 لهجة سعودية بيضاء",
                      labelEn: "🇸🇦 Saudi Touch",
                      promptAr: "حوّل اللهجة بالكامل إلى اللهجة السعودية العامية والبيضاء الراقية اللطيفة والمقبولة لجميع الخليج",
                      promptEn: "Re-write this completely translating it into pristine White Saudi dialect"
                    }
                  ].map((preset, idx) => {
                    const label = uiLanguage === "Arabic" ? preset.labelAr : preset.labelEn;
                    const promptText = uiLanguage === "Arabic" ? preset.promptAr : preset.promptEn;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleRefinement(promptText)}
                        disabled={isGenerating}
                        className="py-1 px-2.5 bg-white/5 hover:bg-violet-600/25 text-slate-300 hover:text-white border border-white/10 hover:border-violet-500/30 text-[10px] font-semibold rounded-lg transition-all"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Core Execution Controls */}
              <div className="flex gap-4 w-full">
                <Button
                  className="flex-1 h-11 text-xs"
                  variant="outline"
                  onClick={() => setIsScheduling(true)}
                  disabled={isGenerating || isScheduling}
                >
                  📅 {uiLanguage === "Arabic" ? "إضافة المحتوى لجدول التقويم" : "Schedule to Calendar"}
                </Button>
                
                <Button
                  className="flex-1 h-11 text-xs"
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 rtl:mr-0 rtl:ml-1.5" /> 
                  {uiLanguage === "Arabic" ? "توليد جديد بالكامل" : "Regenerate Content"}
                </Button>
              </div>

              {/* AI Vocal Emotion & Diacritics Optimizer Ribbon */}
              <div id="ai_vocal_optimizer" className="p-4 rounded-xl bg-gradient-to-r from-purple-950/25 via-slate-950/90 to-indigo-950/25 border border-purple-500/20 shadow-md">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">✨</span>
                      <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                        {uiLanguage === "Arabic" ? "محسن الصوت والإلقاء الذكي بالتشكيل" : "AI Vocal Emotion & Diacritics Optimizer"}
                      </h4>
                      <span className="bg-purple-600/30 text-purple-400 text-[9px] font-mono px-2 py-0.5 rounded-full uppercase border border-purple-500/20">
                        Beta
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      {uiLanguage === "Arabic" 
                        ? "يقوم بتشكيل الكلمات تلقائيًا وضبط الوقف ومخارج الحروف وضبط نغمة وجرس ونبرة الصوت بالذكاء الاصطناعي لمطابقتها إنسانيًا" 
                        : "Adds proper word diacritics (tashkeel), inserts natural pauses, and aligns delivery emotion context for optimal flow."}
                    </p>
                  </div>

                  <button
                    id="btn_ai_vocal_enhance"
                    type="button"
                    onClick={handleAIEnhanceSpeech}
                    disabled={isEnhancingTTS}
                    className={cn(
                      "relative shrink-0 text-xs px-3.5 py-2 rounded-xl font-medium transition-all flex items-center gap-2 cursor-pointer",
                      isEnhancingTTS
                        ? "bg-purple-950/40 border border-purple-500/30 text-purple-300 pointer-events-none"
                        : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 border border-purple-500/30 active:scale-95"
                    )}
                  >
                    {isEnhancingTTS ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span>{uiLanguage === "Arabic" ? "جاري التشكيل والتحليل الصوتي..." : "Analyzing & Tuning..."}</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>{uiLanguage === "Arabic" ? "ضبط نغمة الإلقاء والتشكيل" : "Auto-Diacritize & Tune Delivery"}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Emotion, Pacing notes, and Speech guides */}
                {(pacingNotes || detectedEmotion) && (
                  <div id="ai_vocal_feedback" className="mt-3.5 pt-3.5 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider mb-1">
                        {uiLanguage === "Arabic" ? "النبرة الانفعالية المكتشفة:" : "AI Emotion Inflection:"}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold border",
                          detectedEmotion === "Excited" && "bg-amber-500/15 border-amber-500/30 text-amber-400",
                          detectedEmotion === "Dramatic" && "bg-red-500/15 border-red-500/30 text-red-400",
                          detectedEmotion === "Warm" && "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
                          detectedEmotion === "Professional" && "bg-sky-500/15 border-sky-500/30 text-sky-400"
                        )}>
                          {detectedEmotion === "Excited" && (uiLanguage === "Arabic" ? "🔥 حماسي ونشط" : "🔥 Excited Delivery")}
                          {detectedEmotion === "Dramatic" && (uiLanguage === "Arabic" ? "🎬 درامي ومثير" : "🎬 Dramatic / Suspenseful")}
                          {detectedEmotion === "Warm" && (uiLanguage === "Arabic" ? "🌸 دافئ وقصصي" : "🌸 Warm & Sincere Storytelling")}
                          {detectedEmotion === "Professional" && (uiLanguage === "Arabic" ? "💼 احترافي هادئ" : "💼 Professional & Informative")}
                        </span>
                      </div>
                    </div>

                    {pacingNotes && (
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider mb-1">
                          {uiLanguage === "Arabic" ? "توجيهات الإلقاء الصوتي:" : "Vocal Director's Guidance:"}
                        </div>
                        <p className="text-[11px] text-slate-300 italic leading-relaxed">
                          "{pacingNotes}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Free Vocal Narrator Player Bar */}
              <div id="vocal_player_bar" className="p-4 rounded-xl bg-gradient-to-r from-purple-950/25 via-slate-950/90 to-indigo-950/25 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    id="btn_narrator_speak"
                    type="button"
                    onClick={handleSpeak}
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0",
                      isPlayingSpeech 
                        ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse hover:bg-red-500/30"
                        : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 active:scale-95"
                    )}
                    title={isPlayingSpeech ? "Stop" : "Listen Out Loud"}
                  >
                    {isPlayingSpeech ? (
                      <div className="flex gap-1 items-center justify-center">
                        <span className="w-1 h-3.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                        <span className="w-1 h-3.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        <span className="w-1 h-3.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                      </div>
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>🎙️</span>
                      <span>{uiLanguage === "Arabic" ? "استمع للإلقاء الصوتي المطور" : "Advanced Audio Narrator"}</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {uiLanguage === "Arabic" ? "استمع لجرس ونغمة النبرة الانفعالية الحالية لتوقيت الإلقاء الصوتي الطبيعي" : "Hear written rhythm with native dial-accents & emotional speech speeds"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap w-full md:w-auto justify-end">
                  {(() => {
                    return (
                      <div className="flex flex-col gap-0.5 w-full sm:w-auto">
                        <span className="text-[9px] text-purple-400 font-bold uppercase block mb-0.5">
                          {uiLanguage === "Arabic" ? "اللغة واللهجة المستهدفة:" : "Target Language & Dialect:"}
                        </span>
                        <select
                          id="select_target_dialect"
                          value={selectedDialectCode}
                          onChange={(e) => {
                            const code = e.target.value;
                            setSelectedDialectCode(code);
                            const matched = availableVoices.find(v => 
                              v.lang.toLowerCase() === code.toLowerCase() ||
                              v.lang.toLowerCase().replace('_', '-').startsWith(code.toLowerCase())
                            );
                            if (matched) {
                              setSelectedVoiceName(matched.name);
                            }
                          }}
                          className="text-[11px] bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-300 w-full sm:min-w-[180px] focus:outline-none focus:border-purple-500 font-sans"
                          disabled={isPlayingSpeech}
                        >
                          <optgroup label={uiLanguage === "Arabic" ? "العربية (اللهجات المدعومة)" : "Arabic (Supported Dialects)"}>
                            {arabicDialects.map((dialect) => (
                              <option key={dialect.code} value={dialect.code}>
                                {uiLanguage === "Arabic" ? dialect.label : dialect.labelEn}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label={uiLanguage === "Arabic" ? "الإنجليزية" : "English"}>
                            {englishDialects.map((dialect) => (
                              <option key={dialect.code} value={dialect.code}>
                                {uiLanguage === "Arabic" ? dialect.label : dialect.labelEn}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    );
                  })()}

                  <div className="flex flex-col gap-0.5 w-full sm:w-auto">
                    {uiLanguage === "Arabic" && <span className="text-[9px] text-purple-400 font-bold uppercase block mb-0.5">صوت المتصفح:</span>}
                    <select
                      id="select_browser_voice"
                      value={selectedVoiceName}
                      onChange={(e) => setSelectedVoiceName(e.target.value)}
                      className="text-[11px] bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-300 w-full sm:min-w-[150px] focus:outline-none focus:border-purple-500"
                      disabled={isPlayingSpeech}
                    >
                      {availableVoices.length === 0 ? (
                        <option>{uiLanguage === "Arabic" ? "جاري تحميل الأصوات..." : "Loading system voice..."}</option>
                      ) : (
                        availableVoices.map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{uiLanguage === "Arabic" ? "سرعة الإرسال" : "Pacing"}</span>
                    <input
                      id="slider_vocal_pacing"
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="w-16 accent-purple-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                      disabled={isPlayingSpeech}
                    />
                    <span className="text-[10px] text-slate-300 font-mono w-6">{speechRate}x</span>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
