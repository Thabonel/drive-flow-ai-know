export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          user_id: string | null
        }
        Insert: {
          agent: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          memory_type: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          agent?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          memory_type?: string
          metadata?: Json | null
          user_id?: string | null
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
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          tags?: string[] | null
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          tags?: string[] | null
          title?: string | null
        }
        Relationships: []
      }
      project_notes: {
        Row: {
          content: string | null
          id: string
          timestamp: string | null
          title: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          timestamp?: string | null
          title?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          timestamp?: string | null
          title?: string | null
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
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
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
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      cleanup_old_qa_sessions: {
        Args: { days_old?: number }
        Returns: number
      }
      get_qa_agent_stats: {
        Args: { p_agent_id: string }
        Returns: {
          total_documents: number
          total_collections: number
          total_sessions: number
          total_messages: number
          avg_session_length: number
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      match_documents: {
        Args: { query_embedding: string; match_count?: number; filter?: Json }
        Returns: {
          id: string
          content: string
          metadata: Json
          embedding: string
          similarity: number
        }[]
      }
      match_memories: {
        Args:
          | { query_embedding: string; match_count?: number }
          | {
              query_embedding: string
              match_threshold: number
              match_count: number
              filter_agent: string
              user_filter: string
            }
        Returns: {
          id: string
          agent: string
          memory_type: string
          content: string
          metadata: Json
          similarity: number
        }[]
      }
      match_qa_documents: {
        Args: {
          query_embedding: string
          p_agent_id?: string
          p_collection_id?: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          content: string
          metadata: Json
          document_name: string
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
