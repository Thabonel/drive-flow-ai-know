import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { FileCheck } from "lucide-react";

const Briefs = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto w-full p-6 lg:p-8 space-y-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <FileCheck className="h-8 w-8" />
                Daily Briefs
              </h1>
              <p className="text-muted-foreground mt-1">
                AI-generated executive summaries and daily briefings
              </p>
            </div>

            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <FileCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                Daily brief generation and management features will be available here.
              </p>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Briefs;
