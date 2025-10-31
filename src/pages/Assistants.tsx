import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";
import { AssistantRelationshipCard } from "@/components/AssistantRelationshipCard";
import { InviteAssistantDialog } from "@/components/InviteAssistantDialog";
import { EditPermissionsDialog } from "@/components/EditPermissionsDialog";
import { useAssistantRelationships } from "@/hooks/useAssistantData";
import { useUserRole } from "@/lib/permissions";
import { useNavigate } from "react-router-dom";
import type { AssistantRelationship } from "@/lib/timelineUtils";
import { Skeleton } from "@/components/ui/skeleton";

const Assistants = () => {
  const navigate = useNavigate();
  const { data: userRole, isLoading: isLoadingRole } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [editingRelationship, setEditingRelationship] = useState<any>(null);

  const isExecutive = userRole?.role_type === "executive";
  const isAssistant = userRole?.role_type === "assistant";

  // Fetch relationships based on user role
  const { data: relationships, isLoading: isLoadingRelationships } = useAssistantRelationships(
    isExecutive,
    isAssistant
  );

  const isLoading = isLoadingRole || isLoadingRelationships;

  // Filter relationships based on search and active tab
  const filteredRelationships = (relationships || []).filter((rel: any) => {
    // Filter by status tab
    if (activeTab !== "all" && rel.status !== activeTab) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const user = isExecutive ? rel.assistant : rel.executive;
      const name = user?.raw_user_meta_data?.full_name?.toLowerCase() || "";
      const email = user?.email?.toLowerCase() || "";
      const query = searchQuery.toLowerCase();
      return name.includes(query) || email.includes(query);
    }

    return true;
  });

  // Count by status
  const statusCounts = (relationships || []).reduce(
    (acc: any, rel: any) => {
      acc[rel.status] = (acc[rel.status] || 0) + 1;
      acc.all++;
      return acc;
    },
    { all: 0, pending: 0, active: 0, revoked: 0 }
  );

  const handleEditPermissions = (relationship: AssistantRelationship) => {
    setEditingRelationship(relationship);
  };

  const handleViewAudit = (relationship: AssistantRelationship) => {
    navigate(`/audit?assistant=${isExecutive ? relationship.assistant_id : relationship.executive_id}`);
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto w-full p-6 lg:p-8 space-y-8">
              <div className="space-y-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-5 w-96" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto w-full p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Users className="h-8 w-8" />
                  {isExecutive ? "My Assistants" : isAssistant ? "My Executives" : "Team Management"}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {isExecutive
                    ? "Manage assistant relationships and permissions"
                    : isAssistant
                    ? "View executives you assist and your permissions"
                    : "Assistant features are only available for Executive and Assistant roles"}
                </p>
              </div>
              {isExecutive && (
                <InviteAssistantDialog />
              )}
            </div>

            {(isExecutive || isAssistant) && (
              <>
                {/* Search and Filters */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList>
                    <TabsTrigger value="all">
                      All
                      {statusCounts.all > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {statusCounts.all}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="active">
                      Active
                      {statusCounts.active > 0 && (
                        <Badge variant="default" className="ml-2">
                          {statusCounts.active}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                      Pending
                      {statusCounts.pending > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {statusCounts.pending}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="revoked">
                      Revoked
                      {statusCounts.revoked > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {statusCounts.revoked}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab} className="space-y-6">
                    {filteredRelationships.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRelationships.map((relationship: any) => (
                          <AssistantRelationshipCard
                            key={relationship.id}
                            relationship={relationship}
                            viewAsExecutive={isExecutive}
                            onEdit={handleEditPermissions}
                            onViewAudit={handleViewAudit}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 border-2 border-dashed rounded-lg">
                        <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          {searchQuery
                            ? "No results found"
                            : activeTab === "pending"
                            ? "No pending relationships"
                            : activeTab === "active"
                            ? "No active relationships"
                            : activeTab === "revoked"
                            ? "No revoked relationships"
                            : "No relationships yet"}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          {searchQuery
                            ? "Try adjusting your search query"
                            : isExecutive
                            ? "Invite an assistant to get started"
                            : "Wait for an executive to invite you"}
                        </p>
                        {!searchQuery && isExecutive && (
                          <InviteAssistantDialog />
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Subscription Info */}
                <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Subscription Tier</p>
                      <p className="text-xs text-muted-foreground">
                        {userRole?.subscription_tier || "starter"}
                      </p>
                    </div>
                    {isExecutive && (
                      <div>
                        <p className="text-sm font-medium">Assistant Limit</p>
                        <p className="text-xs text-muted-foreground">
                          {statusCounts.active} / {userRole?.features_enabled?.max_assistants || 0}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {!isExecutive && !isAssistant && (
              <div className="text-center py-16">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Assistant features not available
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your account type does not have access to assistant features.
                  Please contact support to upgrade your account.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Permissions Dialog */}
      <EditPermissionsDialog
        relationship={editingRelationship}
        open={!!editingRelationship}
        onOpenChange={(open) => !open && setEditingRelationship(null)}
      />
    </SidebarProvider>
  );
};

export default Assistants;
