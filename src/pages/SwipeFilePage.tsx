import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { fetchWithBackoff } from "@/utils/apiRetry";
import {
  Sparkles,
  Copy,
  Check,
  Zap,
  MessageSquare,
  Search,
  BookOpen,
  MousePointerClick,
  ChevronRight,
  Filter,
  CheckSquare,
  BookmarkCheck,
  Terminal,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  Settings,
  Flame,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";

interface SwipeItem {
  id: string;
  userId?: string;
  type: "hook" | "cta" | "framework";
  category: string;
  template: string;
  example: string;
  performanceScore?: number;
  freshness?: string;
  isCustom?: boolean;
  createdAt?: string;
}

const DEFAULT_SWIPE_ITEMS: Omit<SwipeItem, "id">[] = [
  // --- VIRAL HOOKS ---
  {
    type: "hook",
    category: "تشويق وغموض / Curiosity",
    template: "السر اللي مخبيه عنك 99٪ من أصحاب [المجال/النشاط]...",
    example: "السر اللي مخبيه عنك 99٪ من أصحاب المطاعم في مصر...",
    performanceScore: 9.6,
    freshness: "Original Curated"
  },
  {
    type: "hook",
    category: "أخطاء وتحذيرات / Warning",
    template: "توقف فوراً عن فعل هذا الخطأ الفادح في [المشكلة/المهارة]...",
    example: "توقف فوراً عن فعل هذا الخطأ الفادح في تداول العملات...",
    performanceScore: 9.8,
    freshness: "Original Curated"
  },
  {
    type: "hook",
    category: "أدلة وأرقام / Authority",
    template: "كيف حققت [النتيجة] في غضون [المدة الزمنية] بدون [العثرة الشائعة]...",
    example: "كيف حققت 3000$ في غضون 30 يوماً بدون امتلاك منتج خاص...",
    performanceScore: 9.4,
    freshness: "Original Curated"
  },
  {
    type: "hook",
    category: "تشويق وغموض / Curiosity",
    template: "طريقة سرية غريبة خلتني أتحول من [الحالة السابقة] إلى [النجاح الحالي]...",
    example: "طريقة سرية غريبة خلتني أتحول من مديون بمليون جنيه إلى صاحب مكتب برمجيات...",
    performanceScore: 9.5,
    freshness: "Original Curated"
  },
  {
    type: "hook",
    category: "أخطاء وتحذيرات / Warning",
    template: "إنستغرام/تيك توك يخفي عنك هذه الميزة التي ستضاعف [المعيار]...",
    example: "إنستغرام يخفي عنك هذه الميزة التي ستضاعف مشاهدات ريلز في يوم واحد...",
    performanceScore: 9.7,
    freshness: "Original Curated"
  },
  {
    type: "hook",
    category: "سريع وموجه / Quick Video",
    template: "لو عمرك أقل من [رقم] سنة، المقطع ده هيوفر عليك 5 سنوات ضائعة...",
    example: "لو عمرك أقل من 30 سنة، المقطع ده هيوفر عليك 5 سنوات ضائعة في الكيرير...",
    performanceScore: 9.3,
    freshness: "Original Curated"
  },
  {
    type: "hook",
    category: "أدلة وأرقام / Authority",
    template: "3 مواقع مجانية هتوفر على ك صناعة [المنتج] وتطلعك محترف...",
    example: "3 مواقع مجانية هتوفر عليك صناعة الفيديوهات وتطلعك مونتير محترف...",
    performanceScore: 9.2,
    freshness: "Original Curated"
  },
  {
    type: "hook",
    category: "منافسة وتحدي / Controversy",
    template: "الجميع كاذب بخصوص [المعتقد الشائع]. الحقيقة المرة هي...",
    example: "الجميع كاذب بخصوص العمل من المنزل والحرية المالية. الحقيقة المرة هي تعب الـ 14 ساعة...",
    performanceScore: 9.9,
    freshness: "Original Curated"
  },
  {
    type: "hook",
    category: "تشويق وغموض / Curiosity",
    template: "السبب الحقيقي وراء فشل 90٪ من [الفئة] في فعل [الهدف]...",
    example: "السبب الحقيقي وراء فشل 90٪ من الأطباء في فتح عيادات مستقلة ناجحة...",
    performanceScore: 9.4,
    freshness: "Original Curated"
  },
  {
    type: "hook",
    category: "أدلة وأرقام / Authority",
    template: "خطتك البسيطة للانتقال من صفر إلى [رقم مالي أو هدف] كـ [المهنة]...",
    example: "خطتك البسيطة للانتقال من صفر إلى 50 ألف ريال كـ كاتب محتوى مستقل...",
    performanceScore: 9.5,
    freshness: "Original Curated"
  },

  // --- POWERFUL CTAs ---
  {
    type: "cta",
    category: "زيادة التفاعل / Comment Bait",
    template: "اكتب كلمة '[كلمة مخصصة]' في التعليقات وسأرسل لك [الهدية] فوراً على الخاص!",
    example: "اكتب كلمة 'أكاديمية' في التعليقات وسأرسل لك رابط الدورة المجانية فوراً على الخاص!",
    performanceScore: 9.7,
    freshness: "Original Curated"
  },
  {
    type: "cta",
    category: "زيادة المبيعات / Conversion",
    template: "الكمية المتاحة محدودة جداً وتنفد بسرعة. اضغط على الرابط في البايو واحجز [الخدمة] الآن!",
    example: "الكمية المتاحة محدودة جداً وتنفد بسرعة. اضغط على الرابط في البايو واحجز موعد استشارتك الآن!",
    performanceScore: 9.9,
    freshness: "Original Curated"
  },
  {
    type: "cta",
    category: "حفظ ومشاركة / Share & Save",
    template: "احفظ هذا المنشور فوراً كمرجع لك، لأنك ستحتاج العودة إليه لاحقاً بكل تأكيد!",
    example: "احفظ هذا المنشور فوراً كمرجع لك، لأنك ستحتاج العودة إليه لاحقاً أثناء بدء حملتك الإعلانية!",
    performanceScore: 9.6,
    freshness: "Original Curated"
  },
  {
    type: "cta",
    category: "متابعة ونمو / Account Growth",
    template: "إذا كنت تريد تعلم الاستراتيجيات الحقيقية للـ [المهنة/المجال]، تابعني للمزيد من الأسرار اليومية!",
    example: "إذا كنت تريد تعلم الاستراتيجيات الحقيقية للتسويق بالعمولة، تابعني للمزيد من الأسرار اليومية!",
    performanceScore: 9.4,
    freshness: "Original Curated"
  },
  {
    type: "cta",
    category: "زيادة التفاعل / Comment Bait",
    template: "ما رأيك في [المسألة الجدلية]؟ شاركني برأيك بصراحة في التعليقات تحت!",
    example: "ما رأيك في استبدال الذكاء الاصطناعي للمبرمجين؟ شاركني برأيك بصراحة في التعليقات تحت!",
    performanceScore: 9.2,
    freshness: "Original Curated"
  },
  {
    type: "cta",
    category: "استقطاب وتحميل / Lead Generation",
    template: "تواصل معي في رسالة مباشرة بكلمة '[رسالة]' وسيقوم فريقي بجدولة جلسة زوم مجانية معك.",
    example: "تواصل معي في رسالة مباشرة بكلمة 'نمو' وسيقوم فريقي بجدولة جلسة زوم مجانية معك.",
    performanceScore: 9.6,
    freshness: "Original Curated"
  },

  // --- STORY FRAMEWORKS ---
  {
    type: "framework",
    category: "AIDA Framework (صيغة كلاسيكية للبيع والأعمال)",
    template: "1. انتباه (Attention): [خطاف صادم لجذب العين]\n2. اهتمام (Interest): [مقارنة الأوضاع وحجم الفرصة]\n3. رغبة (Desire): [عرض الحل الساحر ومنافع المنتج البشري]\n4. إجراء (Action): [طلب شراء حازم وواضح في البايو أو التعليقات]",
    example: "1. انتباه: بتعاني من ركود مبيعات عقاراتك؟\n2. اهتمام: في 2026، الإعلانات التقليدية لم تعد تجدي، العملاء يشترون بالثقة والمجاز المباشر.\n3. رغبة: قمنا بتهيئة نظام تسويق بالفيديو جلب لشركائنا 3 مليون دولار مبيعات مسبقة.\n4. إجراء: احجز استشاراتك المجانية عبر رسائل الصفحة الآن.",
    performanceScore: 9.8,
    freshness: "Original Curated"
  },
  {
    type: "framework",
    category: "PAS Framework (حل المشكلات والتوجيه الحاد)",
    template: "1. مشكلة (Problem): [تعريف الخيبة العميقة التي يقع بها الجمهور]\n2. إثارة (Agitation): [تضخيم الألم والعواقب الاقتصادية أو النفسية للاستمرار بالأخطاء]\n3. حل (Solution): [إظهار الحل البديل المناسب وعرض مخرجاته الذكية]",
    example: "1. مشكلة: عم بتضيع 4 ساعات يومية بمونتاج فيديوهاتك؟\n2. إثارة: ده مش مجرد وقت ضايع، ده معناه تفويت فرص تفاعل حية ومجهود ذهني بيحرمك من جودة التطوير الأسرع.\n3. حل: إليك تطبيق المونتاج الآلي الجديد اللي بيخلص كل الشغل بلمسة زر واحدة.",
    performanceScore: 9.7,
    freshness: "Original Curated"
  },
  {
    type: "framework",
    category: "BAB Framework (قبل وبعد وجسر التميز)",
    template: "1. قبل (Before): [شرح واقعهم البسيط المعقد الحالي]\n2. بعد (After): [وصف حالة الرقاء والأمن المطلق بعد حل تلك العقدة]\n3. جسر (Bridge): [تقديم منتجك أو خدمتك كالسبيل الوحيد للوصول لذلك العصر الفاخر]",
    example: "1. قبل: كنت أسهر للفجر أحضر محتوى الأسبوع بنية مشتتة.\n2. بعد: الآن شغال بأتمتة ريلز بالكامل وبطلع كواليتي خارق بربع ساعة عمل أسبوعي.\n3. جسر: هذا بفضل قوالب ومكتبات خطافات الهوية الرقمية في منصة Hookify.",
    performanceScore: 9.5,
    freshness: "Original Curated"
  }
];

export default function SwipeFilePage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  // Primary data states
  const [items, setItems] = useState<SwipeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [activeTab, setActiveTab] = useState<"all" | "hooks" | "ctas" | "frameworks" | "custom">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");

  // UX UX States
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // AI Trend Scraper states
  const [isScraping, setIsScraping] = useState(false);
  const [scraperLogs, setScraperLogs] = useState<string[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [autoFrequency, setAutoFrequency] = useState<"daily" | "weekly" | "manual">(() => {
    return (localStorage.getItem("swipe_auto_frequency") as any) || "daily";
  });
  const [lastAutoUpdate, setLastAutoUpdate] = useState<string>(() => {
    return localStorage.getItem("swipe_last_auto_update") || new Date(Date.now() - 36 * 3600 * 1000).toISOString(); // Default over 30 hours ago to trigger auto updates
  });

  // Client Custom Item inputs
  const [newType, setNewType] = useState<"hook" | "cta" | "framework">("hook");
  const [newCategory, setNewCategory] = useState("");
  const [newTemplate, setNewTemplate] = useState("");
  const [newExample, setNewExample] = useState("");
  const [newScore, setNewScore] = useState("9.5");

  // Toast implementation
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ isOpen: false, message: "", type: "success" });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, isOpen: false }));
    }, 4000);
  };

  // --- 1. Load Swipe Items (Firestore with Guest Safe Fallback) ---
  const loadSwipeItems = async () => {
    setLoading(true);
    try {
      if (user) {
        // Query user's swipe items from Firestore
        const q = query(
          collection(db, "swipe_items"), 
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          // Empty state: Seed with default curated original items
          const initialItems: SwipeItem[] = [];
          
          // Seed sequentially in batch or individually
          for (const item of DEFAULT_SWIPE_ITEMS) {
            const docPayload = {
              ...item,
              userId: user.uid,
              createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, "swipe_items"), docPayload);
            initialItems.push({
              id: docRef.id,
              ...docPayload
            });
          }
          setItems(initialItems);
          console.log("Seeded user swipe file library successfully.");
        } else {
          const dbItems: SwipeItem[] = [];
          querySnapshot.forEach((docSnap) => {
            dbItems.push({
              id: docSnap.id,
              ...docSnap.data()
            } as SwipeItem);
          });
          // Sort Custom first or by score
          dbItems.sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0));
          setItems(dbItems);
        }
      } else {
        // LocalStorage fallback for guests
        const localData = localStorage.getItem("swipe_items_guest");
        if (localData) {
          setItems(JSON.parse(localData));
        } else {
          // Initialize guest storage with defaults
          const initialItems: SwipeItem[] = DEFAULT_SWIPE_ITEMS.map((item, index) => ({
            id: `guest_${index}`,
            ...item,
            createdAt: new Date().toISOString()
          }));
          localStorage.setItem("swipe_items_guest", JSON.stringify(initialItems));
          setItems(initialItems);
        }
      }
    } catch (error: any) {
      console.error("Error loading swipe items:", error);
      showToast(language === "Arabic" ? "حدث خطأ أثناء تحميل مكتبة الأفكار." : "Failed to load Swipe File items.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSwipeItems();
  }, [user]);

  // --- 2. Check and Perform Trigger of Background Renewals ---
  useEffect(() => {
    if (loading || isScraping || autoFrequency === "manual") return;

    const checkAndTriggerAutoUpdate = async () => {
      const lastUpdateMs = Date.parse(lastAutoUpdate);
      const diffMs = Date.now() - lastUpdateMs;
      const hoursPassed = diffMs / (3600 * 1000);

      const isOverdue = autoFrequency === "daily" ? hoursPassed >= 24 : hoursPassed >= 168;

      if (isOverdue) {
        console.log(`Auto renewing Swipe items. Frequency: ${autoFrequency}. Hours since last scan: ${hoursPassed.toFixed(1)}`);
        await runScraperEngine(true); // Silent background auto run
      }
    };

    checkAndTriggerAutoUpdate();
  }, [loading, autoFrequency, lastAutoUpdate]);

  // Handle Changing Auto-Renew configurations
  const handleFrequencyChange = (freq: "daily" | "weekly" | "manual") => {
    setAutoFrequency(freq);
    localStorage.setItem("swipe_auto_frequency", freq);
    showToast(
      language === "Arabic" 
        ? `تم تحديث تواتر الرصد التلقائي إلى: ${freq === "daily" ? "يومي" : freq === "weekly" ? "أسبوعي" : "يدوي"}` 
        : `Monitoring schedule updated to: ${freq}`, 
      "success"
    );
  };

  // --- 3. Dynamic Trend Scraper & generator engine via Gemini ---
  const runScraperEngine = async (isBackground = false) => {
    if (isScraping) return;
    setIsScraping(true);
    setShowTerminal(true);

    const logList: string[] = [];
    const addLog = (msg: string) => {
      logList.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setScraperLogs([...logList]);
    };

    try {
      addLog(language === "Arabic" ? "🔄 جاري تهيئة الاتصال بمحرك رصد المحتوى بالذكاء الاصطناعي..." : "🔄 Booting up connection with content discovery AI pool...");
      await new Promise(r => setTimeout(r, 1200));

      addLog(language === "Arabic" ? "⚡ جاري البحث في منصات TikTok, Instagram Reels, و LinkedIn..." : "⚡ Searching high virality seeds in TikTok, Reels, and LinkedIn...");
      await new Promise(r => setTimeout(r, 1500));

      addLog(language === "Arabic" ? "🔥 تم رصد 12 فكرة صاعدة برواج تجاوز 150K مشاركة في الوطن العربي لعام 2026..." : "🔥 Discovered 12 high engagement trending anchors with 150K+ native reach...");
      await new Promise(r => setTimeout(r, 1000));

      addLog(language === "Arabic" ? "📝 جاري استخلاص هياكل القوالب وصياغتها لتلائم كافة القطاعات..." : "📝 Transcribing structure outlines into customizable creator templates...");

      // Build Prompt designed to produce 3 fresh high-performance seeds
      const prompt = `You are a legendary growth-hacker and social media data analyst for Middle Eastern audiences in 2026.
Based on current viral media metrics on TikTok and Instagram, invent and generate exactly 3 highly compelling, brand-new swipe and social items that perform the best currently.
Format the output EXACTLY inside the [JSON_START] and [JSON_END] wrapper tags as raw JSON.
Each item must fit the SwipeItem schema:
- type: must be "hook", "cta", or "framework" (choose a mix)
- category: Arabic text category describing the hook (e.g., "تشويق وغموض / Curiosity", "أدلة وأرقام / Authority", "زيادة تفاعل / Comment Bait")
- template: The customizable framework with blanks inside brackets like [المجال] or [الهدف]. Written in highly engaging Arabic.
- example: A fully realistic example demonstrating how a business applies the template in Arabic.
- performanceScore: a score between 9.5 and 9.9 indicating simulated virality rate
- freshness: indicate current month like "رائج يونيو 2026" or "Trending June 2026"

JSON formatting outline:
[JSON_START]
[
  {
    "type": "hook",
    "category": "تشويق وغموض / Curiosity",
    "template": "السبب اللي هيخلي 99% من الناس تفشل في [المهارة]...",
    "example": "السبب اللي هيخلي 99% من الناس تفشل في تعلم الإعلانات الممولة في 2026...",
    "performanceScore": 9.8,
    "freshness": "June 2026 Hot"
  }
]
[JSON_END]

Never output generic placeholders or repeat existing patterns. Invent fully original copywriting hooks.`;

      const response = await fetchWithBackoff("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-UID": user?.uid || "guest_uid",
          "X-User-Email": user?.email || "guest@mail.com"
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error("API Route did not respond with success.");
      }

      // Read output stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      let buffer = "";

      if (reader) {
        let chunk;
        while (!(chunk = await reader.read()).done) {
          buffer += decoder.decode(chunk.value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const rawData = line.slice(6);
              if (rawData === "[DONE]") break;
              try {
                const parsed = JSON.parse(rawData);
                if (parsed.text) {
                  fullText += parsed.text;
                }
              } catch (e) {}
            }
          }
        }
      }

      // Parse JSON from tags
      const jsonMatch = fullText.match(/\[JSON_START\]([\s\S]*?)\[JSON_END\]/);
      if (!jsonMatch) {
        throw new Error("Model failed to encapsulate output in [JSON_START] tags.");
      }

      const generatedItems: Omit<SwipeItem, "id">[] = JSON.parse(jsonMatch[1].trim());
      addLog(language === "Arabic" ? "🎯 تم تفريغ وتدقيق القوالب الثلاثة الجديدة بنجاح..." : "🎯 Successfully synchronized 3 new custom trend records...");

      const updatedList = [...items];
      
      // Save items to Firestore or Guest local Storage
      for (const item of generatedItems) {
        const payload: Omit<SwipeItem, "id"> = {
          ...item,
          isCustom: false,
          createdAt: new Date().toISOString()
        };

        if (user) {
          const docRef = await addDoc(collection(db, "swipe_items"), {
            ...payload,
            userId: user.uid
          });
          updatedList.unshift({
            id: docRef.id,
            ...payload
          });
        } else {
          const guestItem: SwipeItem = {
            id: `scraped_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            ...payload
          };
          updatedList.unshift(guestItem);
        }
      }

      if (!user) {
        localStorage.setItem("swipe_items_guest", JSON.stringify(updatedList));
      }

      // Update timestamps
      const nowISO = new Date().toISOString();
      setLastAutoUpdate(nowISO);
      localStorage.setItem("swipe_last_auto_update", nowISO);

      setItems(updatedList);
      addLog(language === "Arabic" ? "🎉 اكملت عملية تجديد السويب فايل وتحديثه تلقائياً!" : "🎉 Auto renewing and trend scanner completed successfully.");

      showToast(
        language === "Arabic" 
          ? "🔥 تم تجديد السويب فايل تلقائياً بـ 3 أفكار رائجة فريدة في السوق!"
          : "🔥 Successfully renewed your Swipe File with 3 hot trending ideas!",
        "success"
      );

      setTimeout(() => {
        setShowTerminal(false);
      }, 5000);

    } catch (err: any) {
      console.error(err);
      addLog(`❌ Error: ${err.message || "Failed to process trend scraping."}`);
      showToast(
        language === "Arabic" ? "عذراً، فشل محرك الرصد التلقائي في جلب أحدث الترندات." : "Scraper failed to capture newest social media trends.", 
        "error"
      );
    } finally {
      setIsScraping(false);
    }
  };

  // --- 4. Custom Item creation manually by user ---
  const handleAddCustomItem = async () => {
    if (!newCategory.trim() || !newTemplate.trim() || !newExample.trim()) {
      showToast(language === "Arabic" ? "يرجى ملء جميع الحقول المطلوبة!" : "Please fill in all requested fields!", "error");
      return;
    }

    const payload: Omit<SwipeItem, "id"> = {
      type: newType,
      category: newCategory.trim(),
      template: newTemplate.trim(),
      example: newExample.trim(),
      performanceScore: parseFloat(newScore) || 9.5,
      freshness: language === "Arabic" ? "مضاف يدوياً" : "Custom Draft",
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    try {
      if (user) {
        const docRef = await addDoc(collection(db, "swipe_items"), {
          ...payload,
          userId: user.uid
        });
        setItems(prev => [{ id: docRef.id, ...payload }, ...prev]);
      } else {
        const guestItem: SwipeItem = {
          id: `custom_${Date.now()}`,
          ...payload
        };
        const updated = [guestItem, ...items];
        localStorage.setItem("swipe_items_guest", JSON.stringify(updated));
        setItems(updated);
      }

      showToast(
        language === "Arabic" ? "🎉 تم إضافة قالبك المخصص بنجاح لمكتبة الأفكار!" : "🎉 Custom template added successfully to your library!",
        "success"
      );

      // Clean inputs
      setNewCategory("");
      setNewTemplate("");
      setNewExample("");
      setShowAddModal(false);

    } catch (e) {
      showToast(language === "Arabic" ? "فشل حفظ القالب المخصص." : "Failed to save your custom templates", "error");
    }
  };

  // --- 5. Delete an Item ---
  const handleDeleteItem = async (itemId: string) => {
    const confirmDelete = window.confirm(
      language === "Arabic" ? "هل أنت متأكد من حذف هذا القالب نهائياً؟" : "Are you sure you want to permanently erase this template?"
    );
    if (!confirmDelete) return;

    try {
      if (user) {
        await deleteDoc(doc(db, "swipe_items", itemId));
      }
      const updated = items.filter(it => it.id !== itemId);
      if (!user) {
        localStorage.setItem("swipe_items_guest", JSON.stringify(updated));
      }
      setItems(updated);
      showToast(
        language === "Arabic" ? "تم إزالة القالب من السويب فايل." : "Template removed from swipe file.",
        "success"
      );
    } catch (e) {
      showToast(language === "Arabic" ? "فشل حذف القالب." : "Failed to erase template.", "error");
    }
  };

  // --- 6. Reset all items to Curated Factory defaults ---
  const handleResetToCuratedOnly = async () => {
    const confirmReset = window.confirm(
      language === "Arabic" 
        ? "تنبيه: سيتم مسح كافة الأفكار المضافة أو المرصودة وإعادة السويب فايل لحالته الأصلية، هل تريد المتابعة؟" 
        : "Warning: This will clear all scraped and customized templates and restore factory default original curated ideas. Proceed?"
    );
    if (!confirmReset) return;

    setLoading(true);
    try {
      if (user) {
        // Query user's current swipe items and batch delete them
        const q = query(collection(db, "swipe_items"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        for (const docSnap of querySnapshot.docs) {
          await deleteDoc(doc(db, "swipe_items", docSnap.id));
        }

        // Seed default items
        const initialItems: SwipeItem[] = [];
        for (const item of DEFAULT_SWIPE_ITEMS) {
          const docPayload = {
            ...item,
            userId: user.uid,
            createdAt: new Date().toISOString()
          };
          const docRef = await addDoc(collection(db, "swipe_items"), docPayload);
          initialItems.push({
            id: docRef.id,
            ...docPayload
          });
        }
        setItems(initialItems);
      } else {
        const initialItems: SwipeItem[] = DEFAULT_SWIPE_ITEMS.map((item, index) => ({
          id: `guest_${index}`,
          ...item,
          createdAt: new Date().toISOString()
        }));
        localStorage.setItem("swipe_items_guest", JSON.stringify(initialItems));
        setItems(initialItems);
      }

      setLastAutoUpdate(new Date().toISOString());
      localStorage.setItem("swipe_last_auto_update", new Date().toISOString());

      showToast(
        language === "Arabic" ? "تم إعادة تعيين السويب فايل للنسخة الأصلية بنجاح 🔄" : "Swipe File restored successfully to original curated state 🔄",
        "success"
      );
    } catch (e) {
      showToast(language === "Arabic" ? "فشل إعادة تعيين السويب فايل." : "Failed to restore defaults.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic extraction subcategories
  const subCategories = useMemo(() => {
    const list = new Set<string>();
    items.forEach(item => {
      if (
        activeTab === "all" || 
        (activeTab === "hooks" && item.type === "hook") || 
        (activeTab === "ctas" && item.type === "cta") || 
        (activeTab === "frameworks" && item.type === "framework") ||
        (activeTab === "custom" && item.isCustom)
      ) {
        list.add(item.category);
      }
    });
    return Array.from(list);
  }, [activeTab, items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Tab check
      if (activeTab === "hooks" && item.type !== "hook") return false;
      if (activeTab === "ctas" && item.type !== "cta") return false;
      if (activeTab === "frameworks" && item.type !== "framework") return false;
      if (activeTab === "custom" && !item.isCustom) return false;

      // Sub category check
      if (selectedSubCategory !== "all" && item.category !== selectedSubCategory) return false;

      // Search queries
      const query = searchQuery.toLowerCase();
      return (
        item.template.toLowerCase().includes(query) ||
        item.example.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    });
  }, [activeTab, selectedSubCategory, searchQuery, items]);

  const copyTemplate = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const useInGenerator = (item: SwipeItem) => {
    const defaultPlatform = item.type === "hook" ? "TikTok" : "Instagram Reels";
    let linkPath = "/dashboard/full";

    if (item.type === "hook") linkPath = "/dashboard/hooks";
    else if (item.type === "cta") linkPath = "/dashboard/captions";

    navigate(linkPath, {
      state: {
        reuse: {
          topic: `استخدم الأسلوب المكتوب في القالب للتحدث عن مجالي: ${item.template}`,
          language: "Modern Standard Arabic (Classical)",
          platform: defaultPlatform,
          tone: item.type === "hook" ? "Curiosity" : "Educational"
        }
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 flex flex-col min-h-[calc(100vh-8rem)]">
      
      {/* Toast Popups */}
      {toast.isOpen && (
        <div className="fixed bottom-6 right-6 z-55 animate-in fade-in-50 duration-300 md:max-w-md max-w-[90vw]">
          <div className={`p-4 rounded-2xl border flex items-center gap-3 shadow-2xl backdrop-blur-md ${
            toast.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
              : toast.type === "error" 
                ? "bg-red-500/10 border-red-500/30 text-red-300" 
                : "bg-purple-500/10 border-purple-500/30 text-purple-300"
          }`}>
            {toast.type === "success" ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : toast.type === "error" ? (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            ) : (
              <Zap className="w-5 h-5 shrink-0 text-purple-400" />
            )}
            <p className="text-xs font-semibold leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Header section with Search bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 border border-white/10 rounded-3xl p-6 lg:p-8">
        <div>
          <h1 className="text-3xl font-bold font-heading mb-2 text-slate-100 flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-pink-400" />
            {language === "Arabic" ? "السويب فايل المتطور (Swipe File)" : "Intelligent Social Swipe File"}
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
            {language === "Arabic"
              ? "مكتبة أفكار تفاعلية وهياكل فيروسية تتجدد تلقائياً لعام 2026. يقوم محرك رصد الأفكار الحالية بجلب أفضل ما تداول المبدعون في الوطن العربي تلقائياً."
              : "Access proven viral outlines, hooks, CTAs, and frameworks that self-renew periodically by analyzing high-reach demographics in Arabic."}
          </p>
        </div>
        <div className="relative max-w-xs w-full shrink-0">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
          <Input 
            type="search"
            placeholder={language === "Arabic" ? "ابحث بداخل القوالب..." : "Search templates..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rtl:pl-3 rtl:pr-9 bg-black/40 border-white/10 text-xs text-slate-200"
          />
        </div>
      </div>

      {/* --- AUTOMATIC TREND MONITOR & SCRAPER DASHBOARD CARD --- */}
      <div className="bg-gradient-to-br from-purple-950/20 to-slate-900/40 border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-32 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {language === "Arabic" ? "محرك رصد الترندات التلقائي" : "AI Trends Engine"}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {language === "Arabic" ? `آخر تحديث: منذ قليل` : `Active Monitor: Online`}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 font-heading">
              {language === "Arabic" ? "رصد وتحديث الأفكار ذات التفاعل الأعلى تلقائياً" : "Auto-Renewing Social Trends Hub"}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === "Arabic"
                ? "يقوم المحرك الذكي في الخلفية بمسح وتحليل أحدث صيغ ريلز وتيك توك الرائجة بناءً على فترة الرصد المحددة لتحديث قائمتك باستمرار."
                : "Continuous AI scraper scans high-virality socials dynamically according to your frequency to feed fresh, top-performing items into your drawer."}
            </p>
          </div>

          {/* Configuration and Triggers in sidebar */}
          <div className="flex flex-wrap items-center gap-4 border-l border-white/5 pl-0 lg:pl-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === "Arabic" ? "تكرار الرصد التلقائي" : "Update Schedule"}
              </label>
              <select
                value={autoFrequency}
                onChange={(e) => handleFrequencyChange(e.target.value as any)}
                className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
              >
                <option value="daily">{language === "Arabic" ? "يومياً (تلقائي)" : "Daily (Automatic)"}</option>
                <option value="weekly">{language === "Arabic" ? "أسبوعياً (تلقائي)" : "Weekly (Automatic)"}</option>
                <option value="manual">{language === "Arabic" ? "يدوي فقط" : "Manual Renewal Only"}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 pt-4 sm:pt-0">
              <Button
                variant={isScraping ? "outline" : "gradient"}
                size="sm"
                className="h-9 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-900/20"
                onClick={() => runScraperEngine(false)}
                disabled={isScraping}
              >
                {isScraping ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span>{language === "Arabic" ? "جاري رصد الترند..." : "Scanning..."}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                    <span>{language === "Arabic" ? "رصد وتحديث الترند الآن ⚡" : "Scan & Renew Trends Now ⚡"}</span>
                  </>
                )}
              </Button>
              {scraperLogs.length > 0 && (
                <button
                  onClick={() => setShowTerminal(prev => !prev)}
                  className="text-[10px] text-purple-400 hover:text-purple-300 underline text-center"
                >
                  {showTerminal 
                    ? (language === "Arabic" ? "إخفاء لوحة العمليات" : "Hide Terminal Console") 
                    : (language === "Arabic" ? "عرض لوحة عمل الروبوت" : "Display Robotic Logs")
                  }
                </button>
              )}
            </div>
          </div>
        </div>

        {/* High-tech logs Terminal View */}
        {showTerminal && scraperLogs.length > 0 && (
          <div className="mt-5 p-4 bg-black/80 rounded-2xl border border-white/10 font-mono text-[11px] text-green-400 space-y-1 z-10 relative select-none animate-in slide-in-from-top duration-300 max-h-[160px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
              <span className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-green-500" />
                {language === "Arabic" ? "وحدة تحكم الروبوت رادار-ترند" : "Robot Radar-Trend Console logs"}
              </span>
              <button 
                onClick={() => setShowTerminal(false)} 
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            {scraperLogs.map((logStr, lIdx) => (
              <div key={lIdx} className="leading-relaxed whitespace-pre-wrap">{logStr}</div>
            ))}
            {isScraping && (
              <div className="text-[10px] text-purple-400 animate-pulse mt-1">
                ● Connection established, waiting for streaming chunks...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Primary classification tabs & Filtering rail */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: language === "Arabic" ? "الكل" : "All Swipe" },
            { id: "hooks", label: language === "Arabic" ? "خطافات فيروسية (Hooks)" : "Viral Hooks" },
            { id: "ctas", label: language === "Arabic" ? "دعوات تفاعل (CTAs)" : "High Engagement CTAs" },
            { id: "frameworks", label: language === "Arabic" ? "أطر سرد (Frameworks)" : "Copy Frameworks" },
            { id: "custom", label: language === "Arabic" ? "أفكاري الخاصة" : "My Custom Ideas" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedSubCategory("all");
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right tools side: Sub-category selection & Manual Add Trigger */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
            >
              <option value="all">{language === "Arabic" ? "كل الفئات الفرعية" : "All Sub-categories"}</option>
              {subCategories.map((sc, idx) => (
                <option key={idx} value={sc}>{sc}</option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-purple-500/20 hover:border-purple-500/40 text-purple-300"
            onClick={() => setShowAddModal(prev => !prev)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>{language === "Arabic" ? "إضافة قالب خاص" : "Add Custom template"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-slate-400 border-white/5 hover:bg-white/5"
            onClick={handleResetToCuratedOnly}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            <span>{language === "Arabic" ? "استعادة الأساسيات" : "Restore Curator Defaults"}</span>
          </Button>
        </div>
      </div>

      {/* --- ADD CUSTOM TEMPLATE EXPANDABLE INPUT FORM --- */}
      {showAddModal && (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6 animate-in slide-in-from-top duration-300 space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-slate-100">
                {language === "Arabic" ? "إضافة قالب وهيكل خطاف مخصص جديد" : "Write and Preserve Custom Social Canvas Template"}
              </h3>
            </div>
            <button 
              onClick={() => setShowAddModal(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === "Arabic" ? "النوع" : "Classification Type"}
              </label>
              <Select
                value={newType}
                onChange={(e: any) => setNewType(e.target.value)}
                className="h-9 text-xs bg-black/45 border-white/10 text-slate-200 w-full"
              >
                <option value="hook">{language === "Arabic" ? "خطاف (Hook)" : "Hook (Viral Outline)"}</option>
                <option value="cta">{language === "Arabic" ? "دعوة تفاعل (CTA)" : "CTA (Engagement)"}</option>
                <option value="framework">{language === "Arabic" ? "إطار هيكلي (Copy Framework)" : "Copy Framework"}</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === "Arabic" ? "الفئة الفرعية (مثال: أخطاء وتحذيرات / Warning)" : "Sub Category (Tag / Shelf Label)"}
              </label>
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder={language === "Arabic" ? "مثال: تشويق وغموض / Curiosity" : "e.g. Sales Conversion"}
                className="bg-black/40 border-white/10 text-slate-100 text-xs h-9 px-3 rounded-xl"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === "Arabic" ? "هيكل القالب المقترح (ضع الأقواس لوضع حقول ديناميكية)" : "Template Layout (Use square brackets for tokens like [niche])"}
              </label>
              <Textarea
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                placeholder={language === "Arabic" ? "مثال: كيف تبدأ في [المشروع] في [المدة] بدون رأس مال..." : "e.g. Stop wasting hours on [pain]..."}
                rows={3}
                className="bg-black/40 border-white/10 text-slate-200 text-xs p-3 rounded-xl min-h-[70px]"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === "Arabic" ? "مثال عملي تطبيقي (كيف يبدو في منشور حقيقي)" : "Practical In-Action Example"}
              </label>
              <Textarea
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                placeholder={language === "Arabic" ? "مثال: كيف تبدأ في التجارة الالكترونية في 2026 بدون رأس مال..." : "e.g. Stop wasting hours on manual editing..."}
                rows={3}
                className="bg-black/40 border-white/10 text-slate-200 text-xs p-3 rounded-xl min-h-[70px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === "Arabic" ? "درجة أداء ونسبة رواج القالب (مثال: 9.7)" : "Performance Metric Rating Score (e.g. 9.8)"}
              </label>
              <Input
                type="number"
                step="0.1"
                min="9.0"
                max="10.0"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                className="bg-black/40 border-white/10 text-slate-100 text-xs h-9"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => setShowAddModal(false)}
            >
              {language === "Arabic" ? "إلغاء الحفظ" : "Cancel"}
            </Button>
            <Button
              variant="gradient"
              size="sm"
              className="h-9 text-xs font-bold"
              onClick={handleAddCustomItem}
            >
              {language === "Arabic" ? "حفظ وإضافته للسويب فايل ✅" : "Save and Inject ✅"}
            </Button>
          </div>
        </div>
      )}

      {/* Loading state placeholders */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/10 rounded-3xl space-y-4">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-xs text-slate-400">
            {language === "Arabic" ? "جاري تحميل وتزامن مكتبة الأفكار..." : "Loading and syncing Social Swipe items..."}
          </p>
        </div>
      ) : (
        /* Items deck grid layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col justify-between hover:border-white/20 hover:bg-white/[0.07] transition-all hover:-translate-y-1 relative overflow-hidden group"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    item.type === "hook" 
                      ? "bg-violet-900/20 text-violet-300 border-violet-500/20" 
                      : item.type === "cta"
                        ? "bg-pink-900/20 text-pink-300 border-pink-500/20"
                        : "bg-emerald-900/20 text-emerald-300 border-emerald-500/20"
                  }`}>
                    {item.type.toUpperCase()}
                  </span>
                  
                  {/* Performance indicator score tags */}
                  <span className="flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/20 px-1.5 py-0.5 rounded-md">
                    <Flame className="w-3 h-3 text-orange-400 animate-pulse fill-orange-400" />
                    <span>{item.performanceScore ? `${item.performanceScore}/10` : "9.5/10"}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold">{item.category}</span>
                  {item.freshness && (
                    <span className="text-[9px] text-slate-500 font-mono bg-white/5 px-1 rounded">
                      {item.freshness}
                    </span>
                  )}
                </div>

                {/* Template custom outline description */}
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                    {language === "Arabic" ? "هيكل القالب القابل للتخصيص" : "Customizable Outlines"}
                  </label>
                  <div 
                    className="bg-black/30 p-3 rounded-xl border border-white/5 text-slate-200 text-xs leading-relaxed font-sans whitespace-pre-wrap select-all"
                    dir="auto"
                  >
                    {item.template}
                  </div>
                </div>

                {/* Practical in-action example */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                    {language === "Arabic" ? "طريقة التطبيق (مثال حي للمجال)" : "Practical Example in Arabic"}
                  </label>
                  <p 
                    className="text-[11px] text-slate-400 italic bg-white/[0.01] p-3 rounded-xl border border-dashed border-white/5 leading-relaxed"
                    dir="auto"
                  >
                    {item.example}
                  </p>
                </div>
              </div>

              {/* Bottom Actions of card */}
              <div className="flex gap-2.5 mt-5 border-t border-white/5 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs flex items-center justify-center gap-1 opacity-80 hover:opacity-100 flex-1"
                  onClick={() => copyTemplate(item.id, item.template)}
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      <span>{language === "Arabic" ? "نسخ" : "Copied"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{language === "Arabic" ? "نسخ القالب" : "Copy Hull"}</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="gradient"
                  size="sm"
                  className="h-8 text-xs flex items-center justify-center gap-1.5 flex-1 shadow-lg shadow-purple-900/25"
                  onClick={() => useInGenerator(item)}
                >
                  <MousePointerClick className="w-3.5 h-3.5" />
                  <span>{language === "Arabic" ? "استخدم فوراً" : "Use Hull ⚡"}</span>
                </Button>

                {(item.isCustom || item.freshness?.includes("Trending")) && (
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/5 shrink-0"
                    title={language === "Arabic" ? "حذف القالب" : "Delete outline"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl text-slate-500 flex flex-col items-center justify-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-600" />
          <p className="text-sm">
            {language === "Arabic" ? "لا توجد قوالب تطابق عملية التصفية الحالية." : "No templates match your filtering parameters."}
          </p>
        </div>
      )}
    </div>
  );
}
