export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agentic_memories: {
        Row: {
          agent: string
          content: string
          created_at: string
          embedding: string | null
          id: string
          memory_type: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          agent: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          memory_type: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          agent?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          memory_type?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          agent_type: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          agent_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          agent_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      ai_query_history: {
        Row: {
          context_documents_count: number | null
          created_at: string
          id: string
          knowledge_base_id: string | null
          processing_time_ms: number | null
          query_text: string
          response_text: string | null
          user_id: string
        }
        Insert: {
          context_documents_count?: number | null
          created_at?: string
          id?: string
          knowledge_base_id?: string | null
          processing_time_ms?: number | null
          query_text: string
          response_text?: string | null
          user_id: string
        }
        Update: {
          context_documents_count?: number | null
          created_at?: string
          id?: string
          knowledge_base_id?: string | null
          processing_time_ms?: number | null
          query_text?: string
          response_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_type: string
          file_url: string
          id: string
          message_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_type: string
          file_url: string
          id?: string
          message_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      changelog: {
        Row: {
          date: string | null
          description: string | null
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          date?: string | null
          description?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          date?: string | null
          description?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          agent_id: string | null
          context_summary: string | null
          created_at: string | null
          id: string
          message_count: number | null
          project_id: string | null
          started_at: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          context_summary?: string | null
          created_at?: string | null
          id?: string
          message_count?: number | null
          project_id?: string | null
          started_at?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          context_summary?: string | null
          created_at?: string | null
          id?: string
          message_count?: number | null
          project_id?: string | null
          started_at?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_qa_agent_memberships: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          is_owner: boolean
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          is_owner?: boolean
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          is_owner?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_qa_agent_memberships_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "doc_qa_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_qa_agents: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          model_config: Json | null
          name: string
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_config?: Json | null
          name: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_config?: Json | null
          name?: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      doc_qa_chat_messages: {
        Row: {
          agent_id: string | null
          confidence_score: number | null
          content: string
          context_documents: string[] | null
          created_at: string | null
          id: string
          message_type: string
          metadata: Json | null
          processing_time_ms: number | null
          session_id: string | null
          token_count: number | null
        }
        Insert: {
          agent_id?: string | null
          confidence_score?: number | null
          content: string
          context_documents?: string[] | null
          created_at?: string | null
          id?: string
          message_type: string
          metadata?: Json | null
          processing_time_ms?: number | null
          session_id?: string | null
          token_count?: number | null
        }
        Update: {
          agent_id?: string | null
          confidence_score?: number | null
          content?: string
          context_documents?: string[] | null
          created_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          processing_time_ms?: number | null
          session_id?: string | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_qa_chat_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "doc_qa_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_qa_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "doc_qa_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_qa_chat_sessions: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          session_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          session_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          session_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_qa_chat_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "doc_qa_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_qa_collections: {
        Row: {
          agent_id: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_qa_collections_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "doc_qa_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_qa_documents: {
        Row: {
          agent_id: string | null
          chunk_index: number | null
          chunk_total: number | null
          collection_id: string | null
          content: string
          created_at: string | null
          document_id: string | null
          document_name: string | null
          document_type: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          source_url: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          chunk_index?: number | null
          chunk_total?: number | null
          collection_id?: string | null
          content: string
          created_at?: string | null
          document_id?: string | null
          document_name?: string | null
          document_type?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_url?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          chunk_index?: number | null
          chunk_total?: number | null
          collection_id?: string | null
          content?: string
          created_at?: string | null
          document_id?: string | null
          document_name?: string | null
          document_type?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_qa_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "doc_qa_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_qa_documents_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "doc_qa_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_qa_feedback: {
        Row: {
          created_at: string | null
          feedback_text: string | null
          feedback_type: string | null
          id: string
          message_id: string | null
          rating: number | null
        }
        Insert: {
          created_at?: string | null
          feedback_text?: string | null
          feedback_type?: string | null
          id?: string
          message_id?: string | null
          rating?: number | null
        }
        Update: {
          created_at?: string | null
          feedback_text?: string | null
          feedback_type?: string | null
          id?: string
          message_id?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_qa_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "doc_qa_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string
          embedding: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          content: string
          embedding?: string | null
          id: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          content?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      google_drive_folders: {
        Row: {
          created_at: string
          folder_id: string
          folder_name: string
          folder_path: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id: string
          folder_name: string
          folder_path?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string
          folder_name?: string
          folder_path?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_token_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          success: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_token_rate_limit: {
        Row: {
          access_count: number | null
          blocked_until: string | null
          created_at: string | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          access_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          access_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      knowledge_bases: {
        Row: {
          ai_generated_content: string | null
          content: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          last_updated_from_source: string | null
          source_document_ids: string[] | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated_content?: string | null
          content?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_updated_from_source?: string | null
          source_document_ids?: string[] | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated_content?: string | null
          content?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_updated_from_source?: string | null
          source_document_ids?: string[] | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_documents: {
        Row: {
          ai_insights: Json | null
          ai_summary: string | null
          category: string | null
          content: string | null
          created_at: string
          drive_created_at: string | null
          drive_modified_at: string | null
          file_size: number | null
          file_type: string
          folder_id: string | null
          google_file_id: string
          id: string
          is_archived: boolean | null
          is_outdated: boolean | null
          is_pinned: boolean | null
          mime_type: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_insights?: Json | null
          ai_summary?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          drive_created_at?: string | null
          drive_modified_at?: string | null
          file_size?: number | null
          file_type: string
          folder_id?: string | null
          google_file_id: string
          id?: string
          is_archived?: boolean | null
          is_outdated?: boolean | null
          is_pinned?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_insights?: Json | null
          ai_summary?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          drive_created_at?: string | null
          drive_modified_at?: string | null
          file_size?: number | null
          file_type?: string
          folder_id?: string | null
          google_file_id?: string
          id?: string
          is_archived?: boolean | null
          is_outdated?: boolean | null
          is_pinned?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "google_drive_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_links: {
        Row: {
          from_id: string
          link_type: string
          to_id: string
        }
        Insert: {
          from_id: string
          link_type: string
          to_id: string
        }
        Update: {
          from_id?: string
          link_type?: string
          to_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_links_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "agentic_memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_links_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "agentic_memories"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          role: string
          sequence_number: number
          timestamp: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          sequence_number: number
          timestamp?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          sequence_number?: number
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          id: string
          name: string | null
          route: string | null
          status: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          route?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          route?: string | null
          status?: string | null
        }
        Relationships: []
      }
      pamrag: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          tags: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          tags?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          tags?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_memory: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          source: string | null
          tags: string[] | null
          title: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          tags?: string[] | null
          title?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          tags?: string[] | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      project_notes: {
        Row: {
          content: string | null
          id: string
          timestamp: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          timestamp?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          timestamp?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_prompts: {
        Row: {
          created_at: string
          id: string
          prompt_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          files_processed: number | null
          files_total: number | null
          folder_id: string | null
          id: string
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          files_processed?: number | null
          files_total?: number | null
          folder_id?: string | null
          id?: string
          started_at?: string | null
          status: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          files_processed?: number | null
          files_total?: number | null
          folder_id?: string | null
          id?: string
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "google_drive_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          priority: string | null
          status: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          priority?: string | null
          status?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          priority?: string | null
          status?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_google_tokens: {
        Row: {
          created_at: string
          encrypted_access_token: string | null
          encrypted_refresh_token: string | null
          expires_at: string | null
          id: string
          scope: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          expires_at?: string | null
          id?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          expires_at?: string | null
          id?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          model_preference: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_preference?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_preference?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_google_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_qa_sessions: {
        Args: Record<PropertyKey, never> | { days_old?: number }
        Returns: number
      }
      example_function: {
        Args: { param1: string }
        Returns: string
      }
      get_current_user_can_view_agent: {
        Args: { p_agent_id: string }
        Returns: boolean
      }
      get_decrypted_google_token: {
        Args: { p_user_id: string }
        Returns: {
          access_token: string
          expires_at: string
          refresh_token: string
          scope: string
          token_type: string
        }[]
      }
      get_decrypted_google_token_enhanced: {
        Args: {
          p_ip_address?: unknown
          p_user_agent?: string
          p_user_id: string
        }
        Returns: {
          access_token: string
          expires_at: string
          refresh_token: string
          scope: string
          token_type: string
        }[]
      }
      get_qa_agent_stats: {
        Args: Record<PropertyKey, never> | { p_agent_id: string }
        Returns: {
          avg_session_length: number
          total_collections: number
          total_documents: number
          total_messages: number
          total_sessions: number
        }[]
      }
      get_qa_agent_stats_new: {
        Args: Record<PropertyKey, never>
        Returns: {
          agent_id: number
          total_collections: number
          total_documents: number
          total_messages: number
        }[]
      }
      handle_new_user_v2: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      log_token_access_attempt: {
        Args: {
          p_action: string
          p_details?: string
          p_success: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      match_documents: {
        Args:
          | { filter?: Json; match_count?: number; query_embedding: string }
          | { query: string }
        Returns: {
          agent_id: number
          collection_id: number
          content: string
          created_at: string
          document_name: string
          embedding: string
          id: number
          updated_at: string
        }[]
      }
      match_memories: {
        Args:
          | Record<PropertyKey, never>
          | {
              filter_agent: string
              match_count: number
              match_threshold: number
              query_embedding: string
              user_filter: string
            }
          | { match_count?: number; query_embedding: string }
          | { param1: string; param2: number }
        Returns: {
          id: number
          result: string
        }[]
      }
      match_memories_optimized: {
        Args: Record<PropertyKey, never>
        Returns: {
          agent: string
          content: string
          created_at: string
          embedding: string | null
          id: string
          memory_type: string
          metadata: Json | null
          user_id: string
        }[]
      }
      match_qa_documents: {
        Args:
          | Record<PropertyKey, never>
          | {
              match_count?: number
              match_threshold?: number
              p_agent_id?: string
              p_collection_id?: string
              query_embedding: string
            }
          | {
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
        Returns: {
          content: string
          id: string
          similarity: number
        }[]
      }
      store_encrypted_google_tokens: {
        Args: {
          p_access_token: string
          p_expires_in?: number
          p_refresh_token?: string
          p_scope?: string
          p_token_type?: string
        }
        Returns: undefined
      }
      store_encrypted_google_tokens_enhanced: {
        Args: {
          p_access_token: string
          p_expires_in?: number
          p_ip_address?: unknown
          p_refresh_token?: string
          p_scope?: string
          p_token_type?: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      validate_google_token_access: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      validate_google_token_access_enhanced: {
        Args: {
          p_action?: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
