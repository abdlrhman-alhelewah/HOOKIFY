import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchWithBackoff } from "@/utils/apiRetry";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Video,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  FileText,
  Check,
  X,
  PlusCircle,
  FolderDot,
  Loader2,
  AlertCircle,
  ExternalLink,
  FileSpreadsheet,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import Markdown from "react-markdown";

interface CalendarItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  platform: string;
  scheduledAt: string; // YYYY-MM-DD
  time?: string; // HH:MM
  projectId?: string;
  createdAt: any;
  googleEventId?: string;
}

interface Project {
  id: string;
  name: string;
}

export default function CalendarPage() {
  const { user, googleToken, connectGoogle } = useAuth();
  const { t, language } = useLanguage();
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlanning, setIsPlanning] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [exportingSheets, setExportingSheets] = useState(false);
  const [sheetsLink, setSheetsLink] = useState<string | null>(null);
  const [retryState, setRetryState] = useState<{
    attempt: number;
    maxRetries: number;
    delayMs: number;
    isActive: boolean;
    reason: string;
  } | null>(null);
  const [planTopic, setPlanTopic] = useState("");
  const [planPlatform, setPlanPlatform] = useState("Instagram Reels");
  const [planProject, setPlanProject] = useState("");
  const [planLanguage, setPlanLanguage] = useState(language === "Arabic" ? "Modern Standard Arabic (Classical)" : "English");

  // State to manage date browsing (defaults to current real date)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  // Selected day detail view / custom creation
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPlatform, setFormPlatform] = useState("Instagram Reels");
  const [formTime, setFormTime] = useState("12:00");
  const [formProject, setFormProject] = useState("");
  const [savingItem, setSavingItem] = useState(false);
  const [previewItem, setPreviewItem] = useState<CalendarItem | null>(null);

  // States for live editing of a selected post
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPlatform, setEditPlatform] = useState("Instagram Reels");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editTime, setEditTime] = useState("12:00");
  const [editProjectId, setEditProjectId] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Custom Confirmation Dialog & Toast States for Iframe and Applet reliability
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    message: "",
    type: "success"
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ isOpen: true, message, type });
    // Use an IIFE or functional state update to prevent stale timeout issue
    setTimeout(() => {
      setToast(prev => prev.message === message ? { ...prev, isOpen: false } : prev);
    }, 4500);
  };

  useEffect(() => {
    setIsEditingPreview(false);
  }, [previewItem]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // Fetch Scheduled Items
        const qItems = query(
          collection(db, "calendar_items"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(qItems);
        const fetchedItems: CalendarItem[] = [];
        querySnapshot.forEach((doc) => {
          fetchedItems.push({ id: doc.id, ...doc.data() } as CalendarItem);
        });

        // Automatically prune/delete any post titled "مش شغال" per user request
        const itemsToDelete = fetchedItems.filter(
          item => item.title && (item.title.trim() === "مش شغال" || item.title.includes("مش شغال"))
        );
        for (const item of itemsToDelete) {
          try {
            await deleteDoc(doc(db, "calendar_items", item.id));
            console.log(`Auto-deleted post: ${item.title} (${item.id})`);
          } catch (deleteErr) {
            console.error("Auto-delete failed for item:", item.id, deleteErr);
          }
        }
        const activeItems = fetchedItems.filter(i => !itemsToDelete.some(it => it.id === i.id));
        setItems(activeItems);

        // Fetch user's Projects
        const qProjects = query(
          collection(db, "projects"),
          where("userId", "==", user.uid)
        );
        const projectSnapshot = await getDocs(qProjects);
        const fetchedProjects: Project[] = [];
        projectSnapshot.forEach((doc) => {
          fetchedProjects.push({ id: doc.id, ...doc.data() } as Project);
        });
        setProjects(fetchedProjects);
      } catch (err) {
        console.error("Error loading calendar/projects databases:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Handle month shifts
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Helper date tools
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month); // 0 (Sunday) to 6 (Saturday)

  // Generate date list YYYY-MM-DD
  const getDayDateString = (day: number) => {
    const yStr = year.toString();
    const mStr = (month + 1).toString().padStart(2, "0");
    const dStr = day.toString().padStart(2, "0");
    return `${yStr}-${mStr}-${dStr}`;
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Calendar render grid array
  const calendarCells: Array<{ day: number | null; dateStr: string | null }> = [];
  
  // Empty blocks prior to monthly alignment
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ day: null, dateStr: null });
  }
  
  // Real days of current Month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({ day: d, dateStr: getDayDateString(d) });
  }

  // Choose appropriate platform visual icons
  const getPlatformIcon = (platformStr: string) => {
    const lower = platformStr.toLowerCase();
    if (lower.includes("reels") || lower.includes("instagram")) return <Instagram className="w-3.5 h-3.5 text-pink-400" />;
    if (lower.includes("tiktok")) return <Video className="w-3.5 h-3.5 text-cyan-400" />;
    if (lower.includes("linkedin")) return <Linkedin className="w-3.5 h-3.5 text-blue-400" />;
    if (lower.includes("twitter") || lower.includes("x")) return <Twitter className="w-3.5 h-3.5 text-sky-400" />;
    if (lower.includes("facebook")) return <Facebook className="w-3.5 h-3.5 text-blue-500" />;
    return <FileText className="w-3.5 h-3.5 text-purple-400" />;
  };

  // Handle adding individual day slot manually
  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDayStr || !formTitle) return;

    setSavingItem(true);
    try {
      const payload = {
        userId: user.uid,
        title: formTitle,
        content: formContent,
        platform: formPlatform,
        scheduledAt: selectedDayStr,
        time: formTime,
        projectId: formProject || null,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "calendar_items"), payload);
      const created: CalendarItem = { id: docRef.id, ...payload, createdAt: null };
      
      setItems(prev => [...prev, created]);
      setFormTitle("");
      setFormContent("");
      setFormPlatform("Instagram Reels");
      setFormTime("12:00");
      setFormProject("");
      setShowAddForm(false);
    } catch (err) {
      console.error("Error creating scheduled item", err);
    } finally {
      setSavingItem(false);
    }
  };

  // Handle starting inline edit mode for an agenda item
  const handleStartEditing = (item: CalendarItem) => {
    setEditTitle(item.title);
    setEditContent(item.content || "");
    setEditPlatform(item.platform);
    setEditScheduledAt(item.scheduledAt);
    setEditTime(item.time || "12:00");
    setEditProjectId(item.projectId || "");
    setIsEditingPreview(true);
  };

  // Convert editing changes and persist them to Firestore
  const handleSaveEdits = async () => {
    if (!previewItem) return;
    if (!editTitle.trim()) {
      showToast(language === "Arabic" ? "⚠️ العنوان مطلوب." : "⚠️ Title is required.", "error");
      return;
    }
    if (!editScheduledAt) {
      showToast(language === "Arabic" ? "⚠️ تاريخ النشر مطلوب." : "⚠️ Schedule date is required.", "error");
      return;
    }
    
    setIsSavingEdit(true);
    try {
      const updatedData = {
        title: editTitle,
        content: editContent,
        platform: editPlatform,
        scheduledAt: editScheduledAt,
        time: editTime,
        projectId: editProjectId || null
      };

      await updateDoc(doc(db, "calendar_items", previewItem.id), updatedData);
      
      const updatedItem: CalendarItem = {
        ...previewItem,
        ...updatedData
      };

      setItems(prev => prev.map(item => item.id === previewItem.id ? updatedItem : item));
      setPreviewItem(updatedItem);
      setIsEditingPreview(false);
      showToast(
        language === "Arabic" 
          ? "🎉 تم تحديث بيانات المنشور بنجاح!" 
          : "🎉 Scheduled post updated successfully!", 
        "success"
      );
    } catch (err: any) {
      console.error("Error saving edits:", err);
      showToast(
        language === "Arabic"
          ? `❌ فشل التحديث: ${err?.message || err}`
          : `❌ Failed to update post: ${err?.message || err}`,
        "error"
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete an item from calendar
  const handleDeleteItem = (itemId: string) => {
    setConfirmModal({
      isOpen: true,
      title: language === "Arabic" ? "حذف منشور مجدول" : "Delete Scheduled Post",
      message: language === "Arabic" ? "هل أنت متأكد من حذف هذا المنشور المجدول؟" : "Are you sure you want to delete this scheduled post?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "calendar_items", itemId));
          setItems(prev => prev.filter(i => i.id !== itemId));
          if (previewItem?.id === itemId) {
            setPreviewItem(null);
          }
          showToast(language === "Arabic" ? "✅ تم حذف المنشور بنجاح!" : "✅ Post deleted successfully!", "success");
        } catch (err: any) {
          console.error("Error deleting item:", err);
          showToast(language === "Arabic" ? "❌ فشل حذف المنشور" : "❌ Failed to delete scheduled post", "error");
        }
      }
    });
  };

  // 30-Day Plan Autogenerator
  const generateMonthPlan = async () => {
    if (!planTopic.trim() || !user) return;
    setIsPlanning(true);

    try {
      const prompt = `Act as an expert Chief Social Media Content Planner operating in the year 2026.
Generate a structured 1-month plan (4 weeks, exactly 8 posts, scheduled twice a week) about the theme/topic: "${planTopic}".
Platform focus: ${planPlatform}. Desired output language: ${planLanguage}.

Format the output strictly as a JSON array of objects. Do not write any intro or explanation. Do not wrap with code fences except standard JSON blocks. Ensure valid parsable JSON structure. Each object represents a scheduled post and holds these exact keys:
1. "title": Short Catchy Title/Topic (In ${planLanguage})
2. "content": High-converting copy draft complete with a hook, brief context, emojis and CTA. (In ${planLanguage})
3. "dayIndex": Number between 1 and 28 indicating on which day of the month this post should live (e.g. 1, 4, 8, 11, 15, 18, 22, 25)
4. "time": Recommended posting time (e.g., "10:00", "15:30", "20:00")

Provide strictly the JSON array block containing the 8 posts. Ensure no syntax errors or pre-text statements.`;

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
        let errMsg = "Failed to communicate with AI Engine";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error; // or localized error
          }
        } catch (e) {}
        throw new Error(errMsg);
      }

      const resText = await response.text();
      // Parse JSON from returned SSE or raw text response
      let cleanJson = "";
      if (resText.includes("data: ")) {
        // Parse SSE
        const lines = resText.split("\n");
        let accumulated = "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const val = line.substring(6).trim();
            if (val && val !== "[DONE]") {
              try {
                const parsed = JSON.parse(val);
                if (parsed.text) accumulated += parsed.text;
                else if (parsed.error) throw new Error(parsed.error);
              } catch (e) {}
            }
          }
        }
        cleanJson = accumulated;
      } else {
        cleanJson = resText;
      }

      // Extract JSON inside array
      const arrStart = cleanJson.indexOf("[");
      const arrEnd = cleanJson.lastIndexOf("]");
      
      if (arrStart !== -1 && arrEnd !== -1) {
        cleanJson = cleanJson.substring(arrStart, arrEnd + 1);
      }

      const generatedData = JSON.parse(cleanJson);
      
      if (Array.isArray(generatedData)) {
        const addedItems: CalendarItem[] = [];

        for (const rawPost of generatedData) {
          const targetDay = Number(rawPost.dayIndex) || 1;
          const dateStr = getDayDateString(Math.min(targetDay, daysInMonth));

          const payload = {
            userId: user.uid,
            title: rawPost.title || `${planTopic} - Day ${targetDay}`,
            content: rawPost.content || "",
            platform: planPlatform,
            scheduledAt: dateStr,
            time: rawPost.time || "18:00",
            projectId: planProject || null,
            createdAt: new Date().toISOString()
          };

          const docRef = await addDoc(collection(db, "calendar_items"), payload);
          addedItems.push({ id: docRef.id, ...payload, createdAt: null });
        }

        setItems(prev => [...prev, ...addedItems]);
        setPlanTopic("");
        setIsPlanning(false);
        showToast(
          language === "Arabic"
            ? "🎉 تم توليد خطة المحتوى الشهري بنجاح وإضافتها للتقويم!"
            : "🎉 30-day content plan generated successfully and added to the calendar!",
          "success"
        );
      } else {
        throw new Error("Invalid structure returned by model");
      }
    } catch (err: any) {
      setRetryState(null);
      console.error(err);
      
      const isRateLimit = err?.message?.includes("429") || err?.toString()?.toLowerCase()?.includes("rate limit");
      const isNetwork = err?.toString()?.toLowerCase()?.includes("fetch") || err?.toString()?.toLowerCase()?.includes("network");

      let alertMsg = "";
      if (isRateLimit) {
        alertMsg = language === "Arabic"
          ? "توليد الخطة متوقف مؤقتاً بسبب حدود الاستخدام (Rate Limit - 429). يبدو أن الخوادم مضغوطة حالياً بسبب المحاولات المتلاحقة أو نفاد الحصة المشتركة للنسخة التجريبية. يرجى الانتظار 30 ثانية ثم إعادة المحاولة."
          : "Failed to generate monthly plan due to temporary rate limits (429). This occurs when too many requests arrive simultaneously. Please wait about 30 seconds and try again.";
      } else if (isNetwork) {
        alertMsg = language === "Arabic"
          ? "حدث خلل غير متوقع في جودة أو ثبات اتصال الإنترنت الخاص بك ولم تنجح محاولات الاتصال التلقائية. يرجى التحقق من الشبكة وإعادة المحاولة."
          : "A network connection layout error occurred. Automatic backoff retries exhausted. Please verify that your internet connectivity is stable and reload to plan again.";
      } else {
        alertMsg = language === "Arabic"
          ? `فشل توليد الخطة تلقائيًا. السبب: ${err?.message || "طلب معقد"}. يرجى المحاولة بصيغة وعناوين أبسط.`
          : `Failed to generate monthly plan. Reason: ${err?.message || "complex schema format"}. Please try again with a simpler topic or shorter keywords.`;
      }

      showToast(alertMsg, "error");
      setIsPlanning(false);
    }
  };

  // Connect to Google Workspace manually
  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      await connectGoogle();
      showToast(
        language === "Arabic"
          ? "🎉 تم ربط حسابك بـ Google Workspace بنجاح!"
          : "🎉 Successfully connected your account with Google Workspace!",
        "success"
      );
    } catch (err: any) {
      console.error(err);
      const isPopupBlocked = err?.code === "auth/popup-blocked" || err?.message?.includes("popup") || err?.toString()?.toLowerCase()?.includes("popup");
      if (isPopupBlocked) {
        showToast(
          language === "Arabic" 
            ? "⚠️ يبدو أن متصفحك قام بحجب نافذة الربط المنبثقة! يرجى السماح بالنوافذ المنبثقة من إعدادات المتصفح، أو افتح التطبيق في نافذة/علامة تبويب مستقلة لتفادي قيود الحجب." 
            : "⚠️ It looks like your browser blocked the verification popup! Please allow popups for this site, or open the preview in a new tab.",
          "error"
        );
      } else {
        showToast(
          language === "Arabic" ? `❌ فشل الاتصال: ${err?.message || err}` : `❌ Connection failed: ${err?.message || err}`,
          "error"
        );
      }
    } finally {
      setConnectingGoogle(false);
    }
  };

  // Helper to sync single item to Google Calendar
  const syncItemToGoogleCalendar = async (item: CalendarItem, token: string) => {
    // Robustly clean and split the hours/minutes to build the Date
    let timeStr = (item.time || "12:00").trim();
    const ampmMatch = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
    if (ampmMatch) {
      let hh = parseInt(ampmMatch[1], 10);
      const mm = ampmMatch[2];
      const ampm = ampmMatch[3].toLowerCase();
      if (ampm === "pm" && hh < 12) hh += 12;
      if (ampm === "am" && hh === 12) hh = 0;
      timeStr = `${hh.toString().padStart(2, "0")}:${mm}`;
    } else {
      const simpleMatch = timeStr.match(/(\d+):(\d+)/);
      if (simpleMatch) {
        const hh = parseInt(simpleMatch[1], 10);
        const mm = simpleMatch[2];
        timeStr = `${hh.toString().padStart(2, "0")}:${mm.padStart(2, "0")}`;
      } else {
        timeStr = "12:00";
      }
    }

    const startObj = new Date(`${item.scheduledAt}T${timeStr}:00`);
    if (isNaN(startObj.getTime())) {
      throw new Error(`Invalid event date/time detected: ${item.scheduledAt} ${timeStr}`);
    }
    const endObj = new Date(startObj.getTime() + 60 * 60 * 1000); // 1 hour duration
    
    const eventPayload = {
      summary: `[${item.platform}] - ${item.title}`,
      description: item.content || "",
      start: {
        dateTime: startObj.toISOString(),
        timeZone: "UTC"
      },
      end: {
        dateTime: endObj.toISOString(),
        timeZone: "UTC"
      }
    };

    const url = item.googleEventId 
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${item.googleEventId}`
      : `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

    const method = item.googleEventId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(eventPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Calendar sync failed: ${errText}`);
    }

    const data = await response.json();
    return data.id as string;
  };

  // Sync all items of current month to Google Calendar
  const handleSyncMonthToCalendar = async () => {
    if (!googleToken) return;
    
    const yearStr = currentDate.getFullYear().toString();
    const monthStr = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const targetPrefix = `${yearStr}-${monthStr}`; // e.g. "2026-06"

    // Extract items for the currently displayed month safely via string match prefix (timezone immune)
    const monthItems = items.filter(item => item.scheduledAt.startsWith(targetPrefix));

    if (monthItems.length === 0) {
      showToast(language === "Arabic" ? "لا توجد منشورات مجدولة في هذا الشهر لمزامنتها." : "No scheduled posts found for this month to sync.", "info");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: language === "Arabic" ? "مزامنة التقويم" : "Calendar Sync",
      message: language === "Arabic"
        ? `هل أنت متأكد من مزامنة ${monthItems.length} من منشورات هذا الشهر إلى تقويم Google الخاص بك؟`
        : `Are you sure you want to sync ${monthItems.length} posts of this month to your Google Calendar?`,
      onConfirm: async () => {
        setSyncingCalendar(true);
        let successCount = 0;
        
        try {
          const updatedItems = [...items];
          for (const item of monthItems) {
            try {
              const eventId = await syncItemToGoogleCalendar(item, googleToken);
              
              // Save googleEventId to Firestore
              await updateDoc(doc(db, "calendar_items", item.id), {
                googleEventId: eventId
              });
              
              // Update in memory updated array
              const idx = updatedItems.findIndex(i => i.id === item.id);
              if (idx !== -1) {
                updatedItems[idx] = { ...updatedItems[idx], googleEventId: eventId };
              }
              successCount++;
            } catch (err) {
              console.error(`Failed to sync item ${item.id}`, err);
            }
          }
          
          setItems(updatedItems);
          showToast(
            language === "Arabic"
              ? `🎉 تم مزامنة ${successCount} منشورات بنجاح إلى تقويم Google الخاص بك!`
              : `🎉 Successfully synced ${successCount} posts to your Google Calendar!`,
            "success"
          );
        } catch (error) {
          console.error("Calendar sync error:", error);
          showToast(language === "Arabic" ? "فشلت المزامنة." : "Calendar synchronization failed.", "error");
        } finally {
          setSyncingCalendar(false);
        }
      }
    });
  };

  // Export current month's items to Google Sheets
  const handleExportMonthToSheets = async () => {
    if (!googleToken) return;

    const yearStr = currentDate.getFullYear().toString();
    const monthStr = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const targetPrefix = `${yearStr}-${monthStr}`; // e.g. "2026-06"

    const monthItems = items.filter(item => item.scheduledAt.startsWith(targetPrefix));

    if (monthItems.length === 0) {
      showToast(language === "Arabic" ? "لا توجد منشورات مجدولة في هذا الشهر لتصديرها." : "No scheduled posts found for this month to export.", "info");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: language === "Arabic" ? "تصدير إلى جدول بيانات" : "Export Spreadsheet",
      message: language === "Arabic"
        ? `هل تريد تصدير خطة منشورات هذا الشهر (${monthItems.length} منشورا) إلى جدول بيانات Google جديد؟`
        : `Do you want to export this month's plan (${monthItems.length} posts) to a new Google Spreadsheet?`,
      onConfirm: async () => {
        setExportingSheets(true);
        setSheetsLink(null);

        try {
          const formattedMonthName = currentDate.toLocaleDateString(language === "Arabic" ? "ar-EG" : "en-US", {
            month: "long",
            year: "numeric"
          });

          // 1. Create a new Spreadsheet using the stable v4 endpoint
          const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${googleToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              properties: {
                title: `Smart Content Plan - ${formattedMonthName}`
              }
            })
          });

          if (!createRes.ok) {
            throw new Error(`Failed to create Google Sheet: ${await createRes.text()}`);
          }

          const sheetData = await createRes.json();
          const spreadsheetId = sheetData.spreadsheetId;
          const spreadsheetUrl = sheetData.spreadsheetUrl;
          // Get the exact localized sheet tab name (e.g., "Sheet1", "ورقة1", "Hoja 1") to bypass localized accounts
          const sheetTitle = sheetData.sheets?.[0]?.properties?.title || "Sheet1";

          // 2. Prepare spreadsheet values row matrix
          const values = [
            [
              language === "Arabic" ? "المنصة" : "Platform",
              language === "Arabic" ? "العنوان/الفكرة" : "Title / Concept",
              language === "Arabic" ? "التاريخ" : "Scheduled Date",
              language === "Arabic" ? "الوقت" : "Scheduled Time",
              language === "Arabic" ? "المحتوى/الرأسية" : "Content / Caption"
            ]
          ];

          // Sort items by date
          const sortedItems = [...monthItems].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

          for (const item of sortedItems) {
            values.push([
              item.platform,
              item.title,
              item.scheduledAt,
              item.time || "12:00",
              item.content || ""
            ]);
          }

          // 3. Write data to dynamic localized first sheet using update API
          const writeRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:E${values.length}?valueInputOption=USER_ENTERED`,
            {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${googleToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                values
              })
            }
          );

          if (!writeRes.ok) {
            throw new Error(`Failed to populate Google Sheet: ${await writeRes.text()}`);
          }

          setSheetsLink(spreadsheetUrl);
          showToast(
            language === "Arabic"
              ? "🎉 تم تصدير خطة المحتوى بنجاح إلى Google Sheets! الرابط متوفر الآن للعرض."
              : "🎉 Successfully exported your content plan to Google Sheets! Click the link to view.",
            "success"
          );
        } catch (error: any) {
          console.error("Sheets export error:", error);
          showToast(
            language === "Arabic"
              ? `فشل التصدير إلى Google Sheets: ${error?.message || error}`
              : `Sheets export failed: ${error?.message || error}`,
            "error"
          );
        } finally {
          setExportingSheets(false);
        }
      }
    });
  };

  const getDayItems = (dateStr: string) => {
    return items.filter(item => item.scheduledAt === dateStr);
  };

  const formattedMonth = currentDate.toLocaleDateString(language === "Arabic" ? "ar-EG" : "en-US", {
    month: "long",
    year: "numeric"
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-8rem)]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 border border-white/10 rounded-3xl p-6 lg:p-8">
        <div>
          <h1 className="text-3xl font-bold font-heading mb-2 text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-purple-400" />
            {language === "Arabic" ? "تقويم المحتوى الذكي" : "Smart Content Calendar"}
          </h1>
          <p className="text-slate-400">
            {language === "Arabic" 
              ? "قم بتنظيم وجدولة منشوراتك في خطة شهرية متكاملة، واستخدم الذكاء الاصطناعي لملء الشهر بلمسة واحدة."
              : "Organize and schedule your social media posts in a clean calendar view. Power your calendar with automated AI planning."}
          </p>
        </div>

        {/* Quick Month Plan Generator Modal Toggle Component */}
        <div className="bg-gradient-to-tr from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-4 max-w-md w-full md:w-auto">
          <h3 className="text-sm font-bold text-purple-300 flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4" />
            {language === "Arabic" ? "توليد خطة شهرية ذكية" : "AI Full Month Plan Planner"}
          </h3>
          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            {language === "Arabic"
              ? "أدخل فكرتك وسيقوم الذكاء الاصطناعي بتوليد 8 منشورات كاملة وتوزيعها على أيام الشهر."
              : "Enter your topic & the AI will automatically create and schedule 8 comprehensive posts over the block."}
          </p>
          <div className="space-y-2">
            <Input 
              placeholder={language === "Arabic" ? "مثال: تسويق عقاري فاخر، نصائح برمجة..." : "e.g., Luxury real estate tips..."}
              value={planTopic}
              disabled={isPlanning}
              onChange={(e) => setPlanTopic(e.target.value)}
              className="bg-black/40 h-9 text-xs border-white/10"
            />
            <div className="flex gap-2">
              <select
                value={planPlatform}
                disabled={isPlanning}
                onChange={(e) => setPlanPlatform(e.target.value)}
                className="bg-black/40 text-[11px] rounded-lg border border-white/10 px-2 text-slate-300 h-8 font-medium grow"
              >
                <option value="Instagram Reels">Instagram Reels</option>
                <option value="TikTok">TikTok</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Twitter / X">Twitter / X</option>
              </select>
              <Button 
                variant="gradient" 
                size="sm" 
                className="h-8 text-xs shrink-0"
                onClick={generateMonthPlan}
                disabled={isPlanning || !planTopic.trim()}
              >
                {isPlanning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    {language === "Arabic" ? "جاري التخطيط..." : "Planning..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    {language === "Arabic" ? "توليد الخطة ✨" : "Plan Month ✨"}
                  </>
                )}
              </Button>
            </div>
            {retryState && retryState.isActive && (
              <div className="p-3 bg-amber-950/20 text-amber-400 border border-amber-900/40 rounded-xl text-[11px] animate-pulse leading-snug space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-100">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>
                    {language === "Arabic" ? "محاولة اتصال تلقائي..." : "Retrying connection..."}
                  </span>
                </div>
                <p>
                  {language === "Arabic"
                    ? `معدل ضغط طلبات مرتفع. المحاولة ${retryState.attempt} من أصل ${retryState.maxRetries}`
                    : `Network / rate limit backoff. Attempt ${retryState.attempt} of ${retryState.maxRetries}`}
                </p>
                <p className="opacity-80 text-[10px]">
                  {language === "Arabic"
                    ? `جاري الانتظار لمدة ${Math.round(retryState.delayMs / 1000)} ثانية للتبريد الآمن...`
                    : `Retrying after a cooling-off period of ${Math.round(retryState.delayMs / 1000)} seconds...`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Google Workspace Integrations Console */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 lg:p-8 space-y-4">
        {!googleToken ? (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  {language === "Arabic" ? "تنشيط ربط قوقل (الخطوة الأولى والثانية)" : "Enable Google Workspace Integrations"}
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  {language === "Arabic" ? (
                    "اربط حساب Google الخاص بك لتفعيل تصدير خطة المحتوى تلقائياً: (خطوة 1) المزامنة مع تقويم Google الشخصي ليظهر في منبهاتك، و(خطوة 2) تصدير المحتوى بالكامل مرتباً في ملف Google Sheets."
                  ) : (
                    "Securely authenticate with Google to enable: (Step 1) Syncing your smart plans directly to your Google Calendar events, and (Step 2) Exporting your monthly table layout directly into structured Google Sheets spreadsheets."
                  )}
                </p>
              </div>
              <Button
                variant="gradient"
                onClick={handleConnectGoogle}
                disabled={connectingGoogle}
                className="w-full md:w-auto h-11 px-6 text-sm font-bold flex items-center justify-center gap-2"
              >
                {connectingGoogle ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {language === "Arabic" ? "جاري الاتصال..." : "Connecting..."}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22l.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1C7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    {language === "Arabic" ? "ربط حساب Google Workspace 🔌" : "Connect Google Workspace 🔌"}
                  </>
                )}
              </Button>
            </div>

            {/* Verification / Consent bypass guide banner */}
            <div className="mt-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-3">
              <p className="font-bold flex items-center gap-1.5 text-amber-200 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                {language === "Arabic" ? "تنبيه بخصوص شاشة الحماية وقوقل ومشاكل الأزرار المعطلة:" : "Important: Google Safety Screen and Button Warnings Guide:"}
              </p>
              <p className="leading-relaxed text-slate-300">
                {language === "Arabic" ? (
                  <>
                    بما أن هذا التطبيق التجريبي مخصص لك وفي مرحلة التطوير، ستظهر لك شاشة حماية حمراء من قوقل تفيد بأن <strong className="text-slate-100 font-bold">"التطبيق غير معتمد" (Google hasn't verified this app)</strong>. عدم تجاوز هذه الشاشة سيحظر الاتصال وبالتالي <strong className="text-pink-400 font-bold">ستبدو أزرار مزامنة وتصدير التقويم ومستندات Google معطلة ولا تعمل!</strong> لتفادي هذه المشكلة والربط بنجاح:
                  </>
                ) : (
                  <>
                    Because this custom sandbox app is in testing mode, Google displays a red security screen saying <strong className="text-slate-100 font-bold">"Google hasn't verified this app"</strong>. If you do not bypass this screen, the Google integration will fail, and <strong className="text-pink-400 font-bold">calendar and spreadsheet sync buttons will appear broken!</strong> To correct this and connect easily:
                  </>
                )}
              </p>
              <div className="bg-black/35 p-3 rounded-xl border border-white/5 space-y-2 text-slate-300">
                <p className="font-semibold text-amber-200">
                  {language === "Arabic" ? "💡 كيف تتخطى الشاشة وتفعل الأزرار بأمان؟" : "💡 How to bypass this and connect safely:"}
                </p>
                <div className="space-y-1.5 pl-1 rtl:pl-0 rtl:pr-1 text-[11px] leading-relaxed">
                  <p>
                    1. {language === "Arabic" ? (
                      <>اضغط على رابط <strong className="text-slate-100 decoration-slate-100 font-bold">"خيارات متقدمة" (Advanced)</strong> أسفل يسار بطاقة التحذير.</>
                    ) : (
                      <>Click on the <strong className="text-slate-100 font-bold">"Advanced"</strong> link on the bottom left corner.</>
                    )}
                  </p>
                  <p>
                    2. {language === "Arabic" ? (
                      <>اضغط على الرابط في الأسفل <strong className="text-slate-100 font-bold">"الانتقال إلى Hookify (غير آمن)"</strong> أو <strong className="text-slate-100 font-bold">"Go to Hookify (unsafe)"</strong>.</>
                    ) : (
                      <>Click on <strong className="text-slate-100 font-bold">"Go to Hookify (unsafe)"</strong> at the footer of the text block.</>
                    )}
                  </p>
                  <p>
                    3. {language === "Arabic" ? (
                      <>تأكد من <strong className="text-slate-100 font-bold">تحديد جميع مربعات التحقق</strong> لمنح صلاحية التعديل، ثم اضغط <strong className="text-slate-100 font-bold">"متابعة" (Continue)</strong>.</>
                    ) : (
                      <>Make sure to <strong className="text-slate-100 font-bold">check all permission request boxes</strong> (for Sheets & Calendar), then click <strong className="text-slate-100 font-bold">"Continue"</strong>.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <h4 className="text-sm font-bold text-slate-100">
                    {language === "Arabic" ? "اتصال قوقل نشط ومتزامن" : "Google Workspace connected & active"}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {language === "Arabic" ? "أنت جاهز لتصدير ومزامنة مخططاتك الشهرية" : "Ready to synchronize your active monthly content structures"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnectGoogle}
                  className="text-xs h-9 border-white/10 hover:bg-white/5 text-slate-300"
                >
                  {language === "Arabic" ? "تبديل الحساب 🔄" : "Switch Account 🔄"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1: Google Calendar Synchronization block */}
              <div className="bg-black/25 border border-white/5 rounded-2xl p-4 flex flex-col justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-indigo-300 text-sm font-bold">
                    <CalendarIcon className="w-4 h-4" />
                    {language === "Arabic" ? "الخطوة الأولى: المزامنة مع تقويم Google" : "Step 1: Sync to Google Calendar"}
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    {language === "Arabic" ? (
                      `مزامنة وإرسال منشوارات وأجندة شهر ${formattedMonth} تلقائياً إلى تقويمك لتذكيرك بمواعيد النشر دقيقة بدقيقة.`
                    ) : (
                      `Synchronize and schedule all ${formattedMonth} entries directly to your active Google Calendar events.`
                    )}
                  </p>
                </div>
                <Button
                  onClick={handleSyncMonthToCalendar}
                  disabled={syncingCalendar}
                  className="w-full h-10 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2"
                >
                  {syncingCalendar ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {language === "Arabic" ? "جاري المزامنة..." : "Syncing Calendar..."}
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {language === "Arabic" ? `مزامنة ${formattedMonth} إلى التقويم 📅` : `Sync ${formattedMonth} to Calendar 📅`}
                    </>
                  )}
                </Button>
              </div>

              {/* Step 2: Google Sheets Spreadsheet export block */}
              <div className="bg-black/25 border border-white/5 rounded-2xl p-4 flex flex-col justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-300 text-sm font-bold">
                    <FileSpreadsheet className="w-4 h-4" />
                    {language === "Arabic" ? "الخطوة الثانية: تصدير لـ Google Sheets" : "Step 2: Export to Google Sheets"}
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    {language === "Arabic" ? (
                      `إنشاء جدول بيانات Google جديد كلياً وتصدير جدول مخطط شهر ${formattedMonth} بكامل تفاصيله ونسخ الكتابة.`
                    ) : (
                      `Create a brand-new Google Sheet container and write this month's plan (${formattedMonth}) contents into clean tables.`
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={handleExportMonthToSheets}
                    disabled={exportingSheets}
                    className="w-full h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2"
                  >
                    {exportingSheets ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {language === "Arabic" ? "جاري التصدير..." : "Exporting Sheets..."}
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        {language === "Arabic" ? "تصدير إلى جدول Sheets 📊" : "Export to Sheets Table 📊"}
                      </>
                    )}
                  </Button>
                  {sheetsLink && (
                    <a
                      href={sheetsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-400 font-bold hover:underline flex items-center justify-center gap-1.5 pt-1"
                    >
                      <span>{language === "Arabic" ? "📂 افتح ملف Google Sheets المصدّر" : "📂 Open exported Google Sheet"}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Calendar Core Section */}
        <div className="lg:col-span-8 bg-white/5 border border-white/10 rounded-3xl p-6">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              {formattedMonth}
            </h2>
            <div className="flex bg-slate-950/60 rounded-xl p-0.5 border border-white/10">
              <button 
                onClick={prevMonth}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={nextMonth}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">
            <div>{language === "Arabic" ? "أحد" : "Sun"}</div>
            <div>{language === "Arabic" ? "إثنين" : "Mon"}</div>
            <div>{language === "Arabic" ? "ثلاثاء" : "Tue"}</div>
            <div>{language === "Arabic" ? "أربعاء" : "Wed"}</div>
            <div>{language === "Arabic" ? "خميس" : "Thu"}</div>
            <div>{language === "Arabic" ? "جمعة" : "Fri"}</div>
            <div>{language === "Arabic" ? "سبت" : "Sat"}</div>
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-2 bg-black/20 p-2 rounded-2xl border border-white/5">
            {calendarCells.map((cell, index) => {
              const isSelected = selectedDayStr === cell.dateStr;
              const cellItems = cell.dateStr ? getDayItems(cell.dateStr) : [];
              const isCurrentDay = cell.dateStr === todayStr;

              return (
                <div 
                  key={index} 
                  onClick={() => cell.dateStr && setSelectedDayStr(cell.dateStr)}
                  className={`min-h-[90px] p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                    !cell.day 
                      ? "bg-transparent border-transparent cursor-default" 
                      : isSelected
                        ? "bg-purple-600/20 border-purple-500/70 shadow-lg shadow-purple-600/10"
                        : isCurrentDay
                          ? "bg-white/10 border-white/20 ring-1 ring-purple-500/40"
                          : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"
                  }`}
                >
                  {cell.day ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold ${isCurrentDay ? 'text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded-md' : 'text-slate-400'}`}>
                          {cell.day}
                        </span>
                        {cellItems.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1 mt-1 font-sans text-[9px] overflow-hidden max-h-[50px]">
                        {cellItems.slice(0, 3).map((item, id) => (
                          <div 
                            key={id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewItem(item);
                            }}
                            className="bg-purple-950/40 border border-purple-500/20 rounded px-1 py-0.5 text-purple-300 truncate hover:bg-purple-900/40 hover:text-white transition-colors"
                            title={item.title}
                          >
                            <span className="inline-block mr-1 rtl:ml-1 align-middle">
                              {getPlatformIcon(item.platform)}
                            </span>
                            <span className="align-middle">{item.title}</span>
                          </div>
                        ))}
                        {cellItems.length > 3 && (
                          <span className="text-[8px] text-slate-500 font-bold ml-1">
                            +{cellItems.length - 3} {language === "Arabic" ? "آخرى" : "more"}
                          </span>
                        )}
                      </div>
                    </>
                  ) : <div />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day details / Sidebar list */}
        <div className="lg:col-span-4 space-y-6">
          {/* Day Detail Info */}
          {selectedDayStr ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{language === "Arabic" ? "أجندة يوم" : "Schedule for"}</h3>
                  <p className="text-xl font-bold text-slate-200">
                    {new Date(selectedDayStr).toLocaleDateString(language === "Arabic" ? "ar-EG" : "en-US", {
                      weekday: 'long', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
                {!showAddForm && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-8 text-xs flex items-center gap-1.5"
                    onClick={() => setShowAddForm(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {language === "Arabic" ? "أضف منشور" : "Add Post"}
                  </Button>
                )}
              </div>

              {/* Form to insert manual scheduled post */}
              {showAddForm && (
                <form onSubmit={handleAddNewItem} className="space-y-4 bg-black/30 p-4 rounded-2xl border border-white/5 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {language === "Arabic" ? "تخطيط منشور جديد" : "Draft New Scheduled Post"}
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => setShowAddForm(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wiest block">{language === "Arabic" ? "عنوان الموضوع" : "Title / Topic"}</label>
                    <Input 
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder={language === "Arabic" ? "عنون بسيط لتذكر المحتوى..." : "Post concept title..."}
                      required
                      className="bg-black/40 h-9 text-xs border-white/5 focus:border-purple-500/50 text-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wiest block">{language === "Arabic" ? "نص المحتوى (اختياري)" : "Content / Caption (Optional)"}</label>
                    <Textarea 
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder={language === "Arabic" ? "اكتب تفاصيل المحتوى هنا..." : "Write the captions or drafts..."}
                      className="bg-black/40 text-xs border-white/5 focus:border-purple-500/50 text-slate-200 min-h-20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wiest block">{language === "Arabic" ? "المنصة" : "Platform"}</label>
                      <Select 
                        value={formPlatform} 
                        onChange={(e) => setFormPlatform(e.target.value)}
                        className="h-8 text-[11px] bg-black/40"
                      >
                        <option value="Instagram Reels">Instagram Reels</option>
                        <option value="TikTok">TikTok</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Twitter / X">Twitter / X</option>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wiest block">{language === "Arabic" ? "الوقت" : "Post Time"}</label>
                      <Input 
                        type="time"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="bg-black/40 h-8 text-[11px]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wiest block">{language === "Arabic" ? "ربط بمشروع" : "Link to Project"}</label>
                    <Select 
                      value={formProject} 
                      onChange={(e) => setFormProject(e.target.value)}
                      className="h-8 text-[11px] bg-black/40"
                    >
                      <option value="">{language === "Arabic" ? "بدون تحديد مشروع" : "No project"}</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </Select>
                  </div>
                  <Button 
                    type="submit" 
                    variant="gradient" 
                    className="w-full h-9 text-xs"
                    disabled={savingItem}
                  >
                    {savingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (language === "Arabic" ? "حفظ وتثبيت على التقويم" : "Save and Schedule")}
                  </Button>
                </form>
              )}

              {/* Day items list */}
              <div className="space-y-3">
                {getDayItems(selectedDayStr).length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    {language === "Arabic" ? "لا توجد منشورات مجدولة في هذا اليوم." : "No scheduled posts for this day."}
                  </p>
                ) : (
                  getDayItems(selectedDayStr).map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => setPreviewItem(item)}
                      className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-purple-500/10 rounded-xl">
                          {getPlatformIcon(item.platform)}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold text-slate-200 truncate">{item.title}</h4>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-purple-400" />
                            {item.time || "12:00"}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item.id);
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center text-slate-500 text-xs py-12">
              <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              {language === "Arabic" ? "اختر يومًا من التقويم لعرض الأجندة أو إضافة منشورات" : "Select a calendar day to view scheduled postings or create a custom event."}
            </div>
          )}

          {/* Quick Active Schedule Preview Modal panel */}
          {previewItem && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => {
                  setPreviewItem(null);
                  setIsEditingPreview(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                disabled={isSavingEdit}
              >
                <X className="w-4 h-4" />
              </button>

              {isEditingPreview ? (
                <div className="space-y-3.5 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
                      <Pencil className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">
                        {language === "Arabic" ? "تعديل محتوى المنشور" : "Edit Scheduled Post"}
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        {language === "Arabic" ? "قم بتعديل حقول المنشور ليتم حفظها تلقائياً." : "Update the post details below."}
                      </p>
                    </div>
                  </div>

                  {/* Title Input */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === "Arabic" ? "العنوان / الفكرة *" : "Title / Concept *"}
                    </label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="bg-black/40 border-white/10 text-slate-100 text-xs h-9 px-3 rounded-xl focus:border-indigo-500"
                    />
                  </div>

                  {/* Platform Selection */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === "Arabic" ? "المنصة المستهدفة *" : "Target Platform *"}
                    </label>
                    <Select
                      value={editPlatform}
                      onChange={(e: any) => setEditPlatform(e.target.value)}
                      className="h-9 text-xs bg-black/45 border-white/10 text-slate-200 w-full rounded-xl"
                    >
                      <option value="Instagram Reels">Instagram Reels</option>
                      <option value="TikTok">TikTok</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Twitter / X">Twitter / X</option>
                    </Select>
                  </div>

                  {/* Date and Time selectors in Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        {language === "Arabic" ? "تاريخ النشر *" : "Post Date *"}
                      </label>
                      <input
                        type="date"
                        value={editScheduledAt}
                        onChange={(e) => setEditScheduledAt(e.target.value)}
                        className="flex w-full rounded-xl border border-white/10 bg-black/40 h-9 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        {language === "Arabic" ? "الموعد" : "Post Time"}
                      </label>
                      <Input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="bg-black/40 border-white/10 text-slate-100 text-xs h-9 px-3 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Optional Project Assignment */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === "Arabic" ? "المشروع التابع له" : "Belongs to Project"}
                    </label>
                    <Select
                      value={editProjectId}
                      onChange={(e: any) => setEditProjectId(e.target.value)}
                      className="h-9 text-xs bg-black/45 border-white/10 text-slate-200 w-full rounded-xl"
                    >
                      <option value="">{language === "Arabic" ? "بدون مشروع" : "No project"}</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Text CONTENT block */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === "Arabic" ? "المحتوى أو التعليق المصاحب" : "Caption or Body Content"}
                    </label>
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={5}
                      className="bg-black/40 border-white/10 text-slate-250 text-xs p-3 rounded-xl focus:border-indigo-500 min-h-[140px] leading-relaxed whitespace-pre-wrap"
                    />
                  </div>

                  {/* CTAs */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-9 border-white/5 bg-white/[0.02]"
                      onClick={() => setIsEditingPreview(false)}
                      disabled={isSavingEdit}
                    >
                      {language === "Arabic" ? "إلغاء وعودة" : "Cancel"}
                    </Button>
                    <Button
                      variant="gradient"
                      size="sm"
                      className="flex-1 text-xs h-9 font-bold"
                      onClick={handleSaveEdits}
                      disabled={isSavingEdit}
                    >
                      {isSavingEdit ? (
                        <span className="flex items-center gap-1 justify-center">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {language === "Arabic" ? "جاري الحفظ..." : "Saving..."}
                        </span>
                      ) : (
                        language === "Arabic" ? "حفظ التعديلات ✅" : "Save Changes ✅"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30 inline-flex items-center gap-1">
                      {getPlatformIcon(previewItem.platform)}
                      {previewItem.platform}
                    </span>
                    <h3 className="text-lg font-bold text-slate-100">{previewItem.title}</h3>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {previewItem.scheduledAt}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {previewItem.time || "12:00"}
                      </span>
                    </div>
                  </div>
                  <div 
                    dir={previewItem.content && /[\u0600-\u06FF]/.test(previewItem.content) ? "rtl" : "ltr"}
                    className="p-4 bg-black/40 rounded-2xl border border-white/5 overflow-y-auto max-h-[180px] text-xs leading-relaxed text-slate-300"
                  >
                    {previewItem.content ? (
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
                        {previewItem.content}
                      </Markdown>
                    ) : (
                      <span className="text-slate-500 italic">No content draft recorded.</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs h-8 text-teal-400 border-teal-500/20 hover:bg-teal-500/10 hover:border-teal-500/30 font-medium"
                      onClick={() => handleStartEditing(previewItem)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      {language === "Arabic" ? "تعديل المنشور ✏️" : "Edit Post ✏️"}
                    </Button>
                    {googleToken && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={`flex-1 text-xs h-8 flex items-center justify-center gap-1.5 ${
                          previewItem.googleEventId 
                            ? "text-indigo-400 border-indigo-500/20 hover:bg-indigo-400/10" 
                            : "text-emerald-400 border-emerald-500/20 hover:bg-emerald-400/10"
                        }`}
                        onClick={async () => {
                          try {
                            const eventId = await syncItemToGoogleCalendar(previewItem, googleToken);
                            await updateDoc(doc(db, "calendar_items", previewItem.id), {
                              googleEventId: eventId
                            });
                            setItems(prev => prev.map(i => i.id === previewItem.id ? { ...i, googleEventId: eventId } : i));
                            setPreviewItem(prev => prev ? { ...prev, googleEventId: eventId } : null);
                            showToast(language === "Arabic" ? "🎉 تم المزامنة بنجاح!" : "🎉 Synced successfully!", "success");
                          } catch (e) {
                            console.error(e);
                            showToast(language === "Arabic" ? "❌ فشلت المزامنة." : "Failed to sync item to Google Calendar.", "error");
                          }
                        }}
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {previewItem.googleEventId 
                          ? (language === "Arabic" ? "تحديث بالتقويم 📅" : "Update Calendar 📅")
                          : (language === "Arabic" ? "إضافة للتقويم 📅" : "Add to Calendar 📅")}
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs h-8 text-red-400 border-red-500/20 hover:bg-red-400/10 hover:border-red-500/30"
                      onClick={() => handleDeleteItem(previewItem.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      {language === "Arabic" ? "حذف هذا المنشور" : "Delete scheduled post"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Alert */}
      <AnimatePresence>
        {toast.isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
                : toast.type === "error"
                ? "bg-red-950/90 border-red-500/30 text-red-300"
                : "bg-slate-900/90 border-slate-700/30 text-slate-300"
            }`}
          >
            <div className={`p-1 rounded-lg ${
              toast.type === "success" ? "bg-emerald-500/10" : toast.type === "error" ? "bg-red-500/10" : "bg-slate-500/10"
            }`}>
              {toast.type === "success" ? (
                <Check className="w-4 h-4" />
              ) : toast.type === "error" ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4 text-indigo-400" />
              )}
            </div>
            <p className="text-xs font-medium pr-2">{toast.message}</p>
            <button 
              onClick={() => setToast(prev => ({ ...prev, isOpen: false }))}
              className="text-slate-400 hover:text-white transition-colors ml-auto p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-slate-950 border border-white/10 p-6 shadow-2xl space-y-4 text-slate-200"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">{confirmModal.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{confirmModal.message}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="px-4 text-xs h-9 border-white/5 bg-white/[0.02] hover:bg-white/5 text-slate-400 hover:text-slate-100"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                >
                  {language === "Arabic" ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="px-4 text-xs h-9 bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }}
                >
                  {language === "Arabic" ? "تأكيد" : "Confirm"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
