import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { collection, query, where, getDocs, Timestamp, deleteDoc, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bookmark, Loader2, AlertCircle, Copy, CheckCircle2, Download, Trash2, Edit2, Check, X, Calendar, RefreshCw, Sparkles } from "lucide-react";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/Button";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { motion, AnimatePresence } from "motion/react";

interface SavedIdea {
  id: string;
  type: string;
  topic: string;
  title?: string;
  platform: string;
  audience: string;
  goal: string;
  result: string;
  createdAt: Timestamp | null;
  tone?: string;
  language?: string;
}

export default function SavedPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Projects states
  interface Project {
    id: string;
    name: string;
  }
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  // Modal State
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SavedIdea | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleContent, setScheduleContent] = useState("");
  const [schedulePlatform, setSchedulePlatform] = useState("Instagram Reels");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [scheduleProject, setScheduleProject] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  // Toast State
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
    setTimeout(() => {
      setToast(prev => prev.message === message ? { ...prev, isOpen: false } : prev);
    }, 4500);
  };

  useEffect(() => {
    const fetchSaved = async () => {
      if (!user) return;
      
      try {
        const q = query(
          collection(db, "saved_ideas"),
          where("userId", "==", user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const fetched: SavedIdea[] = [];
        querySnapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as SavedIdea);
        });
        
        // Sort locally to avoid needing a composite index
        fetched.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() || Date.now();
          const timeB = b.createdAt?.toMillis() || Date.now();
          return timeB - timeA;
        });

        setSavedIdeas(fetched);
      } catch (err: any) {
        console.error("Error fetching saved ideas:", err);
        setError("Failed to load saved ideas.");
      } finally {
        setLoading(false);
      }
    };

    fetchSaved();
  }, [user]);

  const handleOpenScheduleModal = async (item: SavedIdea) => {
    setSelectedItem(item);
    
    // Auto-generate title
    let defaultTitle = item.title || item.topic || "";
    if (!defaultTitle && item.result) {
      const firstLine = item.result.split('\n')[0].replace(/[#*`_]/g, '').trim();
      defaultTitle = firstLine.substring(0, 40) || (language === "Arabic" ? "منشور جديد" : "New Post");
    }
    
    setScheduleTitle(defaultTitle);
    setScheduleContent(item.result || "");
    setSchedulePlatform(item.platform || "Instagram (Reels & Posts)");
    
    const todayStr = new Date().toISOString().split('T')[0];
    setScheduleDate(todayStr);
    setScheduleTime("12:00");
    setScheduleProject("");
    setIsScheduleOpen(true);

    if (!projectsLoaded && user) {
      try {
        const qProjects = query(
          collection(db, "projects"),
          where("userId", "==", user.uid)
        );
        const projectSnapshot = await getDocs(qProjects);
        const fetchedProjects: Project[] = [];
        projectSnapshot.forEach((doc) => {
          fetchedProjects.push({ id: doc.id, name: doc.data().name } as Project);
        });
        setProjects(fetchedProjects);
        setProjectsLoaded(true);
      } catch (e) {
        console.error("Error loading projects:", e);
      }
    }
  };

  const handleConfirmSchedule = async () => {
    if (!user || !scheduleTitle || !scheduleDate) {
      showToast(language === "Arabic" ? "⚠️ يرجى ملء الحقول المطلوبة." : "⚠️ Please fill in all required fields.", "error");
      return;
    }

    setIsScheduling(true);
    try {
      const payload = {
        userId: user.uid,
        title: scheduleTitle,
        content: scheduleContent,
        platform: schedulePlatform,
        scheduledAt: scheduleDate,
        time: scheduleTime,
        projectId: scheduleProject || null,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "calendar_items"), payload);
      
      showToast(
        language === "Arabic"
          ? "🎉 تم إضافة المنشور إلى تقويم المحتوى مجدولاً بنجاح!"
          : "🎉 Post successfully scheduled and added to your content calendar!",
        "success"
      );
      
      setIsScheduleOpen(false);
    } catch (err: any) {
      console.error("Error scheduling item:", err);
      showToast(
        language === "Arabic"
          ? `❌ فشل إضافة المنشور: ${err?.message || err}`
          : `❌ Failed to schedule post: ${err?.message || err}`,
        "error"
      );
    } finally {
      setIsScheduling(false);
    }
  };

  const removeIdea = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "saved_ideas", id));
      setSavedIdeas(savedIdeas.filter(idea => idea.id !== id));
      showToast(language === "Arabic" ? "🗑️ تم حذف الفكرة من المحفوظات بنجاح!" : "🗑️ Saved idea removed successfully!", "info");
    } catch (err) {
      console.error("Failed to delete idea:", err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const saveTitle = async (id: string) => {
    if (!user || !editTitle.trim()) {
       setEditingId(null);
       return;
    }
    try {
      await updateDoc(doc(db, "saved_ideas", id), { title: editTitle.trim() });
      setSavedIdeas(savedIdeas.map(idea => idea.id === id ? { ...idea, title: editTitle.trim() } : idea));
      setEditingId(null);
      showToast(language === "Arabic" ? "✏️ تم تحديث العنوان بنجاح!" : "✏️ Title updated successfully!", "success");
    } catch (err) {
      console.error("Failed to update title:", err);
    }
  };

  const downloadAsText = (idea: SavedIdea) => {
    const blob = new Blob([idea.result], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${idea.type}-${idea.topic.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 flex flex-col min-h-[calc(100vh-8rem)]">
      <div>
        <h1 className="text-3xl font-bold font-heading mb-2">{t("Saved Ideas")}</h1>
        <p className="text-slate-400">{t("Your favorite generated content, saved for later.")}</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {!loading && savedIdeas.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-3xl">
          <Bookmark className="w-12 h-12 text-slate-500 mb-4" />
          <p className="text-lg font-medium text-slate-300">{t("No saved ideas yet")}</p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            {t("When you generate content you like, click the 'Save' button. They will appear here.")}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {savedIdeas.map((item) => (
          <div key={item.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden p-6 hover:border-white/20 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-white/10 gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold capitalize border border-purple-500/30">
                    {item.type}
                  </span>
                  
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="bg-black/50 border border-white/20 rounded px-2 py-1 outline-none text-white w-48 focus:border-purple-500 text-xs"
                        placeholder="Enter title..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle(item.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button onClick={() => saveTitle(item.id)} className="p-1 hover:text-green-400 text-slate-400" title="Save title">
                         <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 hover:text-red-400 text-slate-400" title="Cancel">
                         <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span className="text-sm text-slate-300 font-medium">
                        {item.title ? <span className="text-white font-bold">{item.title}</span> : item.topic}
                      </span>
                      <button 
                        onClick={() => {
                          setEditingId(item.id);
                          setEditTitle(item.title || item.topic);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-purple-400 transition-all font-semibold"
                        title="Edit title"
                      >
                         <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span>{t("Platform")}: <span className="text-slate-400">{t(item.platform) || item.platform}</span></span>
                  <span>{t("Goal")}: <span className="text-slate-400">{t(item.goal) || item.goal}</span></span>
                  <span>{item.createdAt ? item.createdAt.toDate().toLocaleDateString() : "Just now"}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {/* Reuse action */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const routeMap: Record<string, string> = {
                      full: "full",
                      hook: "hooks",
                      caption: "captions",
                      script: "scripts",
                      angle: "angles",
                      analyzer: "analyzer"
                    };
                    const path = routeMap[item.type] || "full";
                    navigate(`/dashboard/${path}`, { 
                      state: { 
                        reuse: {
                          topic: item.topic, 
                          platform: item.platform, 
                          audience: item.audience, 
                          goal: item.goal,
                          tone: item.tone || "",
                          language: item.language || ""
                        } 
                      } 
                    });
                  }}
                  className="h-8 gap-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 font-medium px-2 rounded-xl"
                  title={language === "Arabic" ? "إعادة استخدام الفكرة" : "Reuse Idea"}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-xs">{t("Reuse")}</span>
                </Button>

                {/* Schedule action */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenScheduleModal(item)}
                  className="h-8 gap-1.5 text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 font-medium px-2 rounded-xl"
                  title={language === "Arabic" ? "جدولة في التقويم" : "Schedule to Calendar"}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">{language === "Arabic" ? "جدولة بالتقويم" : "Schedule"}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadAsText(item)}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-white rounded-xl"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(item.result, item.id)}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-white rounded-xl"
                  title="Copy"
                >
                  {copiedId === item.id ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeIdea(item.id)}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 rounded-xl"
                  title="Remove from saved"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div 
              dir={item.result && /[\u0600-\u06FF]/.test(item.result) ? "rtl" : "ltr"}
              className="markdown-body prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 text-sm xl:text-base text-slate-300"
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
                {item.result}
              </Markdown>
            </div>
          </div>
        ))}
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

      {/* Schedule to Content Calendar Modal */}
      <AnimatePresence>
        {isScheduleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark opaque backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScheduleOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-950 border border-white/10 shadow-2xl space-y-4 text-slate-200"
            >
              {/* Header block with brand styled color line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-500" />
              
              <div className="p-6 space-y-4">
                {/* Modal Title and Description */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">
                        {language === "Arabic" ? "جدولة المحتوى في التقويم" : "Schedule to Content Calendar"}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {language === "Arabic" 
                          ? "قم بتعيين تفاصيل المنشور لحفظه في مخططك الشهري." 
                          : "Configure the posting parameters targeting your monthly plan."}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsScheduleOpen(false)}
                    className="p-1 px-1 rounded-lg hover:bg-white/5 border border-white/0 hover:border-white/5 transition-all text-slate-400 hover:text-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3.5 pt-2 text-left">
                  {/* Title Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === "Arabic" ? "العنوان / الفكرة *" : "Title / Concept *"}
                    </label>
                    <Input
                      placeholder={language === "Arabic" ? "مثال: فكرة منشور تفاعلي" : "e.g., Interactive post concept"}
                      value={scheduleTitle}
                      onChange={(e) => setScheduleTitle(e.target.value)}
                      className="bg-black/40 border-white/10 text-slate-100 text-xs h-10 px-3 rounded-xl focus:border-indigo-500"
                    />
                  </div>

                  {/* Platform Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === "Arabic" ? "المنصة المستهدفة *" : "Target Platform *"}
                    </label>
                    <Select
                      value={schedulePlatform}
                      onChange={(e: any) => setSchedulePlatform(e.target.value)}
                      className="h-10 text-xs bg-black/45 border-white/10 text-slate-255 w-full rounded-xl focus:border-indigo-500"
                    >
                      <option value="Instagram (Reels & Posts)">Instagram (Reels & Posts)</option>
                      <option value="TikTok / Douyin">TikTok / Douyin</option>
                      <option value="YouTube (Shorts & Videos)">YouTube (Shorts & Videos)</option>
                      <option value="LinkedIn (Posts & Newsletters)">LinkedIn (Posts & Newsletters)</option>
                      <option value="Twitter / X (Premium Threads)">Twitter / X (Premium Threads)</option>
                      <option value="Snapchat Spotlight">Snapchat Spotlight</option>
                      <option value="Pinterest (Idea Pins & Boards)">Pinterest (Idea Pins & Boards)</option>
                      <option value="Threads (By Meta)">Threads (By Meta)</option>
                      <option value="Facebook (Groups, Pages & Reels)">Facebook (Groups, Pages & Reels)</option>
                    </Select>
                  </div>

                  {/* Date and Time selectors in Grid */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {language === "Arabic" ? "تاريخ النشر *" : "Post Date *"}
                      </label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="flex w-full rounded-xl border border-white/15 bg-black/40 h-10 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {language === "Arabic" ? "الوقت المجدول" : "Post Time"}
                      </label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="bg-black/40 border-white/10 text-slate-100 text-xs h-10 px-3 rounded-xl focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Optional Project Assignment */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === "Arabic" ? "المشروع التابع له" : "Belongs to Project"}
                    </label>
                    <Select
                      value={scheduleProject}
                      onChange={(e: any) => setScheduleProject(e.target.value)}
                      className="h-10 text-xs bg-black/45 border-white/10 text-slate-255 w-full rounded-xl focus:border-indigo-500"
                    >
                      <option value="">{language === "Arabic" ? "علق دون حزمة مشروع" : "None / Standalone"}</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Content Preview Block */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === "Arabic" ? "مقتطف من المحتوى" : "Content Preview"}
                    </label>
                    <div className="p-3 bg-black/35 rounded-xl border border-white/5 max-h-24 overflow-y-auto text-[11px] text-slate-400 whitespace-pre-wrap leading-normal scrollbar-thin">
                      {scheduleContent}
                    </div>
                  </div>
                </div>

                {/* Form CTA Buttons */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-4 text-xs h-9.5 border-white/5 bg-white/[0.02] hover:bg-white/5 text-slate-400 hover:text-slate-100 rounded-xl"
                    onClick={() => setIsScheduleOpen(false)}
                    disabled={isScheduling}
                  >
                    {language === "Arabic" ? "إلغاء الأمر" : "Cancel"}
                  </Button>
                  <Button
                    variant="gradient"
                    size="sm"
                    className="px-5 text-xs h-9.5 font-bold rounded-xl"
                    onClick={handleConfirmSchedule}
                    disabled={isScheduling}
                  >
                    {isScheduling ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {language === "Arabic" ? "جاري الحفظ..." : "Saving..."}
                      </span>
                    ) : (
                      language === "Arabic" ? "تأكيد الجدولة 🚀" : "Schedule Post 🚀"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

