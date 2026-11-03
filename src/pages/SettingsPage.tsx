import { useState, useEffect } from "react";
import {
  Settings,
  Bell,
  Shield,
  Globe,
  LogOut,
  Moon,
  Sun,
  User,
  FolderOpen,
  Sparkles,
  Trash2,
  Plus,
  Target,
  CheckCircle,
  HelpCircle,
  Loader2,
  X,
  AlertCircle,
  Check,
  CreditCard,
  Award,
  ShieldCheck,
  TrendingUp,
  Gift
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface BrandProfile {
  id: string;
  name: string;
  tone: string;
  audience: string;
  keywords: string;
  forbiddenWords: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
}

export default function SettingsPage() {
  const { user, logOut, isPro, setIsPro, setShowUpgradeModal } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  const [activeSubTab, setActiveSubTab] = useState<"general" | "subscription" | "brands" | "projects">("general");

  // Inline Subscription controls states
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  
  // Profile settings
  const [notifications, setNotifications] = useState(true);
  const [marketing, setMarketing] = useState(false);

  // Firestore collections states
  const [brandProfiles, setBrandProfiles] = useState<BrandProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);

  // Forms states
  const [brandName, setBrandName] = useState("");
  const [brandTone, setBrandTone] = useState("Curiosity, Hook-Driven & Mysterious");
  const [brandAudience, setBrandAudience] = useState("General Public (Broad mass appeal)");
  const [customBrandTone, setCustomBrandTone] = useState("");
  const [customBrandAudience, setCustomBrandAudience] = useState("");
  const [brandKeywords, setBrandKeywords] = useState("");
  const [brandForbidden, setBrandForbidden] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [savingProject, setSavingProject] = useState(false);

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
    setTimeout(() => {
      setToast(prev => prev.message === message ? { ...prev, isOpen: false } : prev);
    }, 4500);
  };

  // Fetch Brand Profiles and Projects
  useEffect(() => {
    const fetchDatabaseSettings = async () => {
      if (!user) return;
      setLoadingDb(true);
      try {
        // 1. Fetch Brand Profiles
        const qBrands = query(
          collection(db, "brand_profiles"),
          where("userId", "==", user.uid)
        );
        const snapshotBrands = await getDocs(qBrands);
        const fetchedBrands: BrandProfile[] = [];
        snapshotBrands.forEach((doc) => {
          fetchedBrands.push({ id: doc.id, ...doc.data() } as BrandProfile);
        });
        setBrandProfiles(fetchedBrands);

        // 2. Fetch Projects
        const qProjects = query(
          collection(db, "projects"),
          where("userId", "==", user.uid)
        );
        const snapshotProjects = await getDocs(qProjects);
        const fetchedProjects: Project[] = [];
        snapshotProjects.forEach((doc) => {
          fetchedProjects.push({ id: doc.id, ...doc.data() } as Project);
        });
        setProjects(fetchedProjects);
      } catch (err) {
        console.error("Error loading settings databases:", err);
      } finally {
        setLoadingDb(false);
      }
    };

    fetchDatabaseSettings();
  }, [user]);

  // Handle addition of a Brand Voice Profile
  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !brandName.trim()) return;
    setSavingBrand(true);

    try {
      const finalTone = brandTone === "Custom" ? (customBrandTone || "Natural") : brandTone;
      const finalAudience = brandAudience === "Custom" ? (customBrandAudience || "General Audience") : brandAudience;
      const payload = {
        userId: user.uid,
        name: brandName,
        tone: finalTone,
        audience: finalAudience,
        keywords: brandKeywords,
        forbiddenWords: brandForbidden,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "brand_profiles"), payload);
      setBrandProfiles(prev => [...prev, { id: docRef.id, ...payload }]);
      
      // Clear inputs
      setBrandName("");
      setBrandKeywords("");
      setBrandForbidden("");
      setCustomBrandTone("");
      setCustomBrandAudience("");
      showToast(language === "Arabic" ? "✅ تم إضافة هوية العلامة التجارية بنجاح!" : "✅ Brand Voice Profile created successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(language === "Arabic" ? "❌ فشل إضافة الهوية التجارية" : "❌ Failed to create brand profile", "error");
    } finally {
      setSavingBrand(false);
    }
  };

  // Handle deletion of a Brand Voice Profile
  const handleDeleteBrand = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: language === "Arabic" ? "حذف الهوية التجارية" : "Delete Brand Profile",
      message: language === "Arabic" ? "هل أنت متأكد من حذف هذه الهوية؟" : "Are you sure you want to delete this profile?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "brand_profiles", id));
          setBrandProfiles(prev => prev.filter(b => b.id !== id));
          showToast(language === "Arabic" ? "✅ تم حذف الهوية التجارية بنجاح!" : "✅ Brand profile deleted successfully!", "success");
        } catch (err) {
          console.error(err);
          showToast(language === "Arabic" ? "❌ فشل الحذف" : "❌ Delete failed", "error");
        }
      }
    });
  };

  // Handle addition of a Project Folder
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectName.trim()) return;
    setSavingProject(true);

    try {
      const payload = {
        userId: user.uid,
        name: projectName,
        description: projectDesc,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "projects"), payload);
      setProjects(prev => [...prev, { id: docRef.id, ...payload }]);
      
      setProjectName("");
      setProjectDesc("");
      showToast(language === "Arabic" ? "✅ تم إنشاء المشروع الجديد بنجاح!" : "✅ Project folder created successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(language === "Arabic" ? "❌ فشل إنشاء المشروع" : "❌ Failed to create project", "error");
    } finally {
      setSavingProject(false);
    }
  };

  // Handle deletion of a Project
  const handleDeleteProject = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: language === "Arabic" ? "حذف المشروع" : "Delete Project",
      message: language === "Arabic" 
        ? "هل أنت متأكد من حذف هذا المشروع؟ سيتم إلغاء ربط المنشورات المرتبطة به تلقائياً." 
        : "Are you sure you want to delete this project? Scheduled posts will remain untouched, but ungrouped.",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "projects", id));
          setProjects(prev => prev.filter(p => p.id !== id));
          showToast(language === "Arabic" ? "✅ تم حذف المشروع بنجاح!" : "✅ Project deleted successfully!", "success");
        } catch (err) {
          console.error(err);
          showToast(language === "Arabic" ? "❌ فشل حذف المشروع" : "❌ Delete project failed", "error");
        }
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-heading mb-2 text-slate-100">{t("Settings")}</h1>
        <p className="text-slate-400">
          {language === "Arabic" 
            ? "تحكّم في إعدادات التطبيق، هوياتك التجارية المتعددة، ومشاريعك المنظمة لعام 2026."
            : "Manage your default platform configs, multiple brand profiles, and folder-level projects."}
        </p>
      </div>

      {/* Tabs list inside Settings page */}
      <div className="flex flex-wrap md:flex-nowrap border-b border-white/10 p-1 bg-slate-950/40 rounded-2xl max-w-xl gap-1">
        <button
          onClick={() => setActiveSubTab("general")}
          className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === "general"
              ? "bg-purple-600/20 text-purple-300 border border-purple-500/10 shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {language === "Arabic" ? "إعدادات عامة" : "General Preferences"}
        </button>
        <button
          onClick={() => setActiveSubTab("subscription")}
          className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === "subscription"
              ? "bg-purple-600/20 text-purple-300 border border-purple-500/10 shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-purple-400" />
          {language === "Arabic" ? "الاشتراك والترقية" : "Subscription"}
        </button>
        <button
          onClick={() => setActiveSubTab("brands")}
          className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === "brands"
              ? "bg-purple-600/20 text-purple-300 border border-purple-500/10 shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {language === "Arabic" ? "الهويات التجارية" : "Brand Voices"}
        </button>
        <button
          onClick={() => setActiveSubTab("projects")}
          className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === "projects"
              ? "bg-purple-600/20 text-purple-300 border border-purple-500/10 shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          {language === "Arabic" ? "المشاريع" : "Projects"}
        </button>
      </div>

      <div className="space-y-6">
        {/* TAB 1: GENERAL CONTROLS */}
        {activeSubTab === "general" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Account Settings */}
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden p-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" /> {t("Account")}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400">{t("Email Address")}</label>
                  <div className="text-slate-100 mt-1 bg-black/20 p-3 rounded-xl border border-white/5 font-medium">
                    {user?.email || t("Not signed in")}
                  </div>
                </div>
                <Button variant="outline" className="w-full sm:w-auto mt-2" onClick={logOut}>
                  <LogOut className="w-4 h-4 mr-2" /> {t("Sign Out")}
                </Button>
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden p-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-400" /> {t("Preferences")}
              </h2>
              
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-slate-100 font-medium">{t("Default Language")}</h4>
                    <p className="text-sm text-slate-400">{t("Choose the default language for the app interface.")}</p>
                  </div>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="bg-black/40 border border-white/10 rounded-lg text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="English">English</option>
                    <option value="Arabic">العربية</option>
                  </select>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer" onClick={toggleTheme}>
                  <div>
                    <h4 className="text-slate-100 font-medium flex items-center gap-2">
                      {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
                      {theme === 'dark' ? t("Theme (Dark)") : t("Theme (Light)")}
                    </h4>
                    <p className="text-sm text-slate-400">{t("Toggle between dark and light mode.")}</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-purple-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${theme === 'dark' ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden p-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-400" /> {t("Notifications")}
              </h2>
              
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer" onClick={() => setNotifications(!notifications)}>
                  <div>
                    <h4 className="text-slate-100 font-medium">{t("Product Updates")}</h4>
                    <p className="text-sm text-slate-400">{t("Get notified about new templates and features.")}</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${notifications ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifications ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer" onClick={() => setMarketing(!marketing)}>
                  <div>
                    <h4 className="text-slate-100 font-medium">{t("Marketing Emails")}</h4>
                    <p className="text-sm text-slate-400">{t("Receive tips and social media growth strategies.")}</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${marketing ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${marketing ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1.5: BILLING & SUBSCRIPTION CONTROLS */}
        {activeSubTab === "subscription" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Subscription status banner card */}
            <div className={`border rounded-3xl overflow-hidden relative p-8 ${
              isPro 
                ? "bg-gradient-to-br from-purple-950/45 via-slate-900/90 to-purple-950/45 border-purple-500/40 shadow-xl shadow-purple-500/5" 
                : "bg-white/5 border-white/10"
            }`}>
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                {isPro ? <Award className="w-40 h-40 text-purple-400" /> : <ShieldCheck className="w-40 h-40 text-slate-400" />}
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    {language === "Arabic" ? "الحالة الحالية للباقة" : "Current Account State"}
                  </div>
                  
                  <h3 className="text-2xl font-black text-white font-heading">
                    {isPro 
                      ? (language === "Arabic" ? "أنت تشغل باقة الاحتراف الكاملة! 🎉" : "You are a Hookify Pro Member! 🎉")
                      : (language === "Arabic" ? "أنت مسجل في الباقة المجانية 🌿" : "You are on the Free Tier 🌿")
                    }
                  </h3>
                  
                  <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
                    {isPro
                      ? (language === "Arabic" 
                          ? "تم تفعيل صلاحيات الكتابة السحرية اللامحدودة لحسابك. استمتع بتصدير 30 يوما من المحتوى وفحص الفجوات التنافسية الذكي بدون أي قيود استخدام خطية." 
                          : "Enjoy absolute unlimited generations, priority server speeds, unlimited brand voices, and expert copywriting widgets with no usage limits!")
                      : (language === "Arabic" 
                          ? "خطتك الحالية محدودة بـ 5 عمليات توليد يومية تشمل القوالب البسيطة فقط وتتجدد تلقائيا كل 24 ساعة." 
                          : "Your active tier allows up to 5 simple generations slot per day, with standard speed and default template tones. Upgrade below to lift all boundaries.")
                    }
                  </p>
                </div>

                <div className="shrink-0 flex flex-col sm:flex-row gap-3">
                  {isPro ? (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: language === "Arabic" ? "تأكيد إلغاء الاشتراك وتخفيض الحساب" : "Are you sure you want to cancel?",
                          message: language === "Arabic" 
                            ? "هل أنت متأكد من رغبتك في إلغاء الباقة الاحترافية؟ ستخسر على الفور ميزة الكتابة اللامحدودة وفحص المنافسين."
                            : "Are you sure you want to cancel your Hookify Pro subscription? You will lose access to premium templates and unlimited outputs immediately.",
                          onConfirm: async () => {
                            setIsCancelLoading(true);
                            try {
                              await new Promise((resolve) => setTimeout(resolve, 1500));
                              const userRef = doc(db, "users", user!.uid);
                              await setDoc(userRef, { isPro: false }, { merge: true });
                              setIsPro(false);
                              showToast(
                                language === "Arabic" 
                                  ? "✅ تم إلغاء خطة Pro والرجوع للباقة المجانية." 
                                  : "✅ Pro subscription canceled. Downgraded.", 
                                "success"
                              );
                            } catch (e: any) {
                              console.error(e);
                              showToast(t("Error") || "Error", "error");
                            } finally {
                              setIsCancelLoading(false);
                            }
                          }
                        });
                      }}
                      className="text-red-400 border-red-500/25 hover:bg-red-500/10 hover:text-red-300 px-6 h-11 text-xs"
                      disabled={isCancelLoading}
                    >
                      {isCancelLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {language === "Arabic" ? "جاري الإلغاء..." : "Canceling..."}
                        </>
                      ) : (
                        language === "Arabic" ? "إلغاء الاشتراك النشط" : "Cancel Live Subscription"
                      )}
                    </Button>
                  ) : (
                    <Button 
                      variant="gradient" 
                      onClick={() => setShowUpgradeModal(true)}
                      className="px-8 h-11 text-xs font-bold shadow-lg shadow-purple-500/15 animate-pulse"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5 inline font-bold text-slate-100" />
                      {language === "Arabic" ? "رقّ حسابك لـ Pro الآن ⚡" : "Upgrade to Pro Now ⚡"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Pro Feature Highlights checklist */}
              <div className="mt-8 border-t border-white/5 pt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { 
                    labelEn: "Unlimited Generations", 
                    labelAr: "توليد محتوى غير محدود", 
                    descEn: "No daily refresh limitations", 
                    descAr: "كتابة وتعديل بلا حدود يومية" 
                  },
                  { 
                    labelEn: "Competitor Audits", 
                    labelAr: "تحليل وتجسس المنافسين", 
                    descEn: "Unlock gap-finding matrix", 
                    descAr: "رسم خريطة الثغرات للانتشار" 
                  },
                  { 
                    labelEn: "Premium Dialects", 
                    labelAr: "اللهجات الخليجية والمحلية", 
                    descEn: "Arabic tuned filters", 
                    descAr: "خطافات مخصصة للهجات العربية" 
                  },
                  { 
                    labelEn: "Full 30-Day Export", 
                    labelAr: "تصدير تقاويم 30 يوماً", 
                    descEn: "Direct scheduling sync", 
                    descAr: "تصدير فوري لجداول النشر" 
                  }
                ].map((item, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="p-1 rounded-lg bg-purple-500/10 text-purple-300 shrink-0 h-7 w-7 flex items-center justify-center border border-purple-500/10">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{language === "Arabic" ? item.labelAr : item.labelEn}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{language === "Arabic" ? item.descAr : item.descEn}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inline Promotion/Coupon Unlocker */}
            {!isPro && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-400" />
                  {language === "Arabic" ? "تفعيل اشتراك عبر كود ترويجي / قسيمة خصم" : "Redeem Gift Card / Promo Key"}
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  {language === "Arabic" 
                    ? "هل تمتلك كود دعوة ذهبي أو قسيمة اشتراك؟ أدخله هنا لتفعيل صلاحيات Pro فوراً ومجاناً."
                    : "Have an invite ticket or promotional gold key? Enter it below to unlock lifetime access instantly."}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                  <div className="grow space-y-1">
                    <Input 
                      placeholder={language === "Arabic" ? "أدخل الكود: مثلاً FREEPRO" : "e.g., FREEPRO"}
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoError("");
                      }}
                      className="bg-black/40 border-white/10 uppercase font-mono text-xs h-10 text-slate-100"
                    />
                    {promoError && (
                      <p className="text-[10px] text-red-400 leading-normal font-sans pl-1">{promoError}</p>
                    )}
                  </div>
                  
                  <Button
                    onClick={async () => {
                      const cleaned = promoCode.trim().toUpperCase();
                      if (!cleaned) return;
                      setIsApplyingPromo(true);
                      setPromoError("");

                      try {
                        await new Promise((resolve) => setTimeout(resolve, 1400));
                        if (cleaned === "FREEPRO" || cleaned === "AI2026" || cleaned === "HOOKNOW" || cleaned === "PRO50") {
                          const userRef = doc(db, "users", user!.uid);
                          await setDoc(userRef, { isPro: true }, { merge: true });
                          setIsPro(true);
                          setPromoCode("");
                          showToast(
                            language === "Arabic" 
                              ? "🎉 مبروك! تم تفعيل الاشتراك المدفوع مجاناً!" 
                              : "🎉 Coupon accepted! Pro access unlocked.", 
                            "success"
                          );
                        } else {
                          setPromoError(
                            language === "Arabic" 
                              ? "عذراً، هذا الكود غير موجود أو منتهي الصلاحية." 
                              : "Invalid coupon code or ticket expired."
                          );
                        }
                      } catch (err) {
                        console.error(err);
                        setPromoError(language === "Arabic" ? "حدث خطأ أثناء الفحص." : "Verification error.");
                      } finally {
                        setIsApplyingPromo(false);
                      }
                    }}
                    variant="outline"
                    className="h-10 text-xs px-5 border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10"
                    disabled={isApplyingPromo || !promoCode.trim()}
                  >
                    {isApplyingPromo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      language === "Arabic" ? "تفعيل الكود" : "Apply Voucher"
                    )}
                  </Button>
                </div>
                <p className="text-[10.5px] text-purple-400/80 mt-2 font-mono">
                  {language === "Arabic" ? "💡 تلميح للتجربة: اكتب الكود FREEPRO" : "💡 Test Tip: enter FREEPRO as custom redeem key!"}
                </p>
              </div>
            )}

            {/* Simulated Billing History / Invoice Staging Table */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                {language === "Arabic" ? "سجل المدفوعات والاشتراكات" : "Billing History & Invoices"}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                {language === "Arabic" 
                  ? "قائمة بالعمليات المالية السابقة المسجلة لبيئة الدفع السريع والافتراضي لعام 2026."
                  : "List of your previous billing cycles and transactions inside Hookify Sandbox."}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400">
                      <th className="py-2.5 font-semibold">{language === "Arabic" ? "المعرف" : "Transaction ID"}</th>
                      <th className="py-2.5 font-semibold">{language === "Arabic" ? "التاريخ" : "Billing Date"}</th>
                      <th className="py-2.5 font-semibold">{language === "Arabic" ? "الباقة" : "Subscription Plan"}</th>
                      <th className="py-2.5 font-semibold">{language === "Arabic" ? "المبلغ" : "Charged Amount"}</th>
                      <th className="py-2.5 font-semibold">{language === "Arabic" ? "الحالة" : "Invoice Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {isPro ? (
                      <tr>
                        <td className="py-3 font-mono text-[11px] text-purple-400/90">TXN-49032-2026</td>
                        <td className="py-3 font-mono">2026-06-15</td>
                        <td className="py-3 font-medium">Hookify Pro Premium</td>
                        <td className="py-3 font-semibold text-emerald-400">$19.00</td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-300 border border-green-500/15">
                            {language === "Arabic" ? "مدفوع (مكتمل)" : "Paid (Staging)"}
                          </span>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td className="py-3 font-mono text-[11px] text-slate-500">TXN-00000-FREE</td>
                        <td className="py-3 font-mono">2026-06-15</td>
                        <td className="py-3 font-medium">Free Subscription</td>
                        <td className="py-3 text-slate-400">$0.00</td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/15">
                            {language === "Arabic" ? "نشط مجاناً" : "Active Free"}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BRAND VOICE PROFILES */}
        {activeSubTab === "brands" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Create Brand Profile Form */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                {language === "Arabic" ? "إنشاء بروفايل هوية تجارية (Brand Voice)" : "Create Brand Voice Profile"}
              </h2>
              <p className="text-xs text-slate-400 mb-5">
                {language === "Arabic"
                  ? "حدد النبرة، الكلمات المستهدفة والممنوعة، وسيبدأ الذكاء الاصطناعي بتوليد كل المحتوى ليتطابق تمامًا مع هوية علامتك التجارية."
                  : "Specify tone, target audience, and forbidden keywords. AI will auto-inject these configurations into all generations."}
              </p>

              <form onSubmit={handleAddBrand} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === "Arabic" ? "اسم الهوية" : "Profile Name"}</label>
                    <Input 
                      placeholder={language === "Arabic" ? "مثال: حساب التيك توك الشخصي، عيادة د.أحمد..." : "e.g., Luxury Fashion Real..."}
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      required
                      className="bg-black/30 border-white/10 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === "Arabic" ? "النبرة الافتراضية" : "Default Tone"}</label>
                    <select
                      value={brandTone}
                      onChange={(e) => setBrandTone(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 h-10 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="Curiosity, Hook-Driven & Mysterious">{language === "Arabic" ? "إثارة الفضول والغموض المبني على الخطاف" : "Curiosity, Hook-Driven & Mysterious"}</option>
                      <option value="Bold, Piercing & Direct">{language === "Arabic" ? "صريح وجريء ومباشر جداً" : "Bold, Piercing & Direct"}</option>
                      <option value="Sarcastic, Witty & Pop-Culture Savvy">{language === "Arabic" ? "ساخر، فطن ومواكب للترند العام" : "Sarcastic, Witty & Pop-Culture Savvy"}</option>
                      <option value="Educational, Authoritative & Grounded">{language === "Arabic" ? "تعليمي رصين وموثق بسلطة علمية" : "Educational, Authoritative & Grounded"}</option>
                      <option value="Inspiring, Story-Led & Heroic">{language === "Arabic" ? "ملهم، مبني على سرد القصص وبطولي" : "Inspiring, Story-Led & Heroic"}</option>
                      <option value="Warm, Friendly & Empathetic">{language === "Arabic" ? "دافئ ودود ومتعاطف إنسانياً" : "Warm, Friendly & Empathetic"}</option>
                      <option value="FOMO, Urgent & Scarcity-Focused">{language === "Arabic" ? "الحرص على عدم التفويت المستعجل والنادر" : "FOMO, Urgent & Scarcity-Focused"}</option>
                      <option value="Technical, Analytical & Data-Proven">{language === "Arabic" ? "تقني تحليلي قائم على لغة الأرقام والمصادر" : "Technical, Analytical & Data-Proven"}</option>
                      <option value="Custom">{language === "Arabic" ? "مخصص..." : "Custom (Write own / مخصص)"}</option>
                    </select>
                    {brandTone === "Custom" && (
                      <div className="mt-2 text-sm animate-in slide-in-from-top-1 duration-200">
                        <Input 
                          placeholder={language === "Arabic" ? "مثال: مضحك بلهجة مصرية ساخرة" : "e.g., Sarcastic but friendly"} 
                          value={customBrandTone}
                          onChange={(e) => setCustomBrandTone(e.target.value)}
                          className="h-10 text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === "Arabic" ? "الجمهور المستهدف" : "Target Audience"}</label>
                    <select
                      value={brandAudience}
                      onChange={(e) => setBrandAudience(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 h-10 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="General Public (Broad mass appeal)">{language === "Arabic" ? "الجمهور العام (جاذبية جماهيرية واسعة)" : "General Public (Broad mass appeal)"}</option>
                      <option value="Gen Z (Short-attention, hyper-digital)">{language === "Arabic" ? "الجيل زي (مهتمون بالرقميات السريعة)" : "Gen Z (Short-attention, hyper-digital)"}</option>
                      <option value="Gen Alpha (Early adopters, gaming cohorts)">{language === "Arabic" ? "الجيل ألفا (أولاد التقنيات والألعاب)" : "Gen Alpha (Early adopters, gaming cohorts)"}</option>
                      <option value="Millennials (Value-driven, tech-literate)">{language === "Arabic" ? "جيل الألفية (مبني على القيم والتكنولوجيا)" : "Millennials (Value-driven, tech-literate)"}</option>
                      <option value="High-Ticket B2B (CEOs, Founders, Buyers)">{language === "Arabic" ? "أصحاب الشركات ومتخذي القرار (B2B / رواد أعمال)" : "High-Ticket B2B (CEOs, Founders, Buyers)"}</option>
                      <option value="Creatives & Content Creators (Influencers, Editors)">{language === "Arabic" ? "المعدين وصناع المحتوى" : "Creatives & Content Creators (Influencers, Editors)"}</option>
                      <option value="Tech/AI Professionals & Developers">{language === "Arabic" ? "متخصصي التكنولوجيا والذكاء الاصطناعي والمبرمجين" : "Tech/AI Professionals & Developers"}</option>
                      <option value="Fitness, Wellness & Health Seekers">{language === "Arabic" ? "المهتمين باللياقة البدينة، الصحة وجودة الحياة" : "Fitness, Wellness & Health Seekers"}</option>
                      <option value="E-commerce Sellers & Retailers">{language === "Arabic" ? "تجار التجزئة ورواد التجارة الإلكترونية" : "E-commerce Sellers & Retailers"}</option>
                      <option value="College Students & Fresh Graduates">{language === "Arabic" ? "طلاب الجامعات والخريجين الجدد" : "College Students & Fresh Graduates"}</option>
                      <option value="Custom">{language === "Arabic" ? "مخصص..." : "Custom (Write own / مخصص)"}</option>
                    </select>
                    {brandAudience === "Custom" && (
                      <div className="mt-2 text-sm animate-in slide-in-from-top-1 duration-200">
                        <Input 
                          placeholder={language === "Arabic" ? "اكتب الجمهور المخصص..." : "e.g., Real estate buyers in Cairo"} 
                          value={customBrandAudience}
                          onChange={(e) => setCustomBrandAudience(e.target.value)}
                          className="h-10 text-xs"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === "Arabic" ? "الكلمات المفتاحية المطلوبة (مفصولة بفاصلة)" : "Keywords to Focus (Comma separated)"}</label>
                    <Input 
                      placeholder={language === "Arabic" ? "عقارات، التجمع، فاخر، استثمار..." : "e.g., AI, scaling, remote..."}
                      value={brandKeywords}
                      onChange={(e) => setBrandKeywords(e.target.value)}
                      className="bg-black/30 border-white/10 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === "Arabic" ? "الكلمات الممنوعة لمنع توليدها (مفصولة بفاصلة)" : "Forbidden Keywords / Words to avoid"}</label>
                  <Input 
                    placeholder={language === "Arabic" ? "رخيص، مجاني، مضمون 100٪، كليك بيت..." : "e.g., cheap, free, clickbait..."}
                    value={brandForbidden}
                    onChange={(e) => setBrandForbidden(e.target.value)}
                    className="bg-black/30 border-white/10 text-xs"
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="gradient" 
                  className="w-full h-11 text-xs"
                  disabled={savingBrand || !brandName.trim()}
                >
                  {savingBrand ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === "Arabic" ? "حفظ ملف الهوية التجارية" : "Add Brand Voice Profile")}
                </Button>
              </form>
            </div>

            {/* List existing brands */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{language === "Arabic" ? "ملفاتك التجارية المؤرشفة" : "Your Brand Profiles"}</h3>
              {loadingDb ? (
                <div className="text-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
                </div>
              ) : brandProfiles.length === 0 ? (
                <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-3xl text-xs text-slate-500">
                  {language === "Arabic" ? "لا توجد هوية تجارية مخزنة بعد تتبع هويتك." : "No brand voice profiles found. Create your first profile above."}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {brandProfiles.map((brand) => (
                    <div key={brand.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-200 text-sm">{brand.name}</h4>
                          <button 
                            onClick={() => handleDeleteBrand(brand.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[11px] space-y-1 text-slate-400 mt-2">
                          <p><strong>{language === "Arabic" ? "النبرة:" : "Tone:"}</strong> {brand.tone}</p>
                          <p><strong>{language === "Arabic" ? "الجمهور:" : "Audience:"}</strong> {brand.audience}</p>
                          {brand.keywords && <p className="truncate"><strong>{language === "Arabic" ? "الكلمات:" : "Keywords:"}</strong> {brand.keywords}</p>}
                          {brand.forbiddenWords && <p className="truncate text-red-400/80"><strong>{language === "Arabic" ? "الكلمات الممنوعة:" : "Forbidden:"}</strong> {brand.forbiddenWords}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PROJECT ORGANIZER */}
        {activeSubTab === "projects" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Create Project Folders */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-2 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-purple-400" />
                {language === "Arabic" ? "إنشاء مجلد مشروع جديد" : "Create Organizing Project"}
              </h2>
              <p className="text-xs text-slate-400 mb-5">
                {language === "Arabic"
                  ? "قم بتقسيم منشوراتك وأفكارك على هيئة مشاريع منفصلة (مثلاً حملة عميل معين، أو منصة مخصصة) لتسهيل الفرز والفلترة."
                  : "Organize histories, schedules, and generated text into distinct client folders or project campaigns."}
              </p>

              <form onSubmit={handleAddProject} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === "Arabic" ? "اسم المشروع" : "Project Name"}</label>
                  <Input 
                    placeholder={language === "Arabic" ? "مثال: مشروع مبيعات رمضان، عميل دبي للعقارات..." : "e.g., Client Alpha Campaign..."}
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    className="bg-black/30 border-white/10 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === "Arabic" ? "وصف مختصر للمشروع" : "Brief Description"}</label>
                  <Input 
                    placeholder={language === "Arabic" ? "مثال: منشورات تويتر للحملة الرمضانية لعام 2026..." : "e.g., Content calendar & writes for client..."}
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    className="bg-black/30 border-white/10 text-xs"
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="gradient" 
                  className="w-full h-11 text-xs"
                  disabled={savingProject || !projectName.trim()}
                >
                  {savingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === "Arabic" ? "إنشاء المجلد والمشروع" : "Create Project Folder")}
                </Button>
              </form>
            </div>

            {/* List Existing Projects */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{language === "Arabic" ? "قائمة مجلدات المشاريع النشطة" : "Active Project Folders"}</h3>
              {loadingDb ? (
                <div className="text-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
                </div>
              ) : projects.length === 0 ? (
                <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-3xl text-xs text-slate-500">
                  {language === "Arabic" ? "لم تنشئ مشاريع بعد لتنظيم ملفاتك." : "No projects created yet. Start organizing your client calendars."}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projects.map((proj) => (
                    <div key={proj.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-purple-400" />
                            <h4 className="font-bold text-slate-200 text-sm truncate">{proj.name}</h4>
                          </div>
                          <button 
                            onClick={() => handleDeleteProject(proj.id)}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {proj.description && (
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-2 pl-6 rtl:pl-0 rtl:pr-6">
                            {proj.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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
