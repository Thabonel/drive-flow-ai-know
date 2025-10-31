/**
 * Executive-Assistant System Utilities
 *
 * Helper functions for managing assistant relationships, permissions,
 * document uploads, and audit logging.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  UserRole,
  UserRoleType,
  SubscriptionTier,
  AssistantRelationship,
  RelationshipStatus,
  TimelineDocument,
  TimelineItemDocument,
  AttachmentType,
  ExecutiveDailyBrief,
  AssistantAuditLog,
  AuditActionType,
} from "./timelineUtils";

// ============================================================================
// USER ROLE MANAGEMENT
// ============================================================================

/**
 * Get user's role information
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching user role:", error);
    return null;
  }

  return data;
}

/**
 * Update user's role type (requires admin permissions)
 */
export async function updateUserRoleType(
  userId: string,
  roleType: UserRoleType
): Promise<boolean> {
  const { error } = await supabase
    .from("user_roles")
    .update({ role_type: roleType })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating user role type:", error);
    return false;
  }

  return true;
}

/**
 * Update user's subscription tier
 */
export async function updateSubscriptionTier(
  userId: string,
  tier: SubscriptionTier
): Promise<boolean> {
  const { error } = await supabase
    .from("user_roles")
    .update({ subscription_tier: tier })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating subscription tier:", error);
    return false;
  }

  return true;
}

/**
 * Check if user has a specific feature enabled
 */
export async function hasFeature(
  userId: string,
  feature: string
): Promise<boolean> {
  const role = await getUserRole(userId);
  if (!role) return false;

  return role.features_enabled?.[feature] === true;
}

/**
 * Get feature limit (e.g., max_assistants, storage_gb)
 */
export async function getFeatureLimit(
  userId: string,
  feature: string
): Promise<number> {
  const role = await getUserRole(userId);
  if (!role) return 0;

  return role.features_enabled?.[feature] || 0;
}

// ============================================================================
// ASSISTANT RELATIONSHIP MANAGEMENT
// ============================================================================

/**
 * Create a new assistant relationship (pending approval)
 */
