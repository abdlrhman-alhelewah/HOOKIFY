import ReactGA from "react-ga4";

export interface TelemetryEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

class TelemetryService {
  private isGAInitialized = false;
  private isDevelopment = true;
  private lastClickTime = 0;
  private lastClickedElement: HTMLElement | null = null;
  private clickCountInWindow = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.isDevelopment = window.location.hostname === "localhost" || 
                           window.location.hostname.includes("ais-dev") ||
                           window.location.hostname.includes("127.0.0.1");
      this.initializeGA();
      this.setupGlobalClickListener();
      this.setupRageClickDetector();
      this.setupGlobalErrorHandlers();
    }
  }

  private setupGlobalClickListener() {
    if (typeof window === "undefined") return;

    window.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const elementTag = target.tagName.toLowerCase();
      const elementId = target.id || "";
      const elementText = target.innerText?.trim().slice(0, 60) || "";
      const elementClasses = target.className || "";
      const ariaLabel = target.getAttribute("aria-label") || target.getAttribute("placeholder") || "";

      // Track the interaction detail
      this.track({
        category: "AnalyticsClick",
        action: "ElementClicked",
        label: `${elementTag}${elementId ? '#' + elementId : ''} [${elementText}]`,
        metadata: {
          tag: elementTag,
          id: elementId,
          text: elementText,
          ariaLabel,
          classes: typeof elementClasses === "string" ? elementClasses.slice(0, 100) : ""
        }
      });
    });
  }

  private initializeGA() {
    try {
      const measurementId = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID;
      if (measurementId) {
        ReactGA.initialize(measurementId);
        this.isGAInitialized = true;
        this.logStructured("System", "Analytics_Initialized", { measurementId });
      } else {
        this.logStructured("System", "Analytics_Mode", { mode: "Console development fallbacks active" });
      }
    } catch (e) {
      console.warn("[Telemetry] Failed to initialize Google Analytics", e);
    }
  }

  private logStructured(category: string, action: string, data?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logStyle = "background: #1e1b4b; color: #a5b4fc; padding: 2px 6px; border-radius: 4px; font-weight: bold;";
    if (this.isDevelopment) {
      console.log(
        `%c[Telemetry] [${timestamp}] [${category} -> ${action}]`,
        logStyle,
        data ? JSON.stringify(data, null, 2) : ""
      );
    }
  }

  /**
   * Tracks a custom user or system event across both Console (Structured) and GA4.
   */
  public track(event: TelemetryEvent) {
    this.logStructured(event.category, event.action, {
      label: event.label,
      value: event.value,
      ...event.metadata,
    });

    if (this.isGAInitialized) {
      try {
        ReactGA.event({
          category: event.category,
          action: event.action,
          label: event.label,
          value: event.value,
          ...event.metadata,
        });
      } catch (err) {
        if (this.isDevelopment) {
          console.error("[Telemetry] Failed sending event to GA4", err);
        }
      }
    }
  }

  /**
   * Page View tracking
   */
  public pageView(pageName: string, path: string) {
    this.track({
      category: "Navigation",
      action: "PageView",
      label: pageName,
      metadata: { path },
    });
  }

  /**
   * Measures performance of async operations (e.g. streaming generation APIs) and logs latency.
   */
  public async profileLatency<T>(
    operationName: string,
    operationBlock: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await operationBlock();
      const durationMs = performance.now() - startTime;
      this.track({
        category: "Performance",
        action: "LatencyMetrics",
        label: operationName,
        value: Math.round(durationMs),
        metadata: { status: "Success", durationMs },
      });
      return result;
    } catch (error: any) {
      const durationMs = performance.now() - startTime;
      this.track({
        category: "Performance",
        action: "LatencyMetrics",
        label: operationName,
        value: Math.round(durationMs),
        metadata: { status: "Failure", durationMs, error: error?.message || String(error) },
      });
      throw error;
    }
  }

  /**
   * Rage click detection monitors if users click things repeatedly in frustration.
   */
  private setupRageClickDetector() {
    if (typeof window === "undefined") return;

    window.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const now = Date.now();
      const isSameElement = this.lastClickedElement === target;
      
      if (isSameElement && (now - this.lastClickTime < 900)) {
        this.clickCountInWindow++;
        if (this.clickCountInWindow >= 3) {
          const elementTag = target.tagName.toLowerCase();
          const elementText = target.innerText?.slice(0, 30) || "";
          const elementId = target.id || "";
          
          this.track({
            category: "UX_Struggle",
            action: "RageClickDetected",
            label: `${elementTag} (${elementText})`,
            metadata: {
              elementId,
              clicksCount: this.clickCountInWindow,
              helpHint: "User is repeatedly pressing an action button. May indicate high loading lag or broken UI state."
            }
          });
          
          // Reset count
          this.clickCountInWindow = 0;
        }
      } else {
        this.clickCountInWindow = 1;
      }

      this.lastClickTime = now;
      this.lastClickedElement = target;
    });
  }

  /**
   * Catches all unhandled runtime errors in production.
   */
  private setupGlobalErrorHandlers() {
    if (typeof window === "undefined") return;

    window.addEventListener("error", (e) => {
      this.track({
        category: "Exception",
        action: "UncaughtRuntimeError",
        label: e.message || "Unknown error",
        metadata: {
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
          stack: e.error?.stack || ""
        }
      });
    });

    window.addEventListener("unhandledrejection", (e) => {
      this.track({
        category: "Exception",
        action: "UnhandledPromiseRejection",
        label: String(e.reason?.message || e.reason),
        metadata: {
          stack: e.reason?.stack || ""
        }
      });
    });
  }
}

export const telemetry = new TelemetryService();
