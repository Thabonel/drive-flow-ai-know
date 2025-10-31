import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { offlineEnabled } from "@/lib/ai";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useKeyboardShortcuts, globalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppSidebar } from "@/components/AppSidebar";
import { TierGuard } from "@/components/TierGuard";
import Header from "./layout/Header";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import GoogleDrive from "./pages/GoogleDrive";
import Documents from "./pages/Documents";
import AddDocuments from "./pages/AddDocuments";
import KnowledgeBases from "./pages/KnowledgeBases";
import SyncStatus from "./pages/SyncStatus";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Footer from "./layout/Footer";
import Landing from "./pages/Landing";
import Admin from "./pages/Admin";
import DocumentList from "./components/DocumentList";
import Conversations from "./pages/Conversations";
import MicrosoftCallback from "./pages/MicrosoftCallback";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Disclaimer from "./pages/Disclaimer";
import DataPolicy from "./pages/DataPolicy";
import AcceptableUse from "./pages/AcceptableUse";
import Support from "./pages/Support";
import AdminSupportTickets from "./pages/AdminSupportTickets";
import Timeline from "./pages/Timeline";
import Assistants from "./pages/Assistants";
import Briefs from "./pages/Briefs";
import AuditLog from "./pages/AuditLog";
import TestsMagnetic from "./pages/TestsMagnetic";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache retention
      refetchOnWindowFocus: false, // Prevent refetch on tab switch
      retry: 1, // Only retry failed queries once
      structuralSharing: true, // Prevent unnecessary re-renders from identical data
    },
  },
});

function AppLayout({ children }: { children: React.ReactNode }) {
  const offline = offlineEnabled();
  useKeyboardShortcuts(globalShortcuts);
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        {offline && (
          <div className="bg-yellow-500 dark:bg-yellow-600 text-white dark:text-yellow-50 text-center py-1 text-sm font-medium">
            Offline Mode Enabled
          </div>
        )}
        <div className="flex flex-1 w-full">
          <AppSidebar />
          <main className="flex-1">
            <Header />
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="aiqueryhub-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="/auth" element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            } />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/microsoft/callback" element={<MicrosoftCallback />} />
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/drive" element={
              <ProtectedRoute>
                <GoogleDrive />
              </ProtectedRoute>
            } />
            <Route path="/documents" element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            } />
            <Route path="/add-documents" element={
              <ProtectedRoute>
                <AddDocuments />
              </ProtectedRoute>
            } />
            <Route path="/knowledge" element={
              <ProtectedRoute>
                <KnowledgeBases />
              </ProtectedRoute>
            } />
            <Route path="/sync" element={
              <ProtectedRoute>
                <SyncStatus />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/settings/billing" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/docs" element={
              <ProtectedRoute>
                <DocumentList />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="/admin/support-tickets" element={
              <ProtectedRoute>
                <AdminSupportTickets />
              </ProtectedRoute>
            } />
            <Route path="/conversations" element={
              <ProtectedRoute>
                <Conversations />
              </ProtectedRoute>
            } />
            <Route path="/support" element={
              <ProtectedRoute>
                <Support />
              </ProtectedRoute>
            } />
            <Route path="/timeline" element={
              <ProtectedRoute>
                <Timeline />
              </ProtectedRoute>
            } />
            <Route path="/tests/magnetic" element={
              <ProtectedRoute>
                <TestsMagnetic />
              </ProtectedRoute>
            } />
            <Route path="/assistants" element={
              <ProtectedRoute>
                <TierGuard requiredFeature="assistant">
                  <Assistants />
                </TierGuard>
              </ProtectedRoute>
            } />
            <Route path="/briefs" element={
              <ProtectedRoute>
                <TierGuard requiredFeature="assistant">
                  <Briefs />
                </TierGuard>
              </ProtectedRoute>
            } />
            <Route path="/audit" element={
              <ProtectedRoute>
                <TierGuard requiredFeature="assistant">
                  <AuditLog />
                </TierGuard>
              </ProtectedRoute>
            } />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/data-policy" element={<DataPolicy />} />
            <Route path="/acceptable-use" element={<AcceptableUse />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
