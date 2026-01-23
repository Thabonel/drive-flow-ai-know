import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { offlineEnabled } from "@/lib/ai";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useKeyboardShortcuts, globalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppSidebar } from "@/components/AppSidebar";
import { BackgroundTasksProvider } from "@/contexts/BackgroundTasksContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PresentationModeProvider } from "@/contexts/PresentationModeContext";
import { AgentRightPane } from "@/components/agent/AgentRightPane";
import { FeatureGate } from "@/components/FeatureGate";
import { supabase } from "@/integrations/supabase/client";
import Header from "./layout/Header";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import ConfirmEmail from "./pages/ConfirmEmail";
import GoogleDrive from "./pages/GoogleDrive";
import Documents from "./pages/Documents";
import AddDocuments from "./pages/AddDocuments";
import KnowledgeBases from "./pages/KnowledgeBases";
import PitchDeck from "./pages/PitchDeck";
import SyncStatus from "./pages/SyncStatus";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Footer from "./layout/Footer";
import Landing from "./pages/Landing";
import Admin from "./pages/Admin";
import CustomerInvites from "./pages/Admin/CustomerInvites";
import DocumentList from "./components/DocumentList";
import Conversations from "./pages/Conversations";
import MicrosoftCallback from "./pages/MicrosoftCallback";
import DropboxCallback from "./pages/auth/DropboxCallback";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Disclaimer from "./pages/Disclaimer";
import DataPolicy from "./pages/DataPolicy";
import AcceptableUse from "./pages/AcceptableUse";
import Support from "./pages/Support";
import AdminSupportTickets from "./pages/AdminSupportTickets";
import Timeline from "./pages/Timeline";
import BookingPage from "./pages/BookingPage";
import BookingLinks from "./pages/BookingLinks";
import AssistantManagement from "./pages/AssistantManagement";
import AssistantPortalPage from "./pages/AssistantPortalPage";
import DailyBrief from "./pages/DailyBrief";
import EmailToTask from "./pages/EmailToTask";
import TeamSettings from "./pages/Team/Settings";
import TeamMembers from "./pages/Team/Members";
import TeamDocuments from "./pages/Team/Documents";
import TeamTimeline from "./pages/Team/TeamTimeline";
import CreateTeam from "./pages/Team/CreateTeam";
import AcceptInvite from "./pages/Team/AcceptInvite";
import PresentationAudience from "./pages/PresentationAudience";
import { Agent } from "./pages/Agent";

const queryClient = new QueryClient();

function AppLayout({ children }: { children: React.ReactNode }) {
  const offline = offlineEnabled();
  const location = useLocation();
  const { user } = useAuth();
  const [agentMode, setAgentMode] = useState(false);
  const [loadingAgentMode, setLoadingAgentMode] = useState(true);
  useKeyboardShortcuts(globalShortcuts);

  useEffect(() => {
    const fetchAgentMode = async () => {
      if (!user) {
        setLoadingAgentMode(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('agent_mode')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setAgentMode(data?.agent_mode || false);
      } catch (error) {
        console.error('Error fetching agent mode:', error);
        setAgentMode(false);
      } finally {
        setLoadingAgentMode(false);
      }
    };

    fetchAgentMode();
  }, [user]);

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
          <main className="flex-1 overflow-x-hidden">
            <Header />
            <div className={`${location.pathname === '/conversations' ? '' : 'p-6'} max-w-full overflow-x-hidden`}>
              {children}
            </div>
          </main>
          {user && location.pathname === '/dashboard' && !loadingAgentMode && agentMode && (
            <FeatureGate requiredTier="enterprise">
              <AgentRightPane userId={user.id} />
            </FeatureGate>
          )}
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
    return <Navigate to="/conversations" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PresentationModeProvider>
      <ThemeProvider defaultTheme="system" storageKey="aiqueryhub-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
            <BackgroundTasksProvider>
            <PWAInstallPrompt />
            <Routes>
            <Route path="/auth" element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            } />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/confirm" element={<ConfirmEmail />} />
            <Route path="/auth/microsoft/callback" element={<MicrosoftCallback />} />
            <Route path="/auth/dropbox/callback" element={<DropboxCallback />} />
            <Route path="/" element={
              <PublicRoute>
                <Landing />
              </PublicRoute>
            } />
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
            <Route path="/pitch-deck" element={
              <ProtectedRoute>
                <PitchDeck />
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
            <Route path="/admin/invites" element={
              <ProtectedRoute>
                <CustomerInvites />
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
            <Route path="/agent" element={
              <ProtectedRoute>
                <Agent />
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
            <Route path="/booking-links" element={
              <ProtectedRoute>
                <BookingLinks />
              </ProtectedRoute>
            } />
            <Route path="/assistants" element={
              <ProtectedRoute>
                <AssistantManagement />
              </ProtectedRoute>
            } />
            <Route path="/assistant-portal" element={
              <ProtectedRoute>
                <AssistantPortalPage />
              </ProtectedRoute>
            } />
            <Route path="/daily-brief" element={
              <ProtectedRoute>
                <DailyBrief />
              </ProtectedRoute>
            } />
            <Route path="/email-to-task" element={
              <ProtectedRoute>
                <EmailToTask />
              </ProtectedRoute>
            } />
            <Route path="/team/settings" element={
              <ProtectedRoute>
                <TeamSettings />
              </ProtectedRoute>
            } />
            <Route path="/team/members" element={
              <ProtectedRoute>
                <TeamMembers />
              </ProtectedRoute>
            } />
            <Route path="/team/documents" element={
              <ProtectedRoute>
                <TeamDocuments />
              </ProtectedRoute>
            } />
            <Route path="/team/timeline" element={
              <ProtectedRoute>
                <TeamTimeline />
              </ProtectedRoute>
            } />
            <Route path="/team/create" element={
              <ProtectedRoute>
                <CreateTeam />
              </ProtectedRoute>
            } />
            <Route path="/accept-invite/:token" element={
              <ProtectedRoute>
                <AcceptInvite />
              </ProtectedRoute>
            } />
            <Route path="/book/:slug" element={<BookingPage />} />
            <Route path="/presentation-audience/:sessionId" element={<PresentationAudience />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/data-policy" element={<DataPolicy />} />
            <Route path="/acceptable-use" element={<AcceptableUse />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
            </BackgroundTasksProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
    </PresentationModeProvider>
  </QueryClientProvider>
);

export default App;