export async function createAssistantRelationship(
  executiveId: string,
  assistantId: string,
  permissions?: Record<string, any>,
  notes?: string
): Promise<AssistantRelationship | null> {
  const defaultPermissions = {
    manage_timeline: true,
    upload_documents: true,
    create_items: true,
    edit_items: true,
    delete_items: false,
    view_confidential: false,
    manage_goals: true,
    create_briefs: true,
    view_only_layers: [],
  };

  const { data, error } = await supabase
    .from("assistant_relationships")
    .insert({
      executive_id: executiveId,
      assistant_id: assistantId,
      permissions: permissions || defaultPermissions,
      status: "pending" as RelationshipStatus,
      notes,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating assistant relationship:", error);
    return null;
  }

  return data;
}

/**
 * Approve an assistant relationship
 */
export async function approveAssistantRelationship(
  relationshipId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("assistant_relationships")
    .update({
      status: "active" as RelationshipStatus,
      approved_at: new Date().toISOString(),
    })
    .eq("id", relationshipId);

  if (error) {
    console.error("Error approving assistant relationship:", error);
    return false;
  }

  return true;
}

/**
 * Revoke an assistant relationship
 */
export async function revokeAssistantRelationship(
  relationshipId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("assistant_relationships")
    .update({
      status: "revoked" as RelationshipStatus,
      revoked_at: new Date().toISOString(),
    })
    .eq("id", relationshipId);

  if (error) {
    console.error("Error revoking assistant relationship:", error);
    return false;
  }

  return true;
}

/**
 * Get all active assistant relationships for an executive
 */
export async function getExecutiveAssistants(
  executiveId: string
): Promise<AssistantRelationship[]> {
  const { data, error } = await supabase
    .from("assistant_relationships")
    .select("*")
    .eq("executive_id", executiveId)
    .eq("status", "active");

  if (error) {
    console.error("Error fetching executive assistants:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all active executives for an assistant
 */
export async function getAssistantExecutives(
  assistantId: string
): Promise<AssistantRelationship[]> {
  const { data, error } = await supabase
    .from("assistant_relationships")
    .select("*")
    .eq("assistant_id", assistantId)
    .eq("status", "active");

  if (error) {
    console.error("Error fetching assistant executives:", error);
    return [];
  }

  return data || [];
}

/**
 * Update assistant permissions
 */
export async function updateAssistantPermissions(
  relationshipId: string,
  permissions: Record<string, any>
): Promise<boolean> {
  const { error } = await supabase
    .from("assistant_relationships")
    .update({ permissions })
    .eq("id", relationshipId);

  if (error) {
    console.error("Error updating assistant permissions:", error);
    return false;
  }

  return true;
}

/**
 * Check if assistant has a specific permission for an executive
 */
export async function checkAssistantPermission(
  assistantId: string,
  executiveId: string,
  permission: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("assistant_relationships")
    .select("permissions")
    .eq("assistant_id", assistantId)
    .eq("executive_id", executiveId)
    .eq("status", "active")
    .single();

  if (error || !data) {
    return false;
  }

  return data.permissions?.[permission] === true;
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

/**
 * Upload a document for a user
 */
export async function uploadDocument(params: {
  file: File;
  forUserId: string;
  documentDate?: string;
  tags?: string[];
  category?: string;
  isConfidential?: boolean;
}): Promise<TimelineDocument | null> {
  const {
    file,
    forUserId,
    documentDate,
    tags = [],
    category,
    isConfidential = false,
  } = params;

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("timeline-documents")
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("timeline-documents")
      .getPublicUrl(fileName);

    // Create document record
    const { data, error } = await supabase
      .from("timeline_documents")
      .insert({
        uploaded_by_user_id: user.id,
        for_user_id: forUserId,
        filename: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type,
        document_date: documentDate,
        tags,
        category,
        is_confidential: isConfidential,
        storage_provider: "supabase",
        storage_bucket: "timeline-documents",
        storage_path: fileName,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error uploading document:", error);
    return null;
  }
}

/**
 * Attach a document to a timeline item
 */
export async function attachDocumentToItem(
  timelineItemId: string,
  documentId: string,
  attachmentType: AttachmentType,
  notes?: string
): Promise<TimelineItemDocument | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("timeline_item_documents")
    .insert({
      timeline_item_id: timelineItemId,
      document_id: documentId,
      attachment_type: attachmentType,
      added_by_user_id: user.id,
      notes,
    })
    .select()
    .single();

  if (error) {
    console.error("Error attaching document to item:", error);
    return null;
  }

  return data;
}

/**
 * Get documents for a user
 */
export async function getUserDocuments(
  userId: string,
  filters?: {
    category?: string;
    tags?: string[];
    confidentialOnly?: boolean;
    startDate?: string;
    endDate?: string;
  }
): Promise<TimelineDocument[]> {
  let query = supabase
    .from("timeline_documents")
    .select("*")
    .eq("for_user_id", userId);

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.contains("tags", filters.tags);
  }

  if (filters?.confidentialOnly) {
    query = query.eq("is_confidential", true);
  }

  if (filters?.startDate) {
    query = query.gte("document_date", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("document_date", filters.endDate);
  }

  const { data, error } = await query.order("upload_date", { ascending: false });

  if (error) {
    console.error("Error fetching user documents:", error);
    return [];
  }

  return data || [];
}

/**
 * Get documents attached to a timeline item
 */
export async function getItemDocuments(
  itemId: string
): Promise<Array<TimelineDocument & { attachment: TimelineItemDocument }>> {
  const { data, error } = await supabase
    .from("timeline_item_documents")
    .select(`
      *,
      document:timeline_documents(*)
    `)
    .eq("timeline_item_id", itemId)
    .order("sort_order");

  if (error) {
    console.error("Error fetching item documents:", error);
    return [];
  }

  // @ts-ignore - Supabase types are complex
  return data?.map(d => ({ ...d.document, attachment: d })) || [];
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  // Get document info to delete from storage
  const { data: doc } = await supabase
    .from("timeline_documents")
    .select("storage_provider, storage_bucket, storage_path")
    .eq("id", documentId)
    .single();

  if (doc?.storage_provider === "supabase" && doc.storage_path) {
    await supabase.storage
      .from(doc.storage_bucket || "timeline-documents")
      .remove([doc.storage_path]);
  }

  // Delete database record (cascades to timeline_item_documents)
  const { error } = await supabase
    .from("timeline_documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    console.error("Error deleting document:", error);
    return false;
  }

  return true;
}

// ============================================================================
// DAILY BRIEF MANAGEMENT
// ============================================================================

/**
 * Create a daily brief for an executive
 */
export async function createDailyBrief(
  executiveId: string,
  briefDate: string,
  summary?: string,
  keyPoints?: Array<{ title: string; priority?: string; notes?: string }>
): Promise<ExecutiveDailyBrief | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("executive_daily_briefs")
    .insert({
      executive_id: executiveId,
      prepared_by_assistant_id: user.id,
      brief_date: briefDate,
      summary,
      key_points: keyPoints || [],
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating daily brief:", error);
    return null;
  }

  return data;
}

/**
 * Update a daily brief
 */
export async function updateDailyBrief(
  briefId: string,
  updates: {
    summary?: string;
    key_points?: Array<any>;
    auto_generated_insights?: Record<string, any>;
    status?: "draft" | "ready" | "viewed";
  }
): Promise<boolean> {
  const { error } = await supabase
    .from("executive_daily_briefs")
    .update(updates)
    .eq("id", briefId);

  if (error) {
    console.error("Error updating daily brief:", error);
    return false;
  }

  return true;
}

/**
 * Get daily briefs for an executive
 */
export async function getExecutiveBriefs(
  executiveId: string,
  filters?: {
    status?: "draft" | "ready" | "viewed";
    startDate?: string;
    endDate?: string;
  }
): Promise<ExecutiveDailyBrief[]> {
  let query = supabase
    .from("executive_daily_briefs")
    .select("*")
    .eq("executive_id", executiveId);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.startDate) {
    query = query.gte("brief_date", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("brief_date", filters.endDate);
  }

  const { data, error } = await query.order("brief_date", { ascending: false });

  if (error) {
    console.error("Error fetching executive briefs:", error);
    return [];
  }

  return data || [];
}

/**
 * Mark brief as viewed
 */
export async function markBriefAsViewed(briefId: string): Promise<boolean> {
  const { error } = await supabase
    .from("executive_daily_briefs")
    .update({
      status: "viewed",
      viewed_at: new Date().toISOString(),
    })
    .eq("id", briefId);

  if (error) {
    console.error("Error marking brief as viewed:", error);
    return false;
  }

  return true;
}

// ============================================================================
// AUDIT LOG FUNCTIONS
// ============================================================================

/**
 * Log an assistant action (called automatically by triggers, but can be used manually)
 */
export async function logAssistantAction(
  targetUserId: string,
  action: AuditActionType,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("assistant_audit_log")
    .insert({
      actor_user_id: user.id,
      target_user_id: targetUserId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details || {},
    });

  if (error) {
    console.error("Error logging assistant action:", error);
    return false;
  }

  return true;
}

/**
 * Get audit logs for an executive (actions performed on their data)
 */
export async function getExecutiveAuditLog(
  executiveId: string,
  filters?: {
    assistantId?: string;
    action?: AuditActionType;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<AssistantAuditLog[]> {
  let query = supabase
    .from("assistant_audit_log")
    .select("*")
    .eq("target_user_id", executiveId);

  if (filters?.assistantId) {
    query = query.eq("actor_user_id", filters.assistantId);
  }

  if (filters?.action) {
    query = query.eq("action", filters.action);
  }

  if (filters?.resourceType) {
    query = query.eq("resource_type", filters.resourceType);
  }

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching executive audit log:", error);
    return [];
  }

  return data || [];
}

/**
 * Get audit logs for an assistant (actions they performed)
 */
export async function getAssistantAuditLog(
  assistantId: string,
  filters?: {
    executiveId?: string;
    action?: AuditActionType;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<AssistantAuditLog[]> {
  let query = supabase
    .from("assistant_audit_log")
    .select("*")
    .eq("actor_user_id", assistantId);

  if (filters?.executiveId) {
    query = query.eq("target_user_id", filters.executiveId);
  }

  if (filters?.action) {
    query = query.eq("action", filters.action);
  }

  if (filters?.resourceType) {
    query = query.eq("resource_type", filters.resourceType);
  }

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assistant audit log:", error);
    return [];
  }

  return data || [];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "music";
  if (mimeType.includes("pdf")) return "file-text";
  if (mimeType.includes("word") || mimeType.includes("document")) return "file-text";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "table";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "presentation";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "archive";
  return "file";
}

/**
 * Validate document upload (size, type restrictions)
 */
export function validateDocument(file: File, maxSizeMB: number = 50): { valid: boolean; error?: string } {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  // Allowed MIME types
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "File type not allowed. Supported: PDF, Word, Excel, PowerPoint, Text, Images",
    };
  }

  return { valid: true };
}
