import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { offlineEnabled } from "@/lib/ai";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useKeyboardShortcuts, globalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { AppSidebar } from "@/components/AppSidebar";
import Header from "./layout/Header";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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

const queryClient = new QueryClient();

function AppLayout({ children }: { children: React.ReactNode }) {
  const offline = offlineEnabled();
  useKeyboardShortcuts(globalShortcuts);
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        {offline && (
          <div className="bg-yellow-300 text-yellow-900 text-center py-1 text-sm font-medium">
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
        <Footer />
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
            <Route path="/conversations" element={
              <ProtectedRoute>
                <Conversations />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
