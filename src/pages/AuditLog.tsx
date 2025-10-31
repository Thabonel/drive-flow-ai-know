import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Shield } from "lucide-react";

const AuditLog = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto w-full p-6 lg:p-8 space-y-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Shield className="h-8 w-8" />
                Audit Log
              </h1>
              <p className="text-muted-foreground mt-1">
                Complete audit trail of all assistant actions and changes
              </p>
            </div>

            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                Audit log viewing and filtering features will be available here.
              </p>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AuditLog;
