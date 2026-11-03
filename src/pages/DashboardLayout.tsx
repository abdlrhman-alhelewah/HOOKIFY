import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
  PenTool,
  Video,
  Zap,
  MessageSquare,
  LayoutTemplate,
  Settings,
  Menu,
  X,
  Save,
  Eye,
  LogOut,
  Clock,
  Shield,
  FileText,
  Calendar,
  BookOpen,
  Compass,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "motion/react";
import UpgradeModal from "@/components/UpgradeModal";

export default function DashboardLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logOut, isAdmin, isPro, setShowUpgradeModal } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user) {
    return null; // Or a loading spinner while redirecting
  }

  const navItems = [
    { name: "Performance Overview", icon: TrendingUp, path: "/dashboard/overview" },
    { name: "Competitor Intelligence", icon: Compass, path: "/dashboard/competitor-intel" },
    { name: "Swipe File", icon: BookOpen, path: "/dashboard/swipe-file" },
    { name: "Unique Angles", icon: MessageSquare, path: "/dashboard/angles" },
    { name: "Viral Hooks", icon: Zap, path: "/dashboard/hooks" },
    { name: "Storytelling Scripts", icon: Video, path: "/dashboard/scripts" },
    { name: "Engagement Captions", icon: PenTool, path: "/dashboard/captions" },
    { name: "Full Content", icon: FileText, path: "/dashboard/full" },
    { name: "Content Calendar", icon: Calendar, path: "/dashboard/calendar" },
  ];

  const secondaryNavItems = [
    { name: "History", icon: Clock, path: "/dashboard/history" },
    { name: "Saved Ideas", icon: Save, path: "/dashboard/saved" },
    { name: "Templates", icon: LayoutTemplate, path: "/dashboard/templates" },
    { name: "Settings", icon: Settings, path: "/dashboard/settings" },
  ];

  const currentPath =
    location.pathname === "/dashboard" ? "/dashboard/overview" : location.pathname;

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:rtl:translate-x-0 flex flex-col rtl:border-l rtl:border-r-0 rtl:right-0 rtl:left-auto",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-blue-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 dark:from-white dark:to-slate-400 tracking-tight">
              Hookify
            </span>
          </Link>
          <button
            className="ml-auto rtl:mr-auto rtl:ml-0 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-6">
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t("Generator")}
            </p>
            {navItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/10 text-white border border-white/10"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {t(item.name)}
                </Link>
              );
            })}
          </div>

          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t("Library")}
            </p>
            {isAdmin && (
              <Link
                to="/dashboard/admin"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  currentPath === "/dashboard/admin"
                    ? "bg-white/10 text-white border border-white/10"
                    : "text-slate-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <Shield className="w-4 h-4 text-purple-400" />
                {t("Admin Dashboard")}
              </Link>
            )}
            {secondaryNavItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/10 text-white border border-white/10"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {t(item.name)}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 space-y-4">
          {isPro ? (
            <div className="bg-gradient-to-br from-amber-500/10 to-purple-600/10 p-4 rounded-2xl border border-amber-500/30 text-xs text-center space-y-1">
              <p className="font-bold text-amber-300 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                {t("Pro Member")}
              </p>
              <p className="text-[10px] text-slate-400">
                {t("Unlimited access unlocked")}
              </p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 p-4 rounded-2xl border border-purple-500/30 text-sm">
              <p className="text-xs font-semibold text-purple-300 uppercase tracking-widest mb-1">{t("Pro Plan")}</p>
              <p className="text-slate-300 text-xs mb-3">
                {t("Unlimited generations & advanced AI tones.")}
              </p>
              <Button variant="gradient" className="w-full text-xs h-8" onClick={() => setShowUpgradeModal(true)}>
                {t("Upgrade to Pro")}
              </Button>
            </div>
          )}
          <button 
            onClick={() => logOut()}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t("Log Out")}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 lg:px-8 gap-4 bg-white/5 backdrop-blur-md">
          <div className="flex items-center">
            <button
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-md lg:hidden -ml-2 rtl:-mr-2 rtl:ml-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-right rtl:text-left">
              <p className="text-slate-400 text-xs">{t("Welcome back,")}</p>
              <p className="text-slate-100 font-medium">{user?.displayName || user?.email}</p>
            </div>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-full border border-white/10" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold">
                {(user?.displayName || user?.email || "U")[0].toUpperCase()}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-transparent p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
      <UpgradeModal />
    </div>
  );
}
