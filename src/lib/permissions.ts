import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UserRoleType, AssistantRelationship } from "./timelineUtils";

/**
 * Hook to get the current user's role from the user_roles table
 */
export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return data;
    },
  });
}

/**
 * Hook to check if the current user is an executive
 */
export function useIsExecutive() {
  const { data: userRole } = useUserRole();
  return userRole?.role_type === "executive";
}

/**
 * Hook to check if the current user is an assistant
 */
export function useIsAssistant() {
  const { data: userRole } = useUserRole();
  return userRole?.role_type === "assistant";
}

/**
 * Hook to check if user has executive tier subscription
 */
export function useHasExecutiveTier() {
  const { data: userRole } = useUserRole();
  return userRole?.subscription_tier === "executive";
}

/**
 * Hook to check if user has access to assistant features
 * Only executive tier has access to assistant features
 */
export function useHasAssistantFeatures() {
  const { data: userRole } = useUserRole();
  return userRole?.subscription_tier === "executive" ||
         userRole?.features_enabled?.max_assistants > 0;
}

/**
 * Hook to get all assistant relationships where the current user is the executive
 */
export function useMyAssistants() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-assistants", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Fetch relationships
      const { data: relationships, error: relError } = await supabase
        .from("assistant_relationships")
        .select("*")
        .eq("executive_id", user!.id)
        .order("created_at", { ascending: false });

      if (relError) {
        console.error("Error fetching assistants:", relError);
        return [];
      }

      if (!relationships || relationships.length === 0) {
        return [];
      }

      // Fetch user profiles for all assistants
      const assistantIds = relationships.map(r => r.assistant_id);
      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, email, raw_user_meta_data")
        .in("id", assistantIds);

      if (profileError) {
        console.error("Error fetching assistant profiles:", profileError);
        return relationships; // Return without profiles
      }

      // Merge profiles into relationships
      return relationships.map(rel => ({
        ...rel,
        assistant: profiles?.find(p => p.id === rel.assistant_id) || null,
      }));
    },
  });
}

/**
 * Hook to get all executive relationships where the current user is the assistant
 */
export function useMyExecutives() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-executives", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Fetch relationships
      const { data: relationships, error: relError } = await supabase
        .from("assistant_relationships")
        .select("*")
        .eq("assistant_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (relError) {
        console.error("Error fetching executives:", relError);
        return [];
      }

      if (!relationships || relationships.length === 0) {
        return [];
      }

      // Fetch user profiles for all executives
      const executiveIds = relationships.map(r => r.executive_id);
      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, email, raw_user_meta_data")
        .in("id", executiveIds);

      if (profileError) {
        console.error("Error fetching executive profiles:", profileError);
        return relationships; // Return without profiles
      }

      // Merge profiles into relationships
      return relationships.map(rel => ({
        ...rel,
        executive: profiles?.find(p => p.id === rel.executive_id) || null,
      }));
    },
  });
}

/**
 * Hook to check if the current user is acting as an assistant
 * Returns the active executive context if acting on behalf of someone
 */
export function useIsActingAsAssistant() {
  const { data: executives } = useMyExecutives();
  const activeExecutiveId = localStorage.getItem("active-executive-id");

  if (!executives || executives.length === 0) {
    return {
      isActingAsAssistant: false,
      activeExecutive: null,
      activeRelationship: null,
    };
  }

  const activeRelationship = activeExecutiveId
    ? executives.find((rel) => rel.executive_id === activeExecutiveId)
    : null;

  return {
    isActingAsAssistant: !!activeRelationship,
    activeExecutive: activeRelationship
      ? (activeRelationship as any).executive
      : null,
    activeRelationship: activeRelationship || null,
  };
}

/**
 * Hook to check if the current user can perform a specific action
 * @param permission - Permission key (e.g., 'manage_timeline', 'upload_documents')
 * @param executiveId - Optional: check permission for specific executive (for assistants)
 */
export function useCanPerformAction(
  permission: keyof AssistantRelationship["permissions"],
  executiveId?: string
) {
  const { user } = useAuth();
  const { data: userRole } = useUserRole();
  const { isActingAsAssistant, activeRelationship } = useIsActingAsAssistant();

  // Executives can always perform actions on their own data
  if (userRole?.role_type === "executive" && !executiveId) {
    return true;
  }

  // If executive is viewing someone else's data, they can't perform actions
  if (userRole?.role_type === "executive" && executiveId && executiveId !== user?.id) {
    return false;
  }

  // Assistants need to check their permissions
  if (isActingAsAssistant && activeRelationship) {
    const permissions = activeRelationship.permissions as AssistantRelationship["permissions"];
    return permissions[permission] === true;
  }

  // Default: no permission
  return false;
}

/**
 * Hook to check if the current user can view confidential documents
 */
export function useCanViewConfidential(executiveId?: string) {
  return useCanPerformAction("view_confidential", executiveId);
}

/**
 * Hook to check if the current user can manage timeline items
 */
export function useCanManageTimeline(executiveId?: string) {
  return useCanPerformAction("manage_timeline", executiveId);
}

/**
 * Hook to check if the current user can upload documents
 */
export function useCanUploadDocuments(executiveId?: string) {
  return useCanPerformAction("upload_documents", executiveId);
}

/**
 * Hook to check if the current user can create timeline items
 */
export function useCanCreateItems(executiveId?: string) {
  return useCanPerformAction("create_items", executiveId);
}

/**
 * Hook to check if the current user can edit timeline items
 */
export function useCanEditItems(executiveId?: string) {
  return useCanPerformAction("edit_items", executiveId);
}

/**
 * Hook to check if the current user can delete timeline items
 */
export function useCanDeleteItems(executiveId?: string) {
  return useCanPerformAction("delete_items", executiveId);
}

/**
 * Helper to get the effective user ID (executive ID if acting as assistant, otherwise current user)
 */
export function useEffectiveUserId() {
  const { user } = useAuth();
  const { isActingAsAssistant, activeRelationship } = useIsActingAsAssistant();

  if (isActingAsAssistant && activeRelationship) {
    return activeRelationship.executive_id;
  }

  return user?.id || null;
}

/**
 * Hook to get pending assistant relationship approvals (for executives)
 */
export function usePendingApprovals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pending-approvals", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Fetch relationships
      const { data: relationships, error: relError } = await supabase
        .from("assistant_relationships")
        .select("*")
        .eq("executive_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (relError) {
        console.error("Error fetching pending approvals:", relError);
        return [];
      }

      if (!relationships || relationships.length === 0) {
        return [];
      }

      // Fetch user profiles for all assistants
      const assistantIds = relationships.map(r => r.assistant_id);
      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, email, raw_user_meta_data")
        .in("id", assistantIds);

      if (profileError) {
        console.error("Error fetching assistant profiles:", profileError);
        return relationships; // Return without profiles
      }

      // Merge profiles into relationships
      return relationships.map(rel => ({
        ...rel,
        assistant: profiles?.find(p => p.id === rel.assistant_id) || null,
      }));
    },
  });
}
