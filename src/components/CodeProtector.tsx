import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function CodeProtector() {
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  
  const isAr = language === "Arabic";
  const userEmail = user?.email?.toLowerCase() || "";
  const isOwner = userEmail === "abdlrhmanmahmoud69@gmail.com";

  useEffect(() => {
    // If the user logging in is the primary developer/owner, disable restriction
    if (isOwner) return;

    const blockEvent = (e: Event, type: "rightclick" | "devtools" | "select") => {
      e.preventDefault();
      
      let msg = "";
      if (type === "rightclick") {
        msg = isAr 
          ? "⚠️ حماية الملكية الفكرية نشطة | المطور يمنع نقرات الفأرة اليمنى لحماية الأكواد والبرمجة!" 
          : "⚠️ Intellectual Property Active | Right-click is locked to protect application assets!";
      } else if (type === "devtools") {
        msg = isAr
          ? "🚫 محاولة فحص الأكواد | تم رصد اختصار المطورين وحظر استخراج السورس كود!"
          : "🚫 Security Alert | Developer options and source code inspection are disabled!";
      } else if (type === "select") {
        return; // Silent block for drag select
      }

      setWarningMessage(msg);
      // Auto dismiss after 2.5 seconds
      const timeout = setTimeout(() => {
        setWarningMessage(null);
      }, 2500);
      
      return () => clearTimeout(timeout);
    };

    // 1. Block right-click
    const handleContextMenu = (e: MouseEvent) => {
      blockEvent(e, "rightclick");
    };

    // 2. We permit all text copy events for social content generation and sharing!
    const handleCopy = (e: ClipboardEvent) => {
      // Allowed: Users must be able to copy their generated posts, scripts, hooks, and captions freely!
    };

    // 3. Block devtools combinations (F12, Command+Option+I, Control+Shift+I, U, S, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.userAgent.toLowerCase().includes("mac");
      
      // F12
      if (e.key === "F12" || e.keyCode === 123) {
        blockEvent(e, "devtools");
        return;
      }

      // Ctrl+Shift+I / Cmd+Option+I (Inspect)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.keyCode === 73)) {
        blockEvent(e, "devtools");
        return;
      }

      // Ctrl+Shift+J / Cmd+Option+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "J" || e.key === "j" || e.keyCode === 74)) {
        blockEvent(e, "devtools");
        return;
      }

      // Ctrl+Shift+C / Cmd+Option+C (Inspect Element cursor)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "C" || e.key === "c" || e.keyCode === 67)) {
        blockEvent(e, "devtools");
        return;
      }

      // Ctrl+U / Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === "U" || e.key === "u" || e.keyCode === 85)) {
        blockEvent(e, "devtools");
        return;
      }

      // Ctrl+S / Cmd+S (Save Page)
      if ((e.ctrlKey || e.metaKey) && (e.key === "S" || e.key === "s" || e.keyCode === 83)) {
        blockEvent(e, "devtools");
        return;
      }
    };

    // Add listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOwner, isAr]);

  return (
    <AnimatePresence>
      {warningMessage && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] w-full max-w-md px-4"
        >
          <div className="bg-slate-950/80 border border-red-500/30 backdrop-blur-md p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-start">
            <div className="p-2 bg-red-500/10 rounded-xl text-red-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-400">
                {isAr ? "دفاع التطبيق نشط" : "Application Security Alert"}
              </p>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                {warningMessage}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
