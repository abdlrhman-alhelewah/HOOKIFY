import { Routes, Route, BrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
import DashboardLayout from "./pages/DashboardLayout";
import OverviewPage from "./pages/OverviewPage";
import GeneratorPage from "./pages/GeneratorPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import HistoryPage from "./pages/HistoryPage";
import SavedPage from "./pages/SavedPage";
import TemplatesPage from "./pages/TemplatesPage";
import SettingsPage from "./pages/SettingsPage";
import AdminDashboard from "./pages/AdminDashboard";
import CalendarPage from "./pages/CalendarPage";
import CompetitorIntelPage from "./pages/CompetitorIntelPage";
import SwipeFilePage from "./pages/SwipeFilePage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Analytics from "./components/Analytics";
import CodeProtector from "./components/CodeProtector";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Analytics />
            <CodeProtector />
            <div className="min-h-screen font-sans selection:bg-violet-900 selection:text-white relative">
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<OverviewPage />} />
                    <Route path="overview" element={<OverviewPage />} />
                    <Route path="full" element={<GeneratorPage type="full" />} />
                    <Route path="hooks" element={<GeneratorPage type="hook" />} />
                    <Route path="captions" element={<GeneratorPage type="caption" />} />
                    <Route path="scripts" element={<GeneratorPage type="script" />} />
                    <Route path="angles" element={<GeneratorPage type="angle" />} />
                    <Route path="analyzer" element={<GeneratorPage type="analyzer" />} />
                    <Route path="history" element={<HistoryPage />} />
                    <Route path="saved" element={<SavedPage />} />
                    <Route path="templates" element={<TemplatesPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="admin" element={<AdminDashboard />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="competitor-intel" element={<CompetitorIntelPage />} />
                    <Route path="swipe-file" element={<SwipeFilePage />} />
                  </Route>
                </Routes>
              </ErrorBoundary>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
