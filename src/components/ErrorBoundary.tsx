import { Component, ErrorInfo, ReactNode } from "react";
import { telemetry } from "../lib/telemetry";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[SaaS Boundary Crash] Caught error:", error, errorInfo);
    
    // Dispatch exception to our centralized SaaS telemetry monitor
    telemetry.track({
      category: "Exception",
      action: "ReactCrashCaught",
      label: error?.message || "Render compilation breakdown",
      metadata: {
        stack: error?.stack || "",
        componentStack: errorInfo?.componentStack || "",
        info: "ErrorBoundary caught render-level crash. Suppressed white screen successfully."
      }
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-950/20 backdrop-blur-sm rounded-3xl border border-red-500/10 mt-4">
          <div className="max-w-md w-full text-center space-y-5 p-6 rounded-2xl bg-slate-900/60 border border-white/5 shadow-2xl">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Execution Boundary Suspended
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                The application encountered an unexpected rendering error. Staged components have been safely sandboxed to protect session data.
              </p>
            </div>
            
            {this.state.error && (
              <div className="p-3 bg-black/60 rounded-xl border border-white/5 text-left">
                <p className="text-[10px] font-mono text-red-300 break-all leading-tight">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="pt-2 flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/10 transition-colors"
              >
                Reset Applet State
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
