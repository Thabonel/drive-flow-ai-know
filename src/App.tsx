import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { offlineEnabled } from "@/lib/ai";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useKeyboardShortcuts, globalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppSidebar } from "@/components/AppSidebar";
import { BackgroundTasksProvider } from "@/contexts/BackgroundTasksContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PresentationModeProvider } from "@/contexts/PresentationModeContext";
import { initializeMobileOptimizations } from "@/lib/haptics";
import { ErrorBoundary, InitializationError } from "@/components/ErrorBoundary";
import { ChunkLoadErrorHandler } from "@/components/ChunkLoadErrorHandler";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { ServiceWorkerManager } from "@/components/ServiceWorkerManager";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { config } from "@/config/environment";
import Header from "./layout/Header";
import PrivacyPolicyWidget from "@/components/legal/PrivacyPolicyWidget";
import TermsModal from "@/components/legal/TermsModal";

// Lazy load page components for better performance
const Index = React.lazy(() => import("./pages/Index"));
const Auth = React.lazy(() => import("./pages/Auth"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const ConfirmEmail = React.lazy(() => import("./pages/ConfirmEmail"));
const GoogleDrive = React.lazy(() => import("./pages/GoogleDrive"));
const GoogleSheets = React.lazy(() => import("./pages/GoogleSheets"));
const Documents = React.lazy(() => import("./pages/Documents"));
const AddDocuments = React.lazy(() => import("./pages/AddDocuments"));
const KnowledgeBases = React.lazy(() => import("./pages/KnowledgeBases"));
const PitchDeck = React.lazy(() => import("./pages/PitchDeck"));
const SyncStatus = React.lazy(() => import("./pages/SyncStatus"));
const Settings = React.lazy(() => import("./pages/Settings"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Footer = React.lazy(() => import("./layout/Footer"));
const Landing = React.lazy(() => import("./pages/Landing"));
const Admin = React.lazy(() => import("./pages/Admin"));
const CustomerInvites = React.lazy(() => import("./pages/Admin/CustomerInvites"));
const DocumentList = React.lazy(() => import("./components/DocumentList"));
const Conversations = React.lazy(() => import("./pages/Conversations"));
const MicrosoftCallback = React.lazy(() => import("./pages/MicrosoftCallback"));
const DropboxCallback = React.lazy(() => import("./pages/auth/DropboxCallback"));
const Terms = React.lazy(() => import("./pages/Terms"));
const Privacy = React.lazy(() => import("./pages/Privacy"));
const Disclaimer = React.lazy(() => import("./pages/Disclaimer"));
const DataPolicy = React.lazy(() => import("./pages/DataPolicy"));
const AcceptableUse = React.lazy(() => import("./pages/AcceptableUse"));
const Support = React.lazy(() => import("./pages/Support"));
const AdminSupportTickets = React.lazy(() => import("./pages/AdminSupportTickets"));
const Timeline = React.lazy(() => import("./pages/Timeline"));
const BookingPage = React.lazy(() => import("./pages/BookingPage"));
const MobileDemo = React.lazy(() => import("./pages/MobileDemo"));
const BookingLinks = React.lazy(() => import("./pages/BookingLinks"));
const DailyBrief = React.lazy(() => import("./pages/DailyBrief"));
const EmailToTask = React.lazy(() => import("./pages/EmailToTask"));
const TeamSettings = React.lazy(() => import("./pages/Team/Settings"));
const TeamMembers = React.lazy(() => import("./pages/Team/Members"));
const TeamDocuments = React.lazy(() => import("./pages/Team/Documents"));
const TeamTimeline = React.lazy(() => import("./pages/Team/TeamTimeline"));
const CreateTeam = React.lazy(() => import("./pages/Team/CreateTeam"));
const AcceptInvite = React.lazy(() => import("./pages/Team/AcceptInvite"));
const PresentationAudience = React.lazy(() => import("./pages/PresentationAudience"));

const queryClient = new QueryClient();

function AppLayout({ children }: { children: React.ReactNode }) {
  const offline = offlineEnabled();
  const location = useLocation();
  const { user } = useAuth();
  useKeyboardShortcuts(globalShortcuts);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        {offline && (
          <div className="bg-yellow-500 dark:bg-yellow-600 text-white dark:text-yellow-50 text-center py-1 text-sm font-medium">
            Offline Mode Enabled
          </div>
        )}
        {config.branding.showEnvironmentBanner && (
          <div className="bg-orange-500 dark:bg-orange-600 text-white dark:text-orange-50 text-center py-1 text-sm font-medium">
            🚧 Staging Environment - This is for testing only
          </div>
        )}
        <div className="flex flex-1 w-full">
          <AppSidebar />
          <main className="flex-1 overflow-x-hidden">
            <Header />
            <div className={`${location.pathname === '/conversations' ? '' : 'p-6'} max-w-full overflow-x-hidden`}>
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              }>
                {children}
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Use useEffect to prevent React #426 error during initial render
  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Show loading spinner while navigation is happening to prevent flash
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check email confirmation (with legacy account grace period)
  // @ts-ignore - email_confirmed_at exists on User type but TypeScript may not recognize it
  const emailConfirmed = user.email_confirmed_at || user.confirmed_at;
  const isLegacyAccount = user.created_at && new Date(user.created_at) < new Date('2024-01-01');

  React.useEffect(() => {
    if (!loading && user && !emailConfirmed && !isLegacyAccount) {
      navigate('/auth?error=email_not_confirmed', { replace: true });
    }
  }, [loading, user, emailConfirmed, isLegacyAccount, navigate]);

  if (!emailConfirmed && !isLegacyAccount) {
    // Show loading spinner while navigation is happening
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Use useEffect to prevent React #426 error during initial render
  React.useEffect(() => {
    if (!loading && user) {
      navigate('/conversations', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    // Show loading spinner while navigation is happening
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}

// Mobile initialization component
function MobileInitializer() {
  React.useEffect(() => {
    initializeMobileOptimizations();
  }, []);
  return null;
}


const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <PresentationModeProvider>
        <ThemeProvider defaultTheme="system" storageKey="aiqueryhub-theme">
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {/* Show initialization error if Supabase is not configured */}
            {!isSupabaseConfigured ? (
              <InitializationError
                error={new Error('Supabase configuration is missing or invalid')}
              />
            ) : (
              <BrowserRouter>
                <AuthProvider>
                <BackgroundTasksProvider>
                <ChunkLoadErrorHandler onError={(error) => console.error('Global ChunkLoadError:', error)} />
                <ServiceWorkerManager
                  onChunkError={(error) => console.error('SW ChunkLoadError:', error)}
                  onUpdateAvailable={() => console.log('App update available')}
                  onOfflineReady={() => console.log('App ready for offline use')}
                />
                <MobileInitializer />
                <PWAInstallPrompt />
                <PrivacyPolicyWidget />
                <TermsModal />
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
                  <Route path="/sheets" element={
                    <ProtectedRoute>
                      <GoogleSheets />
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
                      <RouteErrorBoundary routeName="Settings">
                        <Settings />
                      </RouteErrorBoundary>
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
                      <RouteErrorBoundary routeName="Conversations">
                        <Conversations />
                      </RouteErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/support" element={
                    <ProtectedRoute>
                      <Support />
                    </ProtectedRoute>
                  } />
                  <Route path="/timeline" element={
                    <ProtectedRoute>
                      <RouteErrorBoundary routeName="Timeline">
                        <Timeline />
                      </RouteErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/mobile-demo" element={
                    <ProtectedRoute>
                      <MobileDemo />
                    </ProtectedRoute>
                  } />
                  <Route path="/booking-links" element={
                    <ProtectedRoute>
                      <BookingLinks />
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
            )}
          </TooltipProvider>
        </ThemeProvider>
      </PresentationModeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
