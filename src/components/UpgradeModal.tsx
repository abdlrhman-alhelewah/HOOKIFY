import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  X, 
  Check, 
  CreditCard, 
  Tag, 
  ShieldCheck, 
  Loader2, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function UpgradeModal() {
  const { user, isPro, setIsPro, showUpgradeModal, setShowUpgradeModal } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "Arabic";

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [couponCode, setCouponCode] = useState("");
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0); // value in percentage
  
  // Simulated Card State
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVC, setCardCVC] = useState("");
  const [cardName, setCardName] = useState("");

  // Payment progress steps
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [cardError, setCardError] = useState("");

  const steps = [
    { 
      titleEn: "Securing Connection...", 
      titleAr: "جاري تأمين اتصال مشفر...", 
      descEn: "Initializing private payment transmission layer...", 
      descAr: "بدء تشفير تداول البيانات على المنفذ المحمي 443..." 
    },
    { 
      titleEn: "Contacting Card Bank...", 
      titleAr: "جاري تأكيد رصيد البطاقة...", 
      descEn: "Requesting auth token from premium gateway channel...", 
      descAr: "مخاطبة المصرف الاستثماري للتحقق من هوية وحساب الدفع السريع..." 
    },
    { 
      titleEn: "Upgrading Permissions...", 
      titleAr: "ترقية صلاحيات حسابك...", 
      descEn: "Persisting Pro entitlement credentials in Cloud Firestore...", 
      descAr: "كتابة الرمز المميز للاشتراك في قاعدة بيانات الغيمة الذكية..." 
    },
    { 
      titleEn: "Wrapping Up...", 
      titleAr: "تهيئة بيئة العمل اللامحدودة...", 
      descEn: "Unlocking advanced viral analytics and unlimited generation slots...", 
      descAr: "تفعيل فلاتر فحص المنافسين وتجاوز حدود الاستخدام اليومية..." 
    }
  ];

  useEffect(() => {
    if (paymentStatus === "processing") {
      let currentStep = 0;
      const interval = setInterval(() => {
        if (currentStep < steps.length - 1) {
          currentStep += 1;
          setActiveStepIndex(currentStep);
        } else {
          clearInterval(interval);
          completeUpgrade();
        }
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [paymentStatus]);

  if (!showUpgradeModal) return null;

  const basePrice = billingCycle === "monthly" ? 19 : 149;
  const discountAmount = Math.round((basePrice * promoDiscount) / 100);
  const finalPrice = Math.max(0, basePrice - discountAmount);

  const handleApplyCoupon = () => {
    setPromoError("");
    const cleaned = couponCode.trim().toUpperCase();
    if (!cleaned) return;

    if (cleaned === "FREEPRO" || cleaned === "AI2026" || cleaned === "HOOKNOW") {
      setIsCouponApplied(true);
      setPromoDiscount(100);
    } else if (cleaned === "PRO50") {
      setIsCouponApplied(true);
      setPromoDiscount(50);
    } else {
      setPromoError(isAr ? "كود الترويج هذا غير صحيح أو انتهت صلاحيته" : "Invalid coupon or expired code");
      setIsCouponApplied(false);
      setPromoDiscount(0);
    }
  };

  const handleCardNumberChange = (val: string) => {
    // Only allow digits and format with spaces every 4 digits
    const digits = val.replace(/\D/g, "");
    const truncated = digits.slice(0, 16);
    const matches = truncated.match(/\d{1,4}/g);
    setCardNumber(matches ? matches.join(" ") : truncated);
  };

  const handleExpiryChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    const truncated = digits.slice(0, 4);
    if (truncated.length >= 2) {
      setCardExpiry(`${truncated.slice(0, 2)}/${truncated.slice(2)}`);
    } else {
      setCardExpiry(truncated);
    }
  };

  const handleCVCChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setCardCVC(digits.slice(0, 4));
  };

  const initiatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setCardError("");

    if (!finalPrice) {
      // 100% discount, skip credit checks
      setPaymentStatus("processing");
      setActiveStepIndex(0);
      return;
    }

    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 16) {
      setCardError(isAr ? "الرجاء إدخال رقم بطاقة ائتمان صحيح ومكون من 16 خانة" : "Please input a valid 16-digit card number");
      return;
    }

    if (!cardExpiry || !cardExpiry.includes("/")) {
      setCardError(isAr ? "الصلاحية غير صحيحة" : "Expiry date must be MM/YY");
      return;
    }

    if (!cardCVC || cardCVC.length < 3) {
      setCardError(isAr ? "كود الحماية غير صحيح" : "Invalid CVC");
      return;
    }

    setPaymentStatus("processing");
    setActiveStepIndex(0);
  };

  const completeUpgrade = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { isPro: true }, { merge: true });
      setIsPro(true);
      setPaymentStatus("success");
    } catch (err) {
      console.error(err);
      setPaymentStatus("error");
    }
  };

  const resetAllAndClose = () => {
    setShowUpgradeModal(false);
    setPaymentStatus("idle");
    setActiveStepIndex(0);
    setCardNumber("");
    setCardExpiry("");
    setCardCVC("");
    setCardName("");
    setCouponCode("");
    setIsCouponApplied(false);
    setPromoDiscount(0);
  };

  return (
    <AnimatePresence>
      <div id="upgrade-modal-root" className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          onClick={resetAllAndClose}
        />

        {/* Modal content body */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="dark-container bg-[#0f0f15]/95 border border-white/10 rounded-3xl w-full max-w-2xl relative z-10 shadow-2xl overflow-hidden p-6 sm:p-8"
        >
          {/* Close button */}
          <button 
            type="button" 
            onClick={resetAllAndClose}
            className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* STATE 1: SELECTION & GATEWAY INTERACTIVE FORM */}
          {paymentStatus === "idle" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white font-heading">
                  {isAr ? "ترقية حسابك لنظام الـ Pro" : "Upgrade to Hookify Pro"}
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {isAr 
                    ? "انضم للنخبة من صناع المحتوى لعام 2026! افتح التخطيط الشهري المتكامل والوصول اللا محدود."
                    : "Unlock unlimited generations, premium template categories, professional viral match filters, and expert analytics."}
                </p>
              </div>

              {/* Billing Cycle Selector */}
              <div className="flex justify-center">
                <div className="bg-black/40 border border-white/5 p-1 rounded-2xl flex items-center">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      billingCycle === "monthly"
                        ? "bg-purple-600/30 text-purple-300 border border-purple-500/20 shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {isAr ? "شهري ($19)" : "Monthly ($19/mo)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("yearly")}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                      billingCycle === "yearly"
                        ? "bg-purple-600/30 text-purple-300 border border-purple-500/20 shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{isAr ? "سنوي ($149)" : "Annual ($149/yr)"}</span>
                    <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.5 rounded-full border border-amber-500/25">
                      {isAr ? "وفر 35%" : "Save 35%"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Left: Interactive Card & Payment form */}
                <div className="md:col-span-7 space-y-4">
                  <form onSubmit={initiatePayment} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        {isAr ? "اسم حامل البطاقة" : "Cardholder Name"}
                      </label>
                      <Input
                        type="text"
                        placeholder="John Doe"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="bg-black/30 border-white/10 text-xs py-5"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block flex justify-between">
                        <span>{isAr ? "رقم بطاقة الائتمان" : "Card Number"}</span>
                        <span className="text-[9px] text-slate-500 font-normal normal-case italic">
                          ({isAr ? "تلميح: اكتب أي رقم عشوائي للمحاكاة" : "Hint: enter any fake card to test"})
                        </span>
                      </label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="4000 1234 5678 9010"
                          value={cardNumber}
                          onChange={(e) => handleCardNumberChange(e.target.value)}
                          className="bg-black/30 border-white/10 text-xs pl-10 rtl:pl-4 rtl:pr-10 py-5 font-mono"
                          required
                        />
                        <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          {isAr ? "الصلاحية" : "Expiry Date"}
                        </label>
                        <Input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => handleExpiryChange(e.target.value)}
                          className="bg-black/30 border-white/10 text-xs text-center py-5 font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          CVC
                        </label>
                        <Input
                          type="password"
                          placeholder="123"
                          value={cardCVC}
                          onChange={(e) => handleCVCChange(e.target.value)}
                          className="bg-black/30 border-white/10 text-xs text-center py-5 font-mono"
                          required
                        />
                      </div>
                    </div>

                    {cardError && (
                      <div className="p-3 bg-red-400/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{cardError}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="gradient"
                      className="w-full text-xs h-11"
                    >
                      <span>
                        {isAr 
                          ? `تأكيد ودفع الاستحقاق ($${finalPrice}) 💳` 
                          : `Confirm Simulated Payment ($${finalPrice}) 💳`}
                      </span>
                    </Button>
                  </form>
                </div>

                {/* Right: Checkout summary & Promo Codes */}
                <div className="md:col-span-5 bg-black/30 border border-white/5 p-4 rounded-3xl space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">
                    {isAr ? "ملخص الدفع المحاكي" : "Simulated Checkout Invoice"}
                  </h3>

                  <div className="text-xs space-y-2 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        {billingCycle === "monthly" ? (isAr ? "باقة احتراف مستمرة (شهري)" : "Pro subscription (Monthly)") : (isAr ? "باقة احتراف مستمرة (سنوي)" : "Pro subscription (Yearly)")}
                      </span>
                      <span>${basePrice}</span>
                    </div>

                    {isCouponApplied && (
                      <div className="flex justify-between text-green-400 bg-green-500/10 px-2 py-1.5 rounded-lg border border-green-500/10">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-green-400 shrink-0" />
                          <span>{isAr ? "كود التخفيض:" : "Promo Discount:"}</span>
                        </span>
                        <span>-${discountAmount} ({promoDiscount}%)</span>
                      </div>
                    )}

                    <div className="border-t border-white/5 pt-2 flex justify-between font-bold text-sm text-white">
                      <span>{isAr ? "الإجمالي الكلي:" : "Simulated Total:"}</span>
                      <span>${finalPrice}</span>
                    </div>
                  </div>

                  {/* Promo Input block */}
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block flex justify-between">
                      <span>{isAr ? "هل لديك كود ترويجي؟" : "Promotion / Promo Code"}</span>
                      <span className="text-[9px] text-purple-400 font-semibold normal-case italic">
                        ({isAr ? "جرب: FREEPRO" : "Try: FREEPRO"})
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="e.g. FREEPRO"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="bg-black/40 border-white/10 uppercase font-mono text-[11px] h-8 grow text-slate-200"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleApplyCoupon}
                        className="h-8 text-[11px] border-white/10"
                      >
                        {isAr ? "تطبيق" : "Apply"}
                      </Button>
                    </div>

                    {promoError && (
                      <p className="text-[10px] text-red-400 leading-normal">{promoError}</p>
                    )}
                    {isCouponApplied && (
                      <p className="text-[10px] text-green-400 font-semibold flex items-center gap-1 leading-normal">
                        <Gift className="w-3 h-3 text-green-400 shrink-0 animate-bounce" />
                        {isAr ? "🎉 تم تفعيل الخصم الذهبي للحساب بنجاح!" : "🎉 Golden code accepted! Coupon applied."}
                      </p>
                    )}
                  </div>

                  {/* Safety guidelines */}
                  <div className="text-[10px] text-slate-500 leading-relaxed space-y-1.5 bg-white/[0.01] p-3 rounded-2xl border border-dashed border-white/5">
                    <p className="font-semibold text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      {isAr ? "أمان واختبار آمن" : "Secure Simulation Environment"}
                    </p>
                    <p>
                      {isAr
                        ? "هذا المتجر هو عبارة عن محاكاة ائتمانية متكاملة كجزء من بيئة العمل. لن يتم سحب أي مبالغ حقيقية من بطاقتك أبداً ويمكنك كتابة أي أرقام عشوائية للتثبيت السريع للترقية."
                        : "This checkout is a fully functional staging simulation sandbox. No real charges are made. You may use simulated placeholders to freely upgrade and see the complete Pro state change."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: METRICS PROCESSING STEP-LOADER */}
          {paymentStatus === "processing" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white transition-all">
                  {isAr ? steps[activeStepIndex].titleAr : steps[activeStepIndex].titleEn}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {isAr ? steps[activeStepIndex].descAr : steps[activeStepIndex].descEn}
                </p>
              </div>

              {/* Progress Bar indicator */}
              <div className="w-full max-w-xs bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/5">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-300" 
                  style={{ width: `${((activeStepIndex + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* STATE 3: CELEBRATION SUCCESS */}
          {paymentStatus === "success" && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 shadow-2xl shadow-green-500/10">
                <Check className="w-8 h-8 text-green-400 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white font-heading">
                  {isAr ? "مبروك! تم تفعيل اشتراكك بنجاح 🎉" : "Congratulations! Pro Activated 🎉"}
                </h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {isAr
                    ? "أنت الآن تمتلك حساباً ذهبياً بالكامل! تم تفعيل التوليد اللامحدود، وإزالة جميع حواجز الاستخدام لتنطلق في نشر علامتك."
                    : "Your account is now fully upgraded to Pro! Enjoy infinite content generations, full scheduling calendar export, and deep marketing analyzers."}
                </p>
              </div>

              <div className="bg-purple-950/20 border border-purple-500/20 p-4 rounded-2xl text-xs text-purple-300 font-mono flex items-center gap-2">
                <TrendingUp className="w-4 h-4 shrink-0 text-purple-400" />
                <span>
                  {isAr ? "الوضع الحالي للباقة: PRO_MEMBER_UNLIMITED_ACTIVE" : "Account state: PRO_MEMBER_UNLIMITED_ACTIVE"}
                </span>
              </div>

              <Button
                type="button"
                variant="gradient"
                size="lg"
                className="px-10 h-11 text-xs"
                onClick={resetAllAndClose}
              >
                {isAr ? "ابدأ التوليد غير المحدود الآن! ⚡" : "Start Creating as Pro Now! ⚡"}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
