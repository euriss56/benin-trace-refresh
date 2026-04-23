import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ChatBot } from "@/components/ChatBot";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Index = lazy(() => import("@/pages/Index"));
const About = lazy(() => import("@/pages/About"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Verify = lazy(() => import("@/pages/Verify"));
const Declare = lazy(() => import("@/pages/Declare"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const DashboardTechnicien = lazy(() => import("@/pages/DashboardTechnicien"));
const DashboardEnqueteur = lazy(() => import("@/pages/DashboardEnqueteur"));
const History = lazy(() => import("@/pages/History"));
const PoliceReports = lazy(() => import("@/pages/PoliceReports"));
const AdminIndex = lazy(() => import("@/pages/AdminIndex"));
const AdminAnalytics = lazy(() => import("@/pages/AdminAnalytics"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const AdminContacts = lazy(() => import("@/pages/AdminContacts"));
const AdminML = lazy(() => import("@/pages/AdminML"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <BrowserRouter>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/verify" element={<Verify />} />

                    <Route
                      path="/declare"
                      element={
                        <ProtectedRoute>
                          <Declare />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/technicien"
                      element={
                        <ProtectedRoute roles={["technicien", "admin"]}>
                          <DashboardTechnicien />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/enqueteur"
                      element={
                        <ProtectedRoute roles={["enqueteur", "admin"]}>
                          <DashboardEnqueteur />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/history"
                      element={
                        <ProtectedRoute>
                          <History />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/police-reports"
                      element={
                        <ProtectedRoute roles={["admin", "enqueteur"]}>
                          <PoliceReports />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute roles={["admin"]}>
                          <AdminIndex />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/analytics"
                      element={
                        <ProtectedRoute roles={["admin"]}>
                          <AdminAnalytics />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <ProtectedRoute roles={["admin"]}>
                          <AdminUsers />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/contacts"
                      element={
                        <ProtectedRoute roles={["admin"]}>
                          <AdminContacts />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/ml"
                      element={
                        <ProtectedRoute roles={["admin"]}>
                          <AdminML />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <ChatBot />
              </TooltipProvider>
            </AuthProvider>
          </BrowserRouter>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
