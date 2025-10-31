import { useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import {
  createAssistantRelationship,
  updateAssistantRelationship,
  approveAssistantRelationship,
  revokeAssistantRelationship,
  getAssistantRelationships,
  uploadDocument,
  attachDocumentToItem,
  detachDocumentFromItem,
  getTimelineItemDocuments,
  createDailyBrief,
  getDailyBriefs,
  updateDailyBrief,
  getExecutiveAuditLog,
  type RelationshipStatus,
  type AuditActionType,
} from "@/lib/assistantUtils";

/**
 * Hook to fetch assistant relationships
 * @param asExecutive - Fetch as executive (relationships where user is executive)
 * @param asAssistant - Fetch as assistant (relationships where user is assistant)
 */
export function useAssistantRelationships(
  asExecutive: boolean = true,
  asAssistant: boolean = false
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["assistant-relationships", user?.id, asExecutive, asAssistant],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      return await getAssistantRelationships(
        asExecutive ? user.id : undefined,
        asAssistant ? user.id : undefined
      );
    },
  });
}

/**
 * Hook to create a new assistant relationship
 */
export function useCreateAssistantRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      executiveId,
      assistantId,
      permissions,
      notes,
    }: {
      executiveId: string;
      assistantId: string;
      permissions?: Record<string, any>;
      notes?: string;
    }) => {
      return await createAssistantRelationship(
        executiveId,
        assistantId,
        permissions,
        notes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant-relationships"] });
      toast.success("Assistant relationship created successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to create relationship: ${error.message}`);
    },
  });
}

/**
 * Hook to update assistant relationship permissions
 */
export function useUpdateAssistantRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      relationshipId,
      permissions,
      notes,
    }: {
      relationshipId: string;
      permissions?: Record<string, any>;
      notes?: string;
    }) => {
      return await updateAssistantRelationship(
        relationshipId,
        permissions,
        notes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant-relationships"] });
      toast.success("Permissions updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to update permissions: ${error.message}`);
    },
  });
}

/**
 * Hook to approve a pending assistant relationship
 */
export function useApproveAssistantRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relationshipId: string) => {
      return await approveAssistantRelationship(relationshipId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant-relationships"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      toast.success("Assistant relationship approved");
    },
    onError: (error: any) => {
      toast.error(`Failed to approve relationship: ${error.message}`);
    },
  });
}

/**
 * Hook to revoke an assistant relationship
 */
export function useRevokeAssistantRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relationshipId: string) => {
      return await revokeAssistantRelationship(relationshipId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant-relationships"] });
      toast.success("Assistant relationship revoked");
    },
    onError: (error: any) => {
      toast.error(`Failed to revoke relationship: ${error.message}`);
    },
  });
}

/**
 * Hook to upload a document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      file: File;
      forUserId: string;
      documentDate?: string;
      tags?: string[];
      category?: string;
      isConfidential?: boolean;
    }) => {
      return await uploadDocument(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["timeline-documents"] });
      toast.success("Document uploaded successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to upload document: ${error.message}`);
    },
  });
}

/**
 * Hook to fetch documents attached to a timeline item
 */
export function useTimelineItemDocuments(timelineItemId: string | null) {
  return useQuery({
    queryKey: ["timeline-item-documents", timelineItemId],
    enabled: !!timelineItemId,
    queryFn: async () => {
      if (!timelineItemId) return [];
      return await getTimelineItemDocuments(timelineItemId);
    },
  });
}

/**
 * Hook to attach a document to a timeline item
 */
export function useAttachDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      timelineItemId,
      documentId,
      attachmentType,
    }: {
      timelineItemId: string;
      documentId: string;
      attachmentType?: string;
    }) => {
      return await attachDocumentToItem(
        timelineItemId,
        documentId,
        attachmentType
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["timeline-item-documents", variables.timelineItemId],
      });
      toast.success("Document attached successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to attach document: ${error.message}`);
    },
  });
}

/**
 * Hook to detach a document from a timeline item
 */
export function useDetachDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      timelineItemId,
      documentId,
    }: {
      timelineItemId: string;
      documentId: string;
    }) => {
      return await detachDocumentFromItem(timelineItemId, documentId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["timeline-item-documents", variables.timelineItemId],
      });
      toast.success("Document detached successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to detach document: ${error.message}`);
    },
  });
}

/**
 * Hook to fetch daily briefs
 */
export function useDailyBriefs(
  forUserId?: string,
  startDate?: string,
  endDate?: string,
  status?: string
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["daily-briefs", forUserId || user?.id, startDate, endDate, status],
    enabled: !!(forUserId || user?.id),
    queryFn: async () => {
      return await getDailyBriefs(forUserId, startDate, endDate, status);
    },
  });
}

/**
 * Hook to create a daily brief
 */
export function useCreateDailyBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      forUserId: string;
      briefDate: string;
      content: string;
      summary?: string;
      keyHighlights?: string[];
      actionItems?: string[];
    }) => {
      return await createDailyBrief(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-briefs"] });
      toast.success("Daily brief created successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to create brief: ${error.message}`);
    },
  });
}

/**
 * Hook to update a daily brief
 */
export function useUpdateDailyBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      briefId,
      content,
      summary,
      keyHighlights,
      actionItems,
      status,
    }: {
      briefId: string;
      content?: string;
      summary?: string;
      keyHighlights?: string[];
      actionItems?: string[];
      status?: string;
    }) => {
      return await updateDailyBrief(
        briefId,
        content,
        summary,
        keyHighlights,
        actionItems,
        status
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-briefs"] });
      toast.success("Brief updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to update brief: ${error.message}`);
    },
  });
}

/**
 * Hook to fetch audit log
 */
export function useAuditLog(
  executiveId?: string,
  options?: {
    assistantId?: string;
    action?: AuditActionType;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
) {
  const { user } = useAuth();

  // Serialize options to prevent object reference changes in queryKey
  const serializedOptions = useMemo(
    () => options ? JSON.stringify(options) : null,
    [options?.assistantId, options?.action, options?.entityType, options?.startDate, options?.endDate, options?.limit]
  );

  return useQuery({
    queryKey: ["audit-log", executiveId || user?.id, serializedOptions],
    enabled: !!(executiveId || user?.id),
    queryFn: async () => {
      return await getExecutiveAuditLog(executiveId || user!.id, options);
    },
  });
}

/**
 * Hook to fetch audit log with real-time updates
 * @param executiveId - Executive user ID
 * @param options - Filter options
 */
export function useAuditLogRealtime(
  executiveId?: string,
  options?: {
    assistantId?: string;
    action?: AuditActionType;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = executiveId || user?.id;

  const query = useAuditLog(executiveId, options);

  // Set up real-time subscription
  useEffect(() => {
    if (!targetUserId) return;

    const subscription = supabase
      .channel(`audit-log-${targetUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "assistant_audit_log",
          filter: `executive_id=eq.${targetUserId}`,
        },
        () => {
          // queryClient from useQueryClient() is stable, no need in deps
          queryClient.invalidateQueries({ queryKey: ["audit-log", targetUserId] });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [targetUserId]); // Removed queryClient - it's stable from context

  return query;
}

// Import React and supabase for the realtime hook
import React from "react";
import { supabase } from "@/integrations/supabase/client";
