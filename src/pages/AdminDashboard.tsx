import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { 
  Shield, 
  Users, 
  Activity, 
  Clock, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  UserPlus, 
  X, 
  RefreshCw, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  FileText, 
  LayoutDashboard, 
  Database,
  Lock,
  ArrowRight
} from "lucide-react";
import { Navigate } from "react-router-dom";
import Markdown from "react-markdown";

interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
  lastLoginAt: any;
  generationCount?: number;
}

interface Generation {
  id: string;
  userId: string;
  type: string;
  topic: string;
  audience?: string;
  goal?: string;
  tone?: string;
  platform?: string;
  result?: string;
  createdAt: any;
}

interface ActivityLog {
  id: string;
  userId: string;
  email?: string;
  type: string;
  error?: string;
  topic?: string;
  timestamp: any;
  action?: string;
  instruction?: string;
}

interface AccessRequest {
  email: string;
  displayName: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: any;
  photoURL?: string;
  uid?: string;
}

interface ApprovedUser {
  email: string;
  approvedAt: any;
  approvedBy?: string;
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const { t, language } = useLanguage();
  
  const isAr = language === "Arabic";
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "content" | "logs">("overview");

  // Core collections data
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);

  // Search & Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLogsFilter, setSelectedLogsFilter] = useState("all");
  const [selectedContentFilter, setSelectedContentFilter] = useState("all");

  // Whitelist admin input
  const [manualEmail, setManualEmail] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Loading & status states
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchErrors, setFetchErrors] = useState<string[]>([]);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  
  // Selected detail drawers
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);

  // Safe Timestamp parser to avoid crashing if format is mock/Date/string
  const safeToMillis = (timestampField: any): number => {
    if (!timestampField) return 0;
    if (typeof timestampField.toMillis === "function") {
      try {
        return timestampField.toMillis() || 0;
      } catch (e) {
        console.warn("toMillis parsing failed, fallback direct key read", e);
      }
    }
    if (timestampField instanceof Date) {
      return timestampField.getTime();
    }
    if (typeof timestampField === "number") {
      return timestampField;
    }
    if (typeof timestampField === "string") {
      const parsed = Date.parse(timestampField);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (timestampField.seconds !== undefined) {
      return (timestampField.seconds * 1000) + Math.floor((timestampField.nanoseconds || 0) / 1000000);
    }
    return 0;
  };

  // Safe localize timestamp formatting
  const formatTimestamp = (timestampField: any): string => {
    const millis = safeToMillis(timestampField);
    if (millis === 0) return isAr ? "غير متوفر" : "N/A";
    return new Date(millis).toLocaleString(isAr ? "ar-EG" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  // Comprehensive parallel data fetcher
  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsRefreshing(true);
    setFetchErrors([]);
    setActionSuccess(null);

    try {
      // Parallel getDocs to avoid absolute stalling if one collection misses rules or indices
      const [
        usersSnap,
        gensSnap,
        logsSnap,
        reqsSnap,
        approvedSnap
      ] = await Promise.allSettled([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "generations")),
        getDocs(collection(db, "activity_logs")),
        getDocs(collection(db, "access_requests")),
        getDocs(collection(db, "approved_users"))
      ]);

      let usersData: AppUser[] = [];
      let gensData: Generation[] = [];
      let logsData: ActivityLog[] = [];
      let reqsData: AccessRequest[] = [];
      let approvedData: ApprovedUser[] = [];
      const errorsList: string[] = [];

      // Parse Users
      if (usersSnap.status === "fulfilled") {
        usersData = usersSnap.value.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as AppUser);
      } else {
        console.error("Users retrieval failed:", usersSnap.reason);
        errorsList.push(isAr ? "فشل تحميل قائمة المستخدمين (تأكد من الصلاحيات)." : "Failed to load Users collection.");
      }

      // Parse Generations
      if (gensSnap.status === "fulfilled") {
        gensData = gensSnap.value.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Generation);
      } else {
        console.error("Generations retrieval failed:", gensSnap.reason);
        errorsList.push(isAr ? "فشل تحميل منشورات التوليد." : "Failed to load Generations.");
      }

      // Parse Activity Logs
      if (logsSnap.status === "fulfilled") {
        logsData = logsSnap.value.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ActivityLog);
      } else {
        console.error("Activity Logs retrieval failed:", logsSnap.reason);
        errorsList.push(isAr ? "فشل تحميل سجل النشاطات العام." : "Failed to load Activity logs.");
      }

      // Parse Access Requests
      if (reqsSnap.status === "fulfilled") {
        reqsData = reqsSnap.value.docs.map(doc => ({ email: doc.id, ...doc.data() }) as AccessRequest);
      } else {
        console.error("Access Requests retrieval failed:", reqsSnap.reason);
      }

      // Parse Approved Whitelist Users
      if (approvedSnap.status === "fulfilled") {
        approvedData = approvedSnap.value.docs.map(doc => ({ email: doc.id, ...doc.data() }) as ApprovedUser);
      } else {
        console.error("Approved list retrieval failed:", approvedSnap.reason);
      }

      // Calculate generation counts map for users
      const usersWithCounts = usersData.map(u => ({
        ...u,
        generationCount: gensData.filter(g => g.userId === u.uid).length
      }));

      // Set sorted states safely using safeToMillis
      setAppUsers(usersWithCounts.sort((a, b) => (b.generationCount || 0) - (a.generationCount || 0)));
      setGenerations(gensData.sort((a, b) => safeToMillis(b.createdAt) - safeToMillis(a.createdAt)));
      setActivityLogs(logsData.sort((a, b) => safeToMillis(b.timestamp) - safeToMillis(a.timestamp)));
      setAccessRequests(reqsData.sort((a, b) => safeToMillis(b.requestedAt) - safeToMillis(a.requestedAt)));
      setApprovedUsers(approvedData);

      if (errorsList.length > 0) {
        setFetchErrors(errorsList);
      }
    } catch (err: any) {
      console.error("Critical error inside dashboard fetcher:", err);
      setFetchErrors([err?.message || (isAr ? "حدث خطأ غير متوقع أثناء تجميع البيانات." : "An unexpected synchronization error occurred.")]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin]);

  // Approved whitelisting operation
  const handleApprove = async (reqEmail: string) => {
    if (!reqEmail) return;
    const cleanEmail = reqEmail.trim().toLowerCase();
    try {
      setActionLoading(cleanEmail);
      setActionSuccess(null);
      
      await setDoc(doc(db, "approved_users", cleanEmail), {
        email: cleanEmail,
        approvedAt: serverTimestamp(),
        approvedBy: user?.email || "abdlrhmanmahmoud69@gmail.com"
      });

      await setDoc(doc(db, "access_requests", cleanEmail), {
        status: "approved"
      }, { merge: true });

      setActionSuccess(isAr ? `تم تصريح البريد الإلكتروني ${cleanEmail} بنجاح` : `Approved ${cleanEmail} successfully!`);
      // Instant reload access requests locally
      fetchData(true);
    } catch (err) {
      console.error("Approval action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Rejection whitelisting operation
  const handleDecline = async (reqEmail: string) => {
    if (!reqEmail) return;
    const cleanEmail = reqEmail.trim().toLowerCase();
    try {
      setActionLoading(cleanEmail);
      setActionSuccess(null);

      await deleteDoc(doc(db, "approved_users", cleanEmail));
      await setDoc(doc(db, "access_requests", cleanEmail), {
        status: "rejected"
      }, { merge: true });

      setActionSuccess(isAr ? `تم رفض طلب البريد ${cleanEmail}` : `Declined access for ${cleanEmail}.`);
      fetchData(true);
    } catch (err) {
      console.error("Decline action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Whitelist manual administrator append
  const handleManualWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail || !manualEmail.includes("@")) return;
    const cleanEmail = manualEmail.trim().toLowerCase();
    try {
      setActionLoading("manual");
      setActionSuccess(null);

      await setDoc(doc(db, "approved_users", cleanEmail), {
        email: cleanEmail,
        approvedAt: serverTimestamp(),
        approvedBy: user?.email || "abdlrhmanmahmoud69@gmail.com"
      });

      await setDoc(doc(db, "access_requests", cleanEmail), {
        email: cleanEmail,
        displayName: isAr ? "مضاف يدوياً" : "Manually Whitelisted",
        status: "approved",
        requestedAt: serverTimestamp()
      }, { merge: true });

      setManualEmail("");
      setActionSuccess(isAr ? `تمت إضافة ${cleanEmail} للقائمة البيضاء` : `Manually Whitelisted ${cleanEmail}!`);
      fetchData(true);
    } catch (err) {
      console.error("Manual whitelisting failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Revoke approved whitelisted active user
  const handleRevoke = async (approvedEmail: string) => {
    if (!approvedEmail) return;
    const cleanEmail = approvedEmail.trim().toLowerCase();
    try {
      setActionLoading(cleanEmail);
      setActionSuccess(null);
      await deleteDoc(doc(db, "approved_users", cleanEmail));
      await setDoc(doc(db, "access_requests", cleanEmail), {
        status: "rejected"
      }, { merge: true });

      setActionSuccess(isAr ? `تم إلغاء ترخيص الحساب ${cleanEmail}` : `Revoked whitelist credentials for ${cleanEmail}`);
      fetchData(true);
    } catch (err) {
      console.error("Revoke operation failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Redirect if not highly authenticated administrator
  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  // Analytics Computation Variables (Calculated dynamically)
  const totalUsers = appUsers.length;
  const totalGens = generations.length;
  const totalLogs = activityLogs.length;

  const logsErrors = activityLogs.filter(l => l.type === "generation_error" || l.type?.includes("error"));
  const loginsToday = activityLogs.filter(l => {
    const time = safeToMillis(l.timestamp);
    return l.type === "session_start" && time > Date.now() - 24 * 60 * 60 * 1000;
  });

  const activeTodayCount = appUsers.filter(u => {
    const lastLogin = safeToMillis(u.lastLoginAt);
    return lastLogin > Date.now() - 24 * 60 * 60 * 1000;
  }).length;

  // Compute breakdown of types
  const typeFrequencies = generations.reduce((acc, g) => {
    const t = g.type || (isAr ? "آخر" : "other");
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Compute breakdown of tones
  const toneFrequencies = generations.reduce((acc, g) => {
    const t = g.tone || (isAr ? "عام" : "General");
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Search filter matching
  const filteredUsers = appUsers.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGenerations = generations.filter(g => {
    const userEmail = appUsers.find(u => u.uid === g.userId)?.email || "Unknown";
    const matchesSearch = 
      g.topic?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      g.result?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedContentFilter === "all" || g.type === selectedContentFilter;
    return matchesSearch && matchesType;
  });

  const filteredLogs = activityLogs.filter(l => {
    const userEmail = l.email || appUsers.find(u => u.uid === l.userId)?.email || "Unknown";
    const logType = l.type || l.action || "system_action";
    const matchesSearch = 
      userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      logType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.error && l.error.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.topic && l.topic.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedLogsFilter === "all" || l.type === selectedLogsFilter || l.action === selectedLogsFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 flex flex-col min-h-[calc(100vh-8rem)] text-slate-100 p-4 sm:p-6" dir={isAr ? "rtl" : "ltr"}>
      
      {/* Dynamic Diagnostic & Notification Header Block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
        <div className="flex items-center gap-4 text-start">
          <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-white">
              {isAr ? "إدارة وتتبع استهلاك النظام" : "Telemetry & Admin Dashboard"}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              {isAr ? "إحصائيات فورية، فحص الأخطاء، وإدارة القائمة البيضاء" : "Live system performance logs, whitelist management & API diagnostics."}
            </p>
          </div>
        </div>

        {/* Dynamic Diagnostics badging */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isAr ? "قاعدة البيانات: متصلة" : "Firestore: Online"}</span>
          </div>

          <button
            onClick={() => fetchData()}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-950 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 text-xs font-bold"
            title={isAr ? "تحديث كلي" : "Synchronize Database"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-purple-400" : ""}`} />
            <span>{isAr ? "تحديث فوري" : "Sync Now"}</span>
          </button>
        </div>
      </div>

      {/* Fetch Warnings/Error Messages Display */}
      {fetchErrors.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl p-4 flex gap-3 text-start text-xs items-start">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">{isAr ? "تنبيهات الاتصال بقاعدة البيانات:" : "Database Connection Warnings:"}</p>
            <ul className="list-disc list-inside space-y-1 pr-2">
              {fetchErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Access Action Success banner */}
      {actionSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl p-4 text-xs font-bold text-start flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="p-1 hover:bg-white/5 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center gap-4 bg-slate-950/40 rounded-3xl border border-white/5">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
          <p className="text-slate-400 text-xs font-medium">{isAr ? "جاري تجميع بيانات ومؤشرات التتبع الفورية..." : "Populating active tracking matrices..."}</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Main Visual KPIs Bento Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-slate-900/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-3 text-start transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 font-mono text-8xl pointer-events-none group-hover:scale-110 transition-transform">U</div>
              <div className="flex items-center gap-3 text-slate-400">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider">{isAr ? "المستخدمين" : "Active Users"}</span>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-white">{totalUsers}</p>
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {activeTodayCount} {isAr ? "نشط اليوم" : "active in last 24h"}
                </p>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-3 text-start transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 font-mono text-8xl pointer-events-none group-hover:scale-110 transition-transform">G</div>
              <div className="flex items-center gap-3 text-slate-400">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider">{isAr ? "عمليات التوليد" : "Total Generations"}</span>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-white">{totalGens}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isAr ? "مستوى نشاط صحي" : "Healthy engine activities"}
                </p>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-3 text-start transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 font-mono text-8xl pointer-events-none group-hover:scale-110 transition-transform">E</div>
              <div className="flex items-center gap-3 text-slate-400">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span className="text-xs font-bold uppercase tracking-wider">{isAr ? "الأخطاء المسجلة" : "Logged Errors"}</span>
              </div>
              <div>
                <p className={`text-3xl sm:text-4xl font-black ${logsErrors.length > 0 ? "text-red-400" : "text-white"}`}>{logsErrors.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isAr ? "أخطاء اتصال أو تجاوز حدود" : "API limits or connection slips"}
                </p>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-3 text-start transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 font-mono text-8xl pointer-events-none group-hover:scale-110 transition-transform">L</div>
              <div className="flex items-center gap-3 text-slate-400">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">{isAr ? "الدخول اليوم" : "Today's Logins"}</span>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-white">{loginsToday.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isAr ? "جلسات دخول نشطة" : "Successful authentication events"}
                </p>
              </div>
            </div>

          </div>

          {/* Interactive Custom Tabs Navigation Control */}
          <div className="flex items-center overflow-x-auto gap-2 border-b border-white/5 pb-2 scrollbar-none">
            <button
              onClick={() => { setActiveTab("overview"); setSearchQuery(""); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "overview" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 font-extrabold" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{isAr ? "نظرة عامة وإحصائيات" : "Statistics Summary"}</span>
            </button>

            <button
              onClick={() => { setActiveTab("users"); setSearchQuery(""); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "users" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 font-extrabold" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isAr ? "المستخدمين النشطين" : "User Directories"}</span>
              {appUsers.length > 0 && <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] text-slate-300">{appUsers.length}</span>}
            </button>

            <button
              onClick={() => { setActiveTab("content"); setSearchQuery(""); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "content" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 font-extrabold" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isAr ? "المحتوى المولد" : "Generations History"}</span>
              {generations.length > 0 && <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] text-slate-300">{generations.length}</span>}
            </button>

            <button
              onClick={() => { setActiveTab("logs"); setSearchQuery(""); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "logs" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 font-extrabold" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isAr ? "سجل نظام التتبع الفوري" : "Live Tracking Logs"}</span>
              {activityLogs.length > 0 && <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] text-slate-300">{activityLogs.length}</span>}
            </button>
          </div>

          {/* TAB 1: OVERVIEW AND SYSTEM STATS */}
          {activeTab === "overview" && (
            <div className="space-y-6">

              {/* Dynamic Empty State Warning when nobody has triggered log counts */}
              {totalUsers === 0 && totalGens === 0 && (
                <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-8 py-10 text-center space-y-4">
                  <div className="text-purple-400 mx-auto flex justify-center">
                    <Database className="w-12 h-12" />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <h3 className="text-base font-bold text-white">{isAr ? "قاعدة البيانات فارغة تماماً" : "Your telemetry metrics database is empty!"}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      {isAr ? "يحدث هذا عادة عندما تكون هذه هي المرة الأولى لفتح التطبيق، ولم يقم أي مستخدم بتوليد مقالات بعد أو تشغيل حدث نظام. بمجرد قيامك بالتوليد في صفحة المحتوى، ستظهر المؤشرات هنا فوراً." : "This is completely expected when starting fresh. Since no user interactions or contents have been logged onto Firestore yet, there are temporary zero benchmarks. Try generating a social media post in Content Generator to seed events!"}
                    </p>
                  </div>
                </div>
              )}

              {/* Graphical breakdowns and Whitelists layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Interactive Breakdown charts */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 rounded-3xl p-6 text-start space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{isAr ? "توزيع أنماط المحتوى الأكثر طلباً" : "Most Demanded Formats Breakdown"}</h3>
                    <p className="text-slate-500 text-xs">{isAr ? "نسبة التوليد الفعلية للمقالات، السيناريوهات والمقترحات" : "Relative percentage computed from live user content generations"}</p>
                  </div>

                  <div className="space-y-4">
                    {Object.keys(typeFrequencies).length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs italic">{isAr ? "لا يوجد بيانات منشورات بعد." : "No generation format data captured yet."}</div>
                    ) : (
                      Object.entries(typeFrequencies).map(([type, count]) => {
                        const percent = ((count / totalGens) * 100).toFixed(1);
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-300 capitalize">{type}</span>
                              <span className="text-slate-400 font-bold">{count} {isAr ? "مرات" : "gens"} ({percent}%)</span>
                            </div>
                            <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${percent}%` }}
                                className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Right side: tones */}
                  <div className="border-t border-white/5 pt-5 space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isAr ? "نبرة الصوت والصياغة الغالبة" : "Dominant Writing Tones"}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(toneFrequencies).length === 0 ? (
                        <p className="text-slate-600 text-xs italic">{isAr ? "لا توجد مؤشرات بعد." : "No tone indicators mapped."}</p>
                      ) : (
                        Object.entries(toneFrequencies).map(([tone, count]) => (
                          <span key={tone} className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs text-slate-300 font-medium">
                            {tone} <strong className="text-purple-400 ml-1">{count}</strong>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Urgent whitelist guest administrator access requests */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 text-start space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">{isAr ? "طلبات تصريح الدخول العاجلة" : "Authorization Control"}</h4>
                      <p className="text-[10px] text-slate-400">{isAr ? "إدارة وتصريح دخول العملاء والضيوف للتطبيق" : "Administer guest login invitations"}</p>
                    </div>
                  </div>

                  {/* Add guest whitelist directly */}
                  <form onSubmit={handleManualWhitelist} className="bg-black/30 border border-white/5 rounded-2xl p-3 space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{isAr ? "إضافة فورية للقائمة البيضاء" : "Quick Whitelist Add"}</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        placeholder="guest@example.com"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        className="flex-1 bg-slate-950/45 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
                      />
                      <button
                        type="submit"
                        disabled={actionLoading === "manual"}
                        className="px-3 bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isAr ? "ترخيص" : "Grant"}
                      </button>
                    </div>
                  </form>

                  {/* Pending collection list */}
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {accessRequests.filter(req => req.status === "pending").length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500 italic">
                        {isAr ? "لا توجد طلبات تصريح معلقة حالياً." : "All pending authorizations processed."}
                      </div>
                    ) : (
                      accessRequests
                        .filter(req => req.status === "pending")
                        .map((req) => (
                          <div key={req.email} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center justify-between gap-3 text-start">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate">{req.displayName || "Unknown Guest"}</p>
                              <p className="text-[10px] text-slate-400 truncate">{req.email}</p>
                              <p className="text-[9px] text-slate-600 font-mono mt-0.5">
                                {formatTimestamp(req.requestedAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                disabled={actionLoading !== null}
                                onClick={() => handleApprove(req.email)}
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 cursor-pointer disabled:opacity-50"
                                title={isAr ? "موافقة وتصريح" : "Approve access"}
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                disabled={actionLoading !== null}
                                onClick={() => handleDecline(req.email)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 cursor-pointer disabled:opacity-50"
                                title={isAr ? "رفض ومنع" : "Decline request"}
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

              </div>

              {/* Secondary Whitelisted lists panel */}
              <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 text-start">
                <div className="border-b border-white/5 pb-4 mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{isAr ? "أعضاء القائمة البيضاء النشطين" : "Active Whitelisted Clients"}</h3>
                    <p className="text-[10px] text-slate-400">{isAr ? "حسابات الضيوف والعملاء الذين يمتلكون حقاً حصرياً لاستخدام الخدمة" : "Clients currently approved on authorization filters"}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 font-black rounded text-[10px]">{approvedUsers.length} {isAr ? "مؤهل" : "members"}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-h-[180px] overflow-y-auto pr-1">
                  {approvedUsers.map((approved) => {
                    const isSuperUser = approved.email === "abdlrhmanmahmoud69@gmail.com";
                    return (
                      <div key={approved.email} className="bg-black/25 border border-white/5 p-3 rounded-2xl flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-200 truncate">{approved.email}</p>
                          <p className={`text-[9px] font-mono mt-0.5 font-black ${isSuperUser ? "text-purple-400" : "text-slate-500"}`}>
                            {isSuperUser ? (isAr ? "مالك التطبيق الأساسي" : "PRIMARY OWNER") : (isAr ? "ضيف معتمد" : "APPROVED GUEST")}
                          </p>
                        </div>
                        {!isSuperUser && (
                          <button
                            type="button"
                            disabled={actionLoading !== null}
                            onClick={() => handleRevoke(approved.email)}
                            className="text-[9px] text-red-400 hover:bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isAr ? "حذف" : "Revoke"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ACTIVE USERS TABLE */}
          {activeTab === "users" && (
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden text-start">
              
              {/* Table search controls */}
              <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.01]">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{isAr ? "قائمة بيانات المستخدمين الكلية" : "Registered Users Telemetry"}</h3>
                  <p className="text-xs text-slate-400">{isAr ? "ابحث عن الحساب أو البريد الإلكتروني لمشاهدة تفاصيل الاستهلاك" : "Select any client record to explore their session histories and generated texts."}</p>
                </div>
                
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 rtl:left-auto rtl:right-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder={isAr ? "ابحث بالبريد أو الاسم..." : "Search accounts..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/45 border border-white/10 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>

              {/* Users table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-300">
                  <thead className="text-[11px] text-slate-400 uppercase bg-black/30 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 text-start font-bold">{isAr ? "اسم العميل" : "DisplayName"}</th>
                      <th className="px-6 py-4 text-start font-bold">{isAr ? "البريد الإلكتروني" : "Email address"}</th>
                      <th className="px-6 py-4 text-center font-bold">{isAr ? "المقالات المكتوبة" : "Generations"}</th>
                      <th className="px-6 py-4 text-start font-bold">{isAr ? "آخر محاولة دخول" : "Last seen"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-xs italic">
                          {isAr ? "لا توجد حسابات مطابقة لبحثك." : "No accounts match the search term."}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr 
                          key={u.uid} 
                          onClick={() => setSelectedUser(u)} 
                          className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 font-bold text-white truncate max-w-[180px]">
                            {u.displayName || (isAr ? "مستخدم جديد" : "New member")}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">{u.email}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-extrabold min-w-[2rem] border border-purple-500/20">
                              {u.generationCount ?? 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {formatTimestamp(u.lastLoginAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GENERATIONS HISTORY TABLE */}
          {activeTab === "content" && (
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden text-start">
              
              {/* Search and filters row */}
              <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.01]">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{isAr ? "أرشيف المحتوى المولد الكلي" : "Global Generated Content Archive"}</h3>
                  <p className="text-xs text-slate-400">{isAr ? "ابحث في الكلمات المفتاحية للمنشورات وفلتر حسب نوع المنشور" : "Review output drafts generated server-side using Gemini 3.5."}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  {/* Select filter format type */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <select
                      value={selectedContentFilter}
                      onChange={(e) => setSelectedContentFilter(e.target.value)}
                      className="bg-slate-950/45 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="all">{isAr ? "جميع الصيغ" : "All Formats"}</option>
                      <option value="post">{isAr ? "منشور شبكة" : "Social Post"}</option>
                      <option value="thread">{isAr ? "سلسلة تدوينات" : "Thread"}</option>
                      <option value="ideas">{isAr ? "أفكار محتوى" : "Content Ideas"}</option>
                      <option value="bio">{isAr ? "مقتطف تعريفي" : "Bio"}</option>
                      <option value="script">{isAr ? "سيناريو فيديو" : "Video Script"}</option>
                    </select>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 rtl:left-auto rtl:right-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder={isAr ? "ابحث بالموضوع أو المحتوى..." : "Search topics or drafts..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:w-64 bg-slate-950/45 border border-white/10 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Table list */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-300">
                  <thead className="text-[11px] text-slate-400 uppercase bg-black/30 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 text-start font-bold">{isAr ? "التوقيت" : "Timestamp"}</th>
                      <th className="px-6 py-4 text-start font-bold">{isAr ? "بريد العميل" : "User Email"}</th>
                      <th className="px-6 py-4 text-start font-bold">{isAr ? "النمط" : "Format Type"}</th>
                      <th className="px-6 py-4 text-start font-bold">{isAr ? "الموضوع المستهدف" : "Target Topic"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredGenerations.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-xs italic">
                          {isAr ? "لا توجد توليدات مطابقة للبحث حالياً." : "No generation history records match filters."}
                        </td>
                      </tr>
                    ) : (
                      filteredGenerations.map((g) => {
                        const userMail = appUsers.find(u => u.uid === g.userId)?.email || (isAr ? "عميل غير معروف" : "Unknown User");
                        return (
                          <tr 
                            key={g.id} 
                            onClick={() => setSelectedGeneration(g)} 
                            className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                              {formatTimestamp(g.createdAt)}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs">{userMail}</td>
                            <td className="px-6 py-4 text-xs">
                              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 font-semibold text-slate-300 capitalize">
                                {g.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 truncate max-w-[240px] font-medium text-slate-200" title={g.topic}>
                              {g.topic}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM LOGS TABLE */}
          {activeTab === "logs" && (
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden text-start">
              
              {/* Logs Search row */}
              <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.01]">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{isAr ? "سجل التتبع وتدقيق النشاطات العام" : "Audit Logs & System Telemetry"}</h3>
                  <p className="text-xs text-slate-400">{isAr ? "شاهد محاولات الدخول، استجابات الذكاء الاصطناعي، وأخطاء طلبات الـ API" : "Live debug tracking logs mapped natively during client journeys."}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <select
                      value={selectedLogsFilter}
                      onChange={(e) => setSelectedLogsFilter(e.target.value)}
                      className="bg-slate-950/45 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="all">{isAr ? "جميع الأحداث" : "All Event Types"}</option>
                      <option value="session_start">{isAr ? "بدء جلسة دخول" : "session_start"}</option>
                      <option value="session_end">{isAr ? "إنهاء الجلسة" : "session_end"}</option>
                      <option value="generation_success">{isAr ? "توليد محتوى ناجح" : "generation_success"}</option>
                      <option value="competitor_analysis">{isAr ? "تحليل المنافسين" : "competitor_analysis"}</option>
                      <option value="generation_error">{isAr ? "خطأ توليد محتوى" : "generation_error"}</option>
                      <option value="refine_content">{isAr ? "تحسين وتعديل" : "refine_content"}</option>
                    </select>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 rtl:left-auto rtl:right-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder={isAr ? "ابحث عن خطأ أو بريد الكتروني..." : "Filter logs..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:w-64 bg-slate-950/45 border border-white/10 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Logs elements rendering */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-300">
                  <thead className="text-[11px] text-slate-400 uppercase bg-black/30 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 text-start font-bold">{isAr ? "توقيت الحدث" : "Time"}</th>
                      <th className="px-6 py-4 text-start font-bold">{isAr ? "نوع الإجراء" : "Event Type"}</th>
                      <th className="px-6 py-4 text-start font-bold">{isAr ? "المستخدم المسؤول" : "User Subject"}</th>
                      <th className="px-6 py-4 text-start font-bold">{isAr ? "تفاصيل وسجلات الخطأ التشخيصية" : "Operational Info Details"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-xs italic">
                          {isAr ? "سجل نظام التتبع فارغ تماماً حالياً." : "No system logs match active filters."}
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((l) => {
                        const email = l.email || appUsers.find(u => u.uid === l.userId)?.email || (isAr ? "عميل غير متوفر" : "Unknown");
                        const currentLogType = l.type || l.action || "system_action";
                        const isError = currentLogType === "generation_error" || l.error;
                        return (
                          <tr key={l.id} className={`hover:bg-white/[0.01] transition-colors ${isError ? "bg-red-500/[0.01]" : ""}`}>
                            <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap font-mono">
                              {formatTimestamp(l.timestamp)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs">
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${
                                currentLogType === 'session_start' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                currentLogType === 'session_end' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                currentLogType === 'generation_error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                currentLogType === 'generation_success' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                currentLogType === 'competitor_analysis' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                currentLogType === 'refine_content' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' :
                                'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {currentLogType}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold">{email}</td>
                            <td className="px-6 py-4 text-xs text-start">
                              {l.error ? (
                                <div className="text-red-400 font-mono bg-red-950/25 border border-red-900/20 p-2.5 rounded-xl break-words whitespace-pre-wrap max-w-sm sm:max-w-md leading-relaxed text-[11px]" dir="auto">
                                  {l.error}
                                </div>
                              ) : l.action === "refine_content" ? (
                                <span className="text-purple-400 font-medium">
                                  {isAr ? `تعديل ذكي: "${l.instruction}"` : `Refine modifier: "${l.instruction}"`}
                                </span>
                              ) : (
                                <span className="text-slate-400 truncate max-w-xs block" title={l.topic || "-"}>
                                  {l.topic || "-"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: PRECISE GENERATED CONTENT DETAILS DRAWERS */}
      {selectedGeneration && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-start shadow-2xl animate-in zoom-in duration-150">
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <span>{isAr ? "تفاصيل المسودة المولدة" : "Generation Draft Details"}</span>
              </h3>
              <button 
                onClick={() => setSelectedGeneration(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white/[0.01] rounded-2xl border border-white/5">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black">{isAr ? "توقيت الكتابة" : "Created At"}</p>
                  <p className="font-semibold text-slate-100 text-xs mt-1">{formatTimestamp(selectedGeneration.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black">{isAr ? "نوع القالب" : "Type Format"}</p>
                  <p className="font-semibold text-slate-100 text-xs mt-1 capitalize">{selectedGeneration.type}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black">{isAr ? "الجمهور المستهدف" : "Target Audience"}</p>
                  <p className="font-semibold text-slate-100 text-xs mt-1 truncate">{selectedGeneration.audience || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black">{isAr ? "الهدف أو السياق" : "Strategic Goal"}</p>
                  <p className="font-semibold text-slate-100 text-xs mt-1 truncate">{selectedGeneration.goal || "-"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-slate-500 uppercase font-black">{isAr ? "الموضوع والكلمات المفتاحية" : "Targeted Topic Statement"}</p>
                <p className="font-bold text-slate-100 text-sm bg-black/40 p-3 rounded-xl border border-white/5">{selectedGeneration.topic}</p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] text-slate-500 uppercase font-black">{isAr ? "نص المسودة المنتجة (Bi-Directional)" : "Resulting Generation Snippet"}</p>
                <div 
                  dir={selectedGeneration.result && /[\u0600-\u06FF]/.test(selectedGeneration.result) ? "rtl" : "ltr"}
                  className="p-5 bg-black/60 border border-white/5 rounded-2xl text-slate-200 leading-relaxed text-sm overflow-x-auto markdown-body prose prose-invert max-w-none"
                >
                  <Markdown
                    components={{
                      p: ({ children }) => <p className="leading-relaxed my-3">{children}</p>,
                      h1: ({ children }) => <h1 className="font-bold mt-6 mb-4 text-xl border-b border-white/5 pb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="font-bold mt-5 mb-3 text-lg">{children}</h2>,
                      h3: ({ children }) => <h3 className="font-bold mt-4 mb-2">{children}</h3>,
                      h4: ({ children }) => <h4 className="font-bold mt-3 mb-1">{children}</h4>,
                      li: ({ children }) => <li className="my-1">{children}</li>,
                      ul: ({ children }) => <ul className="list-disc pl-5 rtl:pl-0 rtl:pr-5 my-3 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 rtl:pl-0 rtl:pr-5 my-3 space-y-1">{children}</ol>,
                    }}
                  >
                    {selectedGeneration.result || ""}
                  </Markdown>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: USER ACCOUNT SPECIFIC DRILLDOWNS AND LOGGING */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-start shadow-2xl animate-in zoom-in duration-150">
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>{isAr ? `تتبع نشاط العميل: ${selectedUser.displayName || 'جديد'}` : `Account Tracking Details: ${selectedUser.email}`}</span>
              </h3>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* User overview matrices */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-start">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{isAr ? "تاريخ الانضمام" : "First login date"}</p>
                  <p className="font-bold text-slate-100 text-xs sm:text-sm mt-1">{formatTimestamp(selectedUser.createdAt)}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-start">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{isAr ? "آخر تواجد" : "Last synchronized state"}</p>
                  <p className="font-bold text-slate-100 text-xs sm:text-sm mt-1">{formatTimestamp(selectedUser.lastLoginAt)}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-start">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{isAr ? "إجمالي المنشورات" : "Accumulated Drafts"}</p>
                  <p className="font-bold text-purple-400 text-lg mt-1">{selectedUser.generationCount ?? 0}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-start">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{isAr ? "أخطاء التوليد للعميل" : "Failures encountered"}</p>
                  <p className="font-bold text-red-400 text-lg mt-1">
                    {activityLogs.filter(l => l.userId === selectedUser.uid && (l.type === "generation_error" || l.error)).length}
                  </p>
                </div>
              </div>

              {/* Generations by this user */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span>{isAr ? "تاريخ المنشورات المولدة لهذا العميل" : "Generated outputs statement history"}</span>
                </h4>

                <div className="bg-black/35 rounded-2xl border border-white/5 overflow-hidden">
                  <div className="max-h-[160px] overflow-y-auto">
                    <table className="w-full text-xs text-slate-300">
                      <thead className="bg-white/[0.02] text-slate-400 border-b border-white/5 text-[10px]">
                        <tr>
                          <th className="px-4 py-2.5 text-start">Time</th>
                          <th className="px-4 py-2.5 text-start">Format Pattern</th>
                          <th className="px-4 py-2.5 text-start">Topic Segment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {generations.filter(g => g.userId === selectedUser.uid).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-slate-600 italic">
                              {isAr ? "لم يقم هذا العميل بأي تجميعات إنتاج بعد." : "No generated drafts created by this client."}
                            </td>
                          </tr>
                        ) : (
                          generations
                            .filter(g => g.userId === selectedUser.uid)
                            .map(g => (
                              <tr 
                                key={g.id} 
                                onClick={() => { setSelectedGeneration(g); setSelectedUser(null); }} 
                                className="hover:bg-white/5 cursor-pointer"
                              >
                                <td className="px-4 py-2.5 whitespace-nowrap text-slate-400 font-mono">{formatTimestamp(g.createdAt)}</td>
                                <td className="px-4 py-2.5 capitalize">{g.type}</td>
                                <td className="px-4 py-2.5 truncate max-w-xs text-slate-200">{g.topic}</td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Specific activity logs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? "جلسات وولوج العميل التشغيلية وباقة الأخطاء" : "Active session start/end and failure logs"}</span>
                </h4>

                <div className="bg-black/35 rounded-2xl border border-white/5 overflow-hidden">
                  <div className="max-h-[160px] overflow-y-auto">
                    <table className="w-full text-xs text-slate-300 animate-fade-in">
                      <thead className="bg-white/[0.02] text-slate-400 border-b border-white/5 text-[10px]">
                        <tr>
                          <th className="px-4 py-2.5 text-start">Time</th>
                          <th className="px-4 py-2.5 text-start">Logs Code Action</th>
                          <th className="px-4 py-2.5 text-start font-bold">Diagnostics Parameters Info</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {activityLogs.filter(l => l.userId === selectedUser.uid).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-slate-600 italic">
                              {isAr ? "لا توجد سجلات تتبع أو أخطاء مخصصة." : "Zero logged errors or sessions captured for this client."}
                            </td>
                          </tr>
                        ) : (
                          activityLogs
                            .filter(l => l.userId === selectedUser.uid)
                            .map(l => {
                              const isErr = l.type === "generation_error" || l.error;
                              return (
                                <tr key={l.id} className={isErr ? "bg-red-500/[0.01]" : ""}>
                                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-400 text-[10px]">{formatTimestamp(l.timestamp)}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                      l.type === 'session_start' ? 'bg-emerald-500/10 text-emerald-400' :
                                      l.type === 'session_end' ? 'bg-amber-500/10 text-amber-400' :
                                      'bg-red-500/10 text-red-400'
                                    }`}>
                                      {l.type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-400 max-w-xs truncate text-[10px]">
                                    {l.error ? <span className="text-red-400 font-bold">{l.error}</span> : (l.topic || l.instruction || "-")}
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
