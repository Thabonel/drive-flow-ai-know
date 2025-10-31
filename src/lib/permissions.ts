import { useState, useEffect, useMemo } from "react";
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
    staleTime: 5 * 60 * 1000, // 5 minutes - roles rarely change
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 1, // Only retry once
    queryFn: async () => {
      const { data, error} = await supabase
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
  return useMemo(
    () => userRole?.role_type === "executive",
    [userRole?.role_type]
  );
}

/**
 * Hook to check if the current user is an assistant
 */
export function useIsAssistant() {
  const { data: userRole } = useUserRole();
  return useMemo(
    () => userRole?.role_type === "assistant",
    [userRole?.role_type]
  );
}

/**
 * Hook to check if user has executive tier subscription
 */
export function useHasExecutiveTier() {
  const { data: userRole } = useUserRole();
  return useMemo(
    () => userRole?.subscription_tier === "executive",
    [userRole?.subscription_tier]
  );
}

/**
 * Hook to check if user has access to assistant features
 * Only executive tier has access to assistant features
 */
export function useHasAssistantFeatures() {
  const { data: userRole } = useUserRole();

  // Extract primitive values to prevent object reference changes
  const subscriptionTier = userRole?.subscription_tier;
  const maxAssistants = userRole?.features_enabled?.max_assistants ?? 0;

  return useMemo(
    () => subscriptionTier === "executive" || maxAssistants > 0,
    [subscriptionTier, maxAssistants]
  );
}

/**
 * Hook to get all assistant relationships where the current user is the executive
 */
export function useMyAssistants() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-assistants", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
    refetchOnWindowFocus: false,
    retry: 1,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
    refetchOnWindowFocus: false,
    retry: 1,
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

  // Use state instead of reading localStorage directly
  const [activeExecutiveId, setActiveExecutiveId] = useState<string | null>(() =>
    localStorage.getItem("active-executive-id")
  );

  // Listen for localStorage changes from other tabs/components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "active-executive-id") {
        setActiveExecutiveId(e.newValue);
      }
    };

    // Also listen for custom events from same tab
    const handleLocalUpdate = () => {
      setActiveExecutiveId(localStorage.getItem("active-executive-id"));
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage-update", handleLocalUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage-update", handleLocalUpdate);
    };
  }, []);

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => {
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
      activeExecutive: activeRelationship?.executive || null,
      activeRelationship: activeRelationship || null,
    };
  }, [executives, activeExecutiveId]);
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
  const userId = user?.id;
  const { data: userRole } = useUserRole();
  const roleType = userRole?.role_type;
  const { isActingAsAssistant, activeRelationship } = useIsActingAsAssistant();

  // Memoize the result to prevent unnecessary recalculations
  return useMemo(() => {
    // Executives can always perform actions on their own data
    if (roleType === "executive" && !executiveId) {
      return true;
    }

    // If executive is viewing someone else's data, they can't perform actions
    if (roleType === "executive" && executiveId && executiveId !== userId) {
      return false;
    }

    // Assistants need to check their permissions
    if (isActingAsAssistant && activeRelationship) {
      const permissions = activeRelationship.permissions as AssistantRelationship["permissions"];
      return permissions[permission] === true;
    }

    // Default: no permission
    return false;
  }, [roleType, executiveId, userId, isActingAsAssistant, activeRelationship, permission]);
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
    staleTime: 2 * 60 * 1000, // 2 minutes - pending approvals change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes in cache
    // refetchOnWindowFocus now controlled by global default (false)
    retry: 1,
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
