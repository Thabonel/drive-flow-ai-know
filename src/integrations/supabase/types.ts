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
      admin_messages: {
        Row: {
          admin_user_id: string
          ai_response: string | null
          created_at: string | null
          id: string
          message_text: string
          metadata: Json | null
          priority: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_user_id: string
          ai_response?: string | null
          created_at?: string | null
          id?: string
          message_text: string
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string
          ai_response?: string | null
          created_at?: string | null
          id?: string
          message_text?: string
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
      app_config: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      assistant_audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action_type"]
          actor_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action_type"]
          actor_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type: string
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action_type"]
          actor_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
          target_user_id?: string | null
          user_agent?: string | null
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
      booking_analytics: {
        Row: {
          booking_link_id: string
          created_at: string
          event_type: string
          id: string
          referrer_url: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_country: string | null
          visitor_ip: string | null
          visitor_timezone: string | null
        }
        Insert: {
          booking_link_id: string
          created_at?: string
          event_type: string
          id?: string
          referrer_url?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_country?: string | null
          visitor_ip?: string | null
          visitor_timezone?: string | null
        }
        Update: {
          booking_link_id?: string
          created_at?: string
          event_type?: string
          id?: string
          referrer_url?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_country?: string | null
          visitor_ip?: string | null
          visitor_timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_analytics_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_links: {
        Row: {
          availability_hours: Json
          buffer_after_minutes: number
          buffer_before_minutes: number
          color: string | null
          created_at: string
          custom_questions: Json | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          location_details: string | null
          location_type: string | null
          max_days_advance: number
          min_notice_hours: number
          require_confirmation: boolean
          send_reminders: boolean
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_hours?: Json
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          color?: string | null
          created_at?: string
          custom_questions?: Json | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_details?: string | null
          location_type?: string | null
          max_days_advance?: number
          min_notice_hours?: number
          require_confirmation?: boolean
          send_reminders?: boolean
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_hours?: Json
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          color?: string | null
          created_at?: string
          custom_questions?: Json | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_details?: string | null
          location_type?: string | null
          max_days_advance?: number
          min_notice_hours?: number
          require_confirmation?: boolean
          send_reminders?: boolean
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booker_email: string
          booker_name: string
          booker_phone: string | null
          booker_timezone: string
          booking_link_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          custom_responses: Json | null
          duration_minutes: number
          end_time: string
          google_calendar_event_id: string | null
          id: string
          reminder_sent_1h: boolean | null
          reminder_sent_24h: boolean | null
          start_time: string
          status: string
          timeline_item_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booker_email: string
          booker_name: string
          booker_phone?: string | null
          booker_timezone: string
          booking_link_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          custom_responses?: Json | null
          duration_minutes: number
          end_time: string
          google_calendar_event_id?: string | null
          id?: string
          reminder_sent_1h?: boolean | null
          reminder_sent_24h?: boolean | null
          start_time: string
          status?: string
          timeline_item_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booker_email?: string
          booker_name?: string
          booker_phone?: string | null
          booker_timezone?: string
          booking_link_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          custom_responses?: Json | null
          duration_minutes?: number
          end_time?: string
          google_calendar_event_id?: string | null
          id?: string
          reminder_sent_1h?: boolean | null
          reminder_sent_24h?: boolean | null
          start_time?: string
          status?: string
          timeline_item_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_timeline_item_id_fkey"
            columns: ["timeline_item_id"]
            isOneToOne: false
            referencedRelation: "timeline_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_timeline_item_id_fkey"
            columns: ["timeline_item_id"]
            isOneToOne: false
            referencedRelation: "user_me_timeline_status"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_log: {
        Row: {
          conflicts_detected: number | null
          created_at: string
          error_details: Json | null
          error_message: string | null
          events_created: number | null
          events_deleted: number | null
          events_fetched: number | null
          events_updated: number | null
          id: string
          items_created: number | null
          items_deleted: number | null
          items_updated: number | null
          status: string
          sync_duration_ms: number | null
          sync_type: string
          user_id: string
        }
        Insert: {
          conflicts_detected?: number | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          events_created?: number | null
          events_deleted?: number | null
          events_fetched?: number | null
          events_updated?: number | null
          id?: string
          items_created?: number | null
          items_deleted?: number | null
          items_updated?: number | null
          status: string
          sync_duration_ms?: number | null
          sync_type: string
          user_id: string
        }
        Update: {
          conflicts_detected?: number | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          events_created?: number | null
          events_deleted?: number | null
          events_fetched?: number | null
          events_updated?: number | null
          id?: string
          items_created?: number | null
          items_deleted?: number | null
          items_updated?: number | null
          status?: string
          sync_duration_ms?: number | null
          sync_type?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_sync_settings: {
        Row: {
          auto_sync_enabled: boolean
          created_at: string
          enabled: boolean
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          selected_calendar_id: string | null
          sync_direction: string
          sync_interval_minutes: number
          target_layer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync_enabled?: boolean
          created_at?: string
          enabled?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          selected_calendar_id?: string | null
          sync_direction?: string
          sync_interval_minutes?: number
          target_layer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync_enabled?: boolean
          created_at?: string
          enabled?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          selected_calendar_id?: string | null
          sync_direction?: string
          sync_interval_minutes?: number
          target_layer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_settings_target_layer_id_fkey"
            columns: ["target_layer_id"]
            isOneToOne: false
            referencedRelation: "timeline_layers"
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
          executive_summary: string | null
          id: string
          message_count: number | null
          project_id: string | null
          started_at: string | null
          status: string | null
          summary_generated_at: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          context_summary?: string | null
          created_at?: string | null
          executive_summary?: string | null
          id?: string
          message_count?: number | null
          project_id?: string | null
          started_at?: string | null
          status?: string | null
          summary_generated_at?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          context_summary?: string | null
          created_at?: string | null
          executive_summary?: string | null
          id?: string
          message_count?: number | null
          project_id?: string | null
          started_at?: string | null
          status?: string | null
          summary_generated_at?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      daily_briefs: {
        Row: {
          ai_insights: string | null
          ai_suggestions: Json | null
          brief_date: string
          brief_html: string | null
          brief_markdown: string | null
          created_at: string
          email_opened: boolean | null
          emailed: boolean | null
          emailed_at: string | null
          generated_at: string
          id: string
          key_decisions: Json | null
          priority_meetings: Json | null
          schedule_overview: Json | null
          tasks_due_today: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_insights?: string | null
          ai_suggestions?: Json | null
          brief_date: string
          brief_html?: string | null
          brief_markdown?: string | null
          created_at?: string
          email_opened?: boolean | null
          emailed?: boolean | null
          emailed_at?: string | null
          generated_at?: string
          id?: string
          key_decisions?: Json | null
          priority_meetings?: Json | null
          schedule_overview?: Json | null
          tasks_due_today?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_insights?: string | null
          ai_suggestions?: Json | null
          brief_date?: string
          brief_html?: string | null
          brief_markdown?: string | null
          created_at?: string
          email_opened?: boolean | null
          emailed?: boolean | null
          emailed_at?: string | null
          generated_at?: string
          id?: string
          key_decisions?: Json | null
          priority_meetings?: Json | null
          schedule_overview?: Json | null
          tasks_due_today?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_planning_sessions: {
        Row: {
          checked_workload: boolean | null
          committed_schedule: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          imported_calendar: boolean | null
          is_quick_planning: boolean
          planning_date: string
          priority_task_ids: string[] | null
          reviewed_yesterday: boolean | null
          set_priorities: boolean | null
          started_at: string
          total_planned_minutes: number | null
          user_id: string
          yesterday_completed_count: number | null
          yesterday_total_count: number | null
        }
        Insert: {
          checked_workload?: boolean | null
          committed_schedule?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          imported_calendar?: boolean | null
          is_quick_planning?: boolean
          planning_date: string
          priority_task_ids?: string[] | null
          reviewed_yesterday?: boolean | null
          set_priorities?: boolean | null
          started_at: string
          total_planned_minutes?: number | null
          user_id: string
          yesterday_completed_count?: number | null
          yesterday_total_count?: number | null
        }
        Update: {
          checked_workload?: boolean | null
          committed_schedule?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          imported_calendar?: boolean | null
          is_quick_planning?: boolean
          planning_date?: string
          priority_task_ids?: string[] | null
          reviewed_yesterday?: boolean | null
          set_priorities?: boolean | null
          started_at?: string
          total_planned_minutes?: number | null
          user_id?: string
          yesterday_completed_count?: number | null
          yesterday_total_count?: number | null
        }
        Relationships: []
      }
      daily_planning_settings: {
        Row: {
          check_workload: boolean
          created_at: string
          duration_minutes: number
          enable_notifications: boolean
          enable_shutdown_ritual: boolean
          id: string
          import_calendar: boolean
          planning_time: string
          quick_planning_enabled: boolean
          review_yesterday: boolean
          set_priorities: boolean
          shutdown_time: string | null
          skip_weekends: boolean
          snooze_duration_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          check_workload?: boolean
          created_at?: string
          duration_minutes?: number
          enable_notifications?: boolean
          enable_shutdown_ritual?: boolean
          id?: string
          import_calendar?: boolean
          planning_time?: string
          quick_planning_enabled?: boolean
          review_yesterday?: boolean
          set_priorities?: boolean
          shutdown_time?: string | null
          skip_weekends?: boolean
          snooze_duration_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          check_workload?: boolean
          created_at?: string
          duration_minutes?: number
          enable_notifications?: boolean
          enable_shutdown_ritual?: boolean
          id?: string
          import_calendar?: boolean
          planning_time?: string
          quick_planning_enabled?: boolean
          review_yesterday?: boolean
          set_priorities?: boolean
          shutdown_time?: string | null
          skip_weekends?: boolean
          snooze_duration_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_shutdown_sessions: {
        Row: {
          challenges: string[] | null
          completed_at: string
          created_at: string
          id: string
          minutes_worked: number | null
          moved_to_tomorrow: string[] | null
          shutdown_date: string
          tasks_completed: number
          tasks_total: number
          user_id: string
          wins: string[] | null
        }
        Insert: {
          challenges?: string[] | null
          completed_at: string
          created_at?: string
          id?: string
          minutes_worked?: number | null
          moved_to_tomorrow?: string[] | null
          shutdown_date: string
          tasks_completed?: number
          tasks_total?: number
          user_id: string
          wins?: string[] | null
        }
        Update: {
          challenges?: string[] | null
          completed_at?: string
          created_at?: string
          id?: string
          minutes_worked?: number | null
          moved_to_tomorrow?: string[] | null
          shutdown_date?: string
          tasks_completed?: number
          tasks_total?: number
          user_id?: string
          wins?: string[] | null
        }
        Relationships: []
      }
      day_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          is_system: boolean
          last_used_at: string | null
          name: string
          template_blocks: Json
          updated_at: string
          usage_count: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          last_used_at?: string | null
          name: string
          template_blocks?: Json
          updated_at?: string
          usage_count?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          last_used_at?: string | null
          name?: string
          template_blocks?: Json
          updated_at?: string
          usage_count?: number
          user_id?: string | null
        }
        Relationships: []
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
      email_sender_patterns: {
        Row: {
          actionable_count: number | null
          auto_category: string | null
          auto_ignore: boolean | null
          auto_priority: number | null
          first_seen: string
          id: string
          ignored_count: number | null
          last_seen: string
          sender_email: string
          spam_count: number | null
          total_emails_received: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actionable_count?: number | null
          auto_category?: string | null
          auto_ignore?: boolean | null
          auto_priority?: number | null
          first_seen?: string
          id?: string
          ignored_count?: number | null
          last_seen?: string
          sender_email: string
          spam_count?: number | null
          total_emails_received?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actionable_count?: number | null
          auto_category?: string | null
          auto_ignore?: boolean | null
          auto_priority?: number | null
          first_seen?: string
          id?: string
          ignored_count?: number | null
          last_seen?: string
          sender_email?: string
          spam_count?: number | null
          total_emails_received?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_tasks: {
        Row: {
          ai_category: string | null
          ai_priority: number | null
          ai_suggested_deadline: string | null
          approved_at: string | null
          converted_at: string | null
          created_at: string
          description: string | null
          email_id: string
          estimated_duration_minutes: number | null
          id: string
          status: string
          timeline_item_id: string | null
          title: string
          updated_at: string
          user_edited_deadline: string | null
          user_edited_description: string | null
          user_edited_priority: number | null
          user_edited_title: string | null
          user_id: string
        }
        Insert: {
          ai_category?: string | null
          ai_priority?: number | null
          ai_suggested_deadline?: string | null
          approved_at?: string | null
          converted_at?: string | null
          created_at?: string
          description?: string | null
          email_id: string
          estimated_duration_minutes?: number | null
          id?: string
          status?: string
          timeline_item_id?: string | null
          title: string
          updated_at?: string
          user_edited_deadline?: string | null
          user_edited_description?: string | null
          user_edited_priority?: number | null
          user_edited_title?: string | null
          user_id: string
        }
        Update: {
          ai_category?: string | null
          ai_priority?: number | null
          ai_suggested_deadline?: string | null
          approved_at?: string | null
          converted_at?: string | null
          created_at?: string
          description?: string | null
          email_id?: string
          estimated_duration_minutes?: number | null
          id?: string
          status?: string
          timeline_item_id?: string | null
          title?: string
          updated_at?: string
          user_edited_deadline?: string | null
          user_edited_description?: string | null
          user_edited_priority?: number | null
          user_edited_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_tasks_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "received_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_tasks_timeline_item_id_fkey"
            columns: ["timeline_item_id"]
            isOneToOne: false
            referencedRelation: "timeline_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_tasks_timeline_item_id_fkey"
            columns: ["timeline_item_id"]
            isOneToOne: false
            referencedRelation: "user_me_timeline_status"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_daily_briefs: {
        Row: {
          auto_generated_insights: Json | null
          brief_date: string
          created_at: string
          executive_id: string
          id: string
          key_points: Json | null
          prepared_by_assistant_id: string | null
          status: Database["public"]["Enums"]["brief_status"]
          summary: string | null
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          auto_generated_insights?: Json | null
          brief_date: string
          created_at?: string
          executive_id: string
          id?: string
          key_points?: Json | null
          prepared_by_assistant_id?: string | null
          status?: Database["public"]["Enums"]["brief_status"]
          summary?: string | null
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          auto_generated_insights?: Json | null
          brief_date?: string
          created_at?: string
          executive_id?: string
          id?: string
          key_points?: Json | null
          prepared_by_assistant_id?: string | null
          status?: Database["public"]["Enums"]["brief_status"]
          summary?: string | null
          updated_at?: string
          viewed_at?: string | null
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
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_updated_from_source: string | null
          source_document_ids: string[] | null
          team_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          ai_generated_content?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_updated_from_source?: string | null
          source_document_ids?: string[] | null
          team_id?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          ai_generated_content?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_updated_from_source?: string | null
          source_document_ids?: string[] | null
          team_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_bases_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
          microsoft_file_id: string | null
          mime_type: string | null
          s3_etag: string | null
          s3_key: string | null
          s3_last_modified: string | null
          server_id: string | null
          tags: string[] | null
          team_id: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          user_id: string
          visibility: string | null
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
          microsoft_file_id?: string | null
          mime_type?: string | null
          s3_etag?: string | null
          s3_key?: string | null
          s3_last_modified?: string | null
          server_id?: string | null
          tags?: string[] | null
          team_id?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          user_id: string
          visibility?: string | null
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
          microsoft_file_id?: string | null
          mime_type?: string | null
          s3_etag?: string | null
          s3_key?: string | null
          s3_last_modified?: string | null
          server_id?: string | null
          tags?: string[] | null
          team_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "google_drive_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_documents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      magnetic_timeline_items: {
        Row: {
          color: string
          created_at: string
          duration_minutes: number
          id: string
          is_flexible: boolean
          is_locked_time: boolean
          original_duration: number | null
          start_time: string
          template_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          duration_minutes: number
          id?: string
          is_flexible?: boolean
          is_locked_time?: boolean
          original_duration?: number | null
          start_time: string
          template_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_flexible?: boolean
          is_locked_time?: boolean
          original_duration?: number | null
          start_time?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "magnetic_timeline_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "magnetic_timeline_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "timeline_templates"
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
      microsoft_drive_folders: {
        Row: {
          created_at: string | null
          drive_id: string
          drive_type: string | null
          folder_name: string
          folder_path: string | null
          id: string
          is_active: boolean | null
          item_id: string
          last_synced_at: string | null
          site_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          drive_id: string
          drive_type?: string | null
          folder_name: string
          folder_path?: string | null
          id?: string
          is_active?: boolean | null
          item_id: string
          last_synced_at?: string | null
          site_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          drive_id?: string
          drive_type?: string | null
          folder_name?: string
          folder_path?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string
          last_synced_at?: string | null
          site_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      microsoft_token_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      microsoft_token_rate_limit: {
        Row: {
          access_count: number | null
          blocked_until: string | null
          created_at: string | null
          updated_at: string | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          access_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          access_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          ai_personality_set: boolean | null
          calendar_connected: boolean | null
          completed: boolean | null
          completed_at: string | null
          created_at: string
          first_plan_generated: boolean | null
          id: string
          planning_time_set: boolean | null
          updated_at: string
          user_id: string
          welcome_completed: boolean | null
        }
        Insert: {
          ai_personality_set?: boolean | null
          calendar_connected?: boolean | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          first_plan_generated?: boolean | null
          id?: string
          planning_time_set?: boolean | null
          updated_at?: string
          user_id: string
          welcome_completed?: boolean | null
        }
        Update: {
          ai_personality_set?: boolean | null
          calendar_connected?: boolean | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          first_plan_generated?: boolean | null
          id?: string
          planning_time_set?: boolean | null
          updated_at?: string
          user_id?: string
          welcome_completed?: boolean | null
        }
        Relationships: []
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
      plan_limits: {
        Row: {
          advanced_ai_features: boolean | null
          ai_daily_briefs_per_month: number
          ai_email_processing_per_month: number
          ai_queries_per_month: number
          assistant_invitations_limit: number | null
          created_at: string
          custom_integrations: boolean | null
          id: string
          plan_tier: string
          priority_support: boolean | null
          storage_limit_gb: number
          team_features: boolean | null
          timeline_items_limit: number | null
          updated_at: string
        }
        Insert: {
          advanced_ai_features?: boolean | null
          ai_daily_briefs_per_month: number
          ai_email_processing_per_month: number
          ai_queries_per_month: number
          assistant_invitations_limit?: number | null
          created_at?: string
          custom_integrations?: boolean | null
          id?: string
          plan_tier: string
          priority_support?: boolean | null
          storage_limit_gb: number
          team_features?: boolean | null
          timeline_items_limit?: number | null
          updated_at?: string
        }
        Update: {
          advanced_ai_features?: boolean | null
          ai_daily_briefs_per_month?: number
          ai_email_processing_per_month?: number
          ai_queries_per_month?: number
          assistant_invitations_limit?: number | null
          created_at?: string
          custom_integrations?: boolean | null
          id?: string
          plan_tier?: string
          priority_support?: boolean | null
          storage_limit_gb?: number
          team_features?: boolean | null
          timeline_items_limit?: number | null
          updated_at?: string
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
      received_emails: {
        Row: {
          ai_category: string | null
          ai_extracted_tasks: Json | null
          ai_priority: number | null
          ai_summary: string | null
          body_html: string | null
          body_text: string
          created_at: string
          email_references: string | null
          from_email: string
          from_name: string | null
          id: string
          ignored_reason: string | null
          in_reply_to: string | null
          message_id: string | null
          processed_at: string | null
          processing_status: string
          received_at: string
          subject: string
          updated_at: string
          user_id: string
          user_reviewed: boolean | null
        }
        Insert: {
          ai_category?: string | null
          ai_extracted_tasks?: Json | null
          ai_priority?: number | null
          ai_summary?: string | null
          body_html?: string | null
          body_text: string
          created_at?: string
          email_references?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          ignored_reason?: string | null
          in_reply_to?: string | null
          message_id?: string | null
          processed_at?: string | null
          processing_status?: string
          received_at?: string
          subject: string
          updated_at?: string
          user_id: string
          user_reviewed?: boolean | null
        }
        Update: {
          ai_category?: string | null
          ai_extracted_tasks?: Json | null
          ai_priority?: number | null
          ai_summary?: string | null
          body_html?: string | null
          body_text?: string
          created_at?: string
          email_references?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          ignored_reason?: string | null
          in_reply_to?: string | null
          message_id?: string | null
          processed_at?: string | null
          processing_status?: string
          received_at?: string
          subject?: string
          updated_at?: string
          user_id?: string
          user_reviewed?: boolean | null
        }
        Relationships: []
      }
      routine_items: {
        Row: {
          auto_add: boolean
          color: string | null
          created_at: string
          days_of_week: number[]
          default_time: string
          duration_minutes: number
          id: string
          is_flexible: boolean
          priority: number | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_add?: boolean
          color?: string | null
          created_at?: string
          days_of_week?: number[]
          default_time: string
          duration_minutes: number
          id?: string
          is_flexible?: boolean
          priority?: number | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_add?: boolean
          color?: string | null
          created_at?: string
          days_of_week?: number[]
          default_time?: string
          duration_minutes?: number
          id?: string
          is_flexible?: boolean
          priority?: number | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
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
          server_id: string | null
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
          server_id?: string | null
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
          server_id?: string | null
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
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_recurring: boolean | null
          parent_task_id: string | null
          planned_duration_minutes: number | null
          priority: number | null
          recurrence_end_date: string | null
          recurrence_pattern: Json | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          parent_task_id?: string | null
          planned_duration_minutes?: number | null
          priority?: number | null
          recurrence_end_date?: string | null
          recurrence_pattern?: Json | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          parent_task_id?: string | null
          planned_duration_minutes?: number | null
          priority?: number | null
          recurrence_end_date?: string | null
          recurrence_pattern?: Json | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invitation_token: string
          invited_by: string
          role: string
          team_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invitation_token?: string
          invited_by: string
          role?: string
          team_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invitation_token?: string
          invited_by?: string
          role?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          joined_at: string | null
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_settings: {
        Row: {
          allow_member_document_upload: boolean | null
          created_at: string | null
          default_document_visibility: string | null
          enable_assistant_features: boolean | null
          require_document_approval: boolean | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          allow_member_document_upload?: boolean | null
          created_at?: string | null
          default_document_visibility?: string | null
          enable_assistant_features?: boolean | null
          require_document_approval?: boolean | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          allow_member_document_upload?: boolean | null
          created_at?: string | null
          default_document_visibility?: string | null
          enable_assistant_features?: boolean | null
          require_document_approval?: boolean | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          max_members: number | null
          name: string
          owner_user_id: string
          slug: string | null
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_members?: number | null
          name: string
          owner_user_id: string
          slug?: string | null
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_members?: number | null
          name?: string
          owner_user_id?: string
          slug?: string | null
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      time_tracking: {
        Row: {
          accuracy_percent: number | null
          actual_duration_minutes: number
          completed_at: string
          created_at: string
          day_of_week: number
          estimated_duration_minutes: number | null
          hour_of_day: number
          id: string
          is_afternoon: boolean | null
          is_evening: boolean | null
          is_morning: boolean | null
          overrun_minutes: number | null
          task_id: string | null
          task_tags: string[] | null
          task_title: string
          task_type: string | null
          user_id: string
        }
        Insert: {
          accuracy_percent?: number | null
          actual_duration_minutes: number
          completed_at: string
          created_at?: string
          day_of_week: number
          estimated_duration_minutes?: number | null
          hour_of_day: number
          id?: string
          is_afternoon?: boolean | null
          is_evening?: boolean | null
          is_morning?: boolean | null
          overrun_minutes?: number | null
          task_id?: string | null
          task_tags?: string[] | null
          task_title: string
          task_type?: string | null
          user_id: string
        }
        Update: {
          accuracy_percent?: number | null
          actual_duration_minutes?: number
          completed_at?: string
          created_at?: string
          day_of_week?: number
          estimated_duration_minutes?: number | null
          hour_of_day?: number
          id?: string
          is_afternoon?: boolean | null
          is_evening?: boolean | null
          is_morning?: boolean | null
          overrun_minutes?: number | null
          task_id?: string | null
          task_tags?: string[] | null
          task_title?: string
          task_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_tracking_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "timeline_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_tracking_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "user_me_timeline_status"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_ai_sessions: {
        Row: {
          ai_response: string | null
          created_at: string | null
          error_message: string | null
          id: string
          input_prompt: string
          items_created: number | null
          items_deleted: number | null
          items_modified: number | null
          metadata: Json | null
          session_type: string
          success: boolean | null
          user_id: string
        }
        Insert: {
          ai_response?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_prompt: string
          items_created?: number | null
          items_deleted?: number | null
          items_modified?: number | null
          metadata?: Json | null
          session_type: string
          success?: boolean | null
          user_id: string
        }
        Update: {
          ai_response?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_prompt?: string
          items_created?: number | null
          items_deleted?: number | null
          items_modified?: number | null
          metadata?: Json | null
          session_type?: string
          success?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      timeline_documents: {
        Row: {
          category: string | null
          checksum: string | null
          created_at: string
          document_date: string | null
          file_size: number
          file_type: string
          file_url: string
          filename: string
          for_user_id: string
          id: string
          is_confidential: boolean | null
          storage_bucket: string | null
          storage_path: string | null
          storage_provider: Database["public"]["Enums"]["storage_provider"]
          tags: string[] | null
          updated_at: string
          upload_date: string
          uploaded_by_user_id: string
        }
        Insert: {
          category?: string | null
          checksum?: string | null
          created_at?: string
          document_date?: string | null
          file_size: number
          file_type: string
          file_url: string
          filename: string
          for_user_id: string
          id?: string
          is_confidential?: boolean | null
          storage_bucket?: string | null
          storage_path?: string | null
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          tags?: string[] | null
          updated_at?: string
          upload_date?: string
          uploaded_by_user_id: string
        }
        Update: {
          category?: string | null
          checksum?: string | null
          created_at?: string
          document_date?: string | null
          file_size?: number
          file_type?: string
          file_url?: string
          filename?: string
          for_user_id?: string
          id?: string
          is_confidential?: boolean | null
          storage_bucket?: string | null
          storage_path?: string | null
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          tags?: string[] | null
          updated_at?: string
          upload_date?: string
          uploaded_by_user_id?: string
        }
        Relationships: []
      }
      timeline_goal_items: {
        Row: {
          contribution_hours: number
          created_at: string | null
          goal_id: string
          id: string
          item_id: string
        }
        Insert: {
          contribution_hours: number
          created_at?: string | null
          goal_id: string
          id?: string
          item_id: string
        }
        Update: {
          contribution_hours?: number
          created_at?: string | null
          goal_id?: string
          id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_goal_items_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "timeline_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_goal_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "timeline_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_goal_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "user_me_timeline_status"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_goals: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          estimated_hours: number | null
          hours_completed: number | null
          id: string
          priority: string | null
          status: string | null
          target_date: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          hours_completed?: number | null
          id?: string
          priority?: string | null
          status?: string | null
          target_date?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          hours_completed?: number | null
          id?: string
          priority?: string | null
          status?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      timeline_items: {
        Row: {
          actual_duration_minutes: number | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          color: string
          completed_at: string | null
          created_at: string | null
          duration_minutes: number
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          is_flexible: boolean | null
          is_locked_time: boolean | null
          is_meeting: boolean
          last_synced_at: string | null
          layer_id: string
          original_duration: number | null
          parent_item_id: string | null
          planned_duration_minutes: number | null
          routine_id: string | null
          start_time: string
          status: string
          sync_source: string | null
          sync_status: string | null
          team_id: string | null
          template_id: string | null
          title: string
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          actual_duration_minutes?: number | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          color: string
          completed_at?: string | null
          created_at?: string | null
          duration_minutes: number
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          is_flexible?: boolean | null
          is_locked_time?: boolean | null
          is_meeting?: boolean
          last_synced_at?: string | null
          layer_id: string
          original_duration?: number | null
          parent_item_id?: string | null
          planned_duration_minutes?: number | null
          routine_id?: string | null
          start_time: string
          status?: string
          sync_source?: string | null
          sync_status?: string | null
          team_id?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          actual_duration_minutes?: number | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          color?: string
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          is_flexible?: boolean | null
          is_locked_time?: boolean | null
          is_meeting?: boolean
          last_synced_at?: string | null
          layer_id?: string
          original_duration?: number | null
          parent_item_id?: string | null
          planned_duration_minutes?: number | null
          routine_id?: string | null
          start_time?: string
          status?: string
          sync_source?: string | null
          sync_status?: string | null
          team_id?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_items_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "timeline_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "timeline_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "user_me_timeline_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_items_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routine_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "timeline_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "timeline_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_layers: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_primary_timeline: boolean | null
          is_visible: boolean | null
          name: string
          sort_order: number
          timeline_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_primary_timeline?: boolean | null
          is_visible?: boolean | null
          name: string
          sort_order: number
          timeline_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_primary_timeline?: boolean | null
          is_visible?: boolean | null
          name?: string
          sort_order?: number
          timeline_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      timeline_parked_items: {
        Row: {
          color: string
          duration_minutes: number
          id: string
          original_layer_id: string | null
          parked_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          color: string
          duration_minutes: number
          id?: string
          original_layer_id?: string | null
          parked_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          color?: string
          duration_minutes?: number
          id?: string
          original_layer_id?: string | null
          parked_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_parked_items_original_layer_id_fkey"
            columns: ["original_layer_id"]
            isOneToOne: false
            referencedRelation: "timeline_layers"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_settings: {
        Row: {
          auto_archive_hours: number | null
          created_at: string | null
          is_locked: boolean | null
          show_completed: boolean | null
          updated_at: string | null
          user_id: string
          zoom_horizontal: number | null
          zoom_vertical: number | null
        }
        Insert: {
          auto_archive_hours?: number | null
          created_at?: string | null
          is_locked?: boolean | null
          show_completed?: boolean | null
          updated_at?: string | null
          user_id: string
          zoom_horizontal?: number | null
          zoom_vertical?: number | null
        }
        Update: {
          auto_archive_hours?: number | null
          created_at?: string | null
          is_locked?: boolean | null
          show_completed?: boolean | null
          updated_at?: string | null
          user_id?: string
          zoom_horizontal?: number | null
          zoom_vertical?: number | null
        }
        Relationships: []
      }
      timeline_templates: {
        Row: {
          category: string
          color: string
          created_at: string | null
          default_start_time: string | null
          description: string | null
          duration_minutes: number
          icon: string | null
          id: string
          is_flexible: boolean | null
          is_locked_time: boolean | null
          is_system_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          color: string
          created_at?: string | null
          default_start_time?: string | null
          description?: string | null
          duration_minutes: number
          icon?: string | null
          id?: string
          is_flexible?: boolean | null
          is_locked_time?: boolean | null
          is_system_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          color?: string
          created_at?: string | null
          default_start_time?: string | null
          description?: string | null
          duration_minutes?: number
          icon?: string | null
          id?: string
          is_flexible?: boolean | null
          is_locked_time?: boolean | null
          is_system_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      upgrade_prompts: {
        Row: {
          action_taken: string | null
          action_taken_at: string | null
          created_at: string
          current_usage: number | null
          feature_name: string | null
          id: string
          prompt_type: string
          shown_at: string
          upgraded_to_plan: string | null
          usage_limit: number | null
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          action_taken_at?: string | null
          created_at?: string
          current_usage?: number | null
          feature_name?: string | null
          id?: string
          prompt_type: string
          shown_at?: string
          upgraded_to_plan?: string | null
          usage_limit?: number | null
          user_id: string
        }
        Update: {
          action_taken?: string | null
          action_taken_at?: string | null
          created_at?: string
          current_usage?: number | null
          feature_name?: string | null
          id?: string
          prompt_type?: string
          shown_at?: string
          upgraded_to_plan?: string | null
          usage_limit?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          feedback_type: string
          id: string
          message: string
          rating: number | null
          status: string
          updated_at: string
          url: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          message: string
          rating?: number | null
          status?: string
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          rating?: number | null
          status?: string
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string
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
      user_microsoft_tokens: {
        Row: {
          created_at: string | null
          encrypted_access_token: string
          encrypted_refresh_token: string | null
          expires_at: string
          id: string
          scope: string | null
          token_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_access_token: string
          encrypted_refresh_token?: string | null
          expires_at: string
          id?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_access_token?: string
          encrypted_refresh_token?: string | null
          expires_at?: string
          id?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_milestones: {
        Row: {
          achieved_at: string
          created_at: string
          id: string
          milestone_type: string
          milestone_value: number | null
          notification_sent_at: string | null
          notified: boolean | null
          user_id: string
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          id?: string
          milestone_type: string
          milestone_value?: number | null
          notification_sent_at?: string | null
          notified?: boolean | null
          user_id: string
        }
        Update: {
          achieved_at?: string
          created_at?: string
          id?: string
          milestone_type?: string
          milestone_value?: number | null
          notification_sent_at?: string | null
          notified?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          features_enabled: Json | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          role_type: Database["public"]["Enums"]["user_role_type"]
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          features_enabled?: Json | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          role_type?: Database["public"]["Enums"]["user_role_type"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          features_enabled?: Json | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          role_type?: Database["public"]["Enums"]["user_role_type"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          model_preference: string
          personal_prompt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_preference?: string
          personal_prompt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_preference?: string
          personal_prompt?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_tier: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          team_id: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_tier?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          team_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_tier?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          team_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage: {
        Row: {
          active_assistants_count: number | null
          ai_daily_briefs_count: number | null
          ai_email_processing_count: number | null
          ai_meeting_prep_count: number | null
          ai_queries_count: number | null
          ai_task_breakdown_count: number | null
          ai_time_insights_count: number | null
          assistant_invitations_sent: number | null
          created_at: string
          documents_uploaded_count: number | null
          id: string
          period_end: string
          period_start: string
          storage_used_bytes: number | null
          timeline_items_created: number | null
          timeline_items_total: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_assistants_count?: number | null
          ai_daily_briefs_count?: number | null
          ai_email_processing_count?: number | null
          ai_meeting_prep_count?: number | null
          ai_queries_count?: number | null
          ai_task_breakdown_count?: number | null
          ai_time_insights_count?: number | null
          assistant_invitations_sent?: number | null
          created_at?: string
          documents_uploaded_count?: number | null
          id?: string
          period_end: string
          period_start: string
          storage_used_bytes?: number | null
          timeline_items_created?: number | null
          timeline_items_total?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_assistants_count?: number | null
          ai_daily_briefs_count?: number | null
          ai_email_processing_count?: number | null
          ai_meeting_prep_count?: number | null
          ai_queries_count?: number | null
          ai_task_breakdown_count?: number | null
          ai_time_insights_count?: number | null
          assistant_invitations_sent?: number | null
          created_at?: string
          documents_uploaded_count?: number | null
          id?: string
          period_end?: string
          period_start?: string
          storage_used_bytes?: number | null
          timeline_items_created?: number | null
          timeline_items_total?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_events_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_data: Json
          event_id: string
          event_type: string
          id: string
          processed: boolean | null
          processed_at: string | null
          retry_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_data: Json
          event_id: string
          event_type: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_data?: Json
          event_id?: string
          event_type?: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      assistant_activity_summary: {
        Row: {
          action: Database["public"]["Enums"]["audit_action_type"] | null
          action_count: number | null
          assistant_id: string | null
          executive_id: string | null
          first_action_at: string | null
          last_action_at: string | null
          resource_type: string | null
        }
        Relationships: []
      }
      planning_streaks: {
        Row: {
          current_streak: number | null
          longest_streak: number | null
          total_streaks: number | null
          user_id: string | null
        }
        Relationships: []
      }
      template_usage_stats: {
        Row: {
          avg_duration: number | null
          category: string | null
          last_used: string | null
          template_id: string | null
          template_name: string | null
          usage_count: number | null
        }
        Relationships: []
      }
      time_tracking_stats: {
        Row: {
          avg_accuracy_percent: number | null
          avg_actual_minutes: number | null
          avg_estimated_minutes: number | null
          avg_overrun_minutes: number | null
          stddev_actual_minutes: number | null
          task_count: number | null
          task_type: string | null
          user_id: string | null
        }
        Relationships: []
      }
      timeline_templates_by_category: {
        Row: {
          category: string | null
          template_count: number | null
          templates: Json | null
        }
        Relationships: []
      }
      user_me_timeline_status: {
        Row: {
          color: string | null
          duration_minutes: number | null
          id: string | null
          is_mine: boolean | null
          layer_id: string | null
          layer_name: string | null
          start_time: string | null
          status: string | null
          title: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_items_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "timeline_layers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_goal_hours_completed: {
        Args: { p_goal_id: string }
        Returns: number
      }
      can_use_feature: {
        Args: {
          p_feature_type: string
          p_increment?: boolean
          p_user_id: string
        }
        Returns: boolean
      }
      can_user_access_timeline_item: {
        Args: { p_item_id: string; p_user_id: string }
        Returns: boolean
      }
      check_assistant_permission: {
        Args: {
          p_assistant_id: string
          p_executive_id: string
          p_permission: string
        }
        Returns: boolean
      }
      check_query_limit: { Args: { p_user_id: string }; Returns: Json }
      cleanup_expired_google_data: { Args: never; Returns: undefined }
      cleanup_expired_google_tokens: { Args: never; Returns: undefined }
      cleanup_old_qa_sessions:
        | { Args: { days_old?: number }; Returns: number }
        | { Args: never; Returns: undefined }
      cleanup_orphaned_calendar_sync_data: {
        Args: { target_user_id: string }
        Returns: number
      }
      create_booking_with_calendar_event: {
        Args: {
          p_booker_email: string
          p_booker_name: string
          p_booker_timezone: string
          p_booking_link_id: string
          p_custom_responses?: Json
          p_start_time: string
        }
        Returns: string
      }
      create_default_routines_for_user: {
        Args: { target_user_id: string }
        Returns: number
      }
      create_item_from_template: {
        Args: {
          p_custom_title?: string
          p_layer_id: string
          p_start_time: string
          p_template_id: string
          p_user_id: string
        }
        Returns: string
      }
      example_function: { Args: { param1: string }; Returns: string }
      get_available_slots: {
        Args: { p_booking_link_id: string; p_date: string; p_timezone?: string }
        Returns: {
          end_time: string
          is_available: boolean
          start_time: string
        }[]
      }
      get_current_streak: { Args: { p_user_id: string }; Returns: number }
      get_current_usage: {
        Args: { p_user_id: string }
        Returns: {
          ai_daily_briefs_limit: number
          ai_daily_briefs_used: number
          ai_queries_limit: number
          ai_queries_percentage: number
          ai_queries_used: number
          plan_tier: string
          storage_limit_gb: number
          storage_used_gb: number
        }[]
      }
      get_current_user_can_view_agent: {
        Args: { p_agent_id: string }
        Returns: boolean
      }
      get_daily_brief_data: {
        Args: { p_date: string; p_user_id: string }
        Returns: Json
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
      get_decrypted_microsoft_token:
        | {
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
        | {
            Args: { p_user_id: string }
            Returns: {
              access_token: string
              expires_at: string
              refresh_token: string
              scope: string
              token_type: string
            }[]
          }
      get_decrypted_server_credentials: {
        Args: { p_config_id: string }
        Returns: string
      }
      get_pending_email_tasks_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_qa_agent_stats:
        | {
            Args: never
            Returns: {
              agent_id: string
              closed_tickets: number
              open_tickets: number
              total_tickets: number
            }[]
          }
        | {
            Args: { p_agent_id: string }
            Returns: {
              avg_session_length: number
              total_collections: number
              total_documents: number
              total_messages: number
              total_sessions: number
            }[]
          }
      get_qa_agent_stats_new: {
        Args: never
        Returns: {
          agent_id: number
          total_collections: number
          total_documents: number
          total_messages: number
        }[]
      }
      get_user_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["user_role_type"]
      }
      get_user_team_ids: {
        Args: { input_user_id: string }
        Returns: {
          team_id: string
        }[]
      }
      get_user_teams: {
        Args: { p_user_id: string }
        Returns: {
          is_owner: boolean
          member_count: number
          team_id: string
          team_name: string
          user_role: string
        }[]
      }
      handle_new_user_v2: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_team_role: {
        Args: { p_role: string; p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      increment_query_count: { Args: { p_user_id: string }; Returns: undefined }
      initialize_onboarding: { Args: { p_user_id: string }; Returns: undefined }
      is_routine_scheduled_for_day: {
        Args: { routine_days: number[]; target_day: number }
        Returns: boolean
      }
      is_team_admin: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      is_time_slot_available: {
        Args: { p_end_time: string; p_start_time: string; p_user_id: string }
        Returns: boolean
      }
      log_assistant_action: {
        Args: {
          p_action: Database["public"]["Enums"]["audit_action_type"]
          p_actor_user_id: string
          p_details?: Json
          p_resource_id: string
          p_resource_type: string
          p_target_user_id: string
        }
        Returns: string
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
      match_documents:
        | {
            Args: { query: string }
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
        | {
            Args: {
              filter?: Json
              match_count?: number
              query_embedding: string
            }
            Returns: {
              content: string
              embedding: string
              id: string
              metadata: Json
              similarity: number
            }[]
          }
      match_memories:
        | {
            Args: {
              filter_agent: string
              match_count: number
              match_threshold: number
              query_embedding: string
              user_filter: string
            }
            Returns: {
              agent: string
              content: string
              id: string
              memory_type: string
              metadata: Json
              similarity: number
            }[]
          }
        | {
            Args: { match_count?: number; query_embedding: string }
            Returns: {
              agent: string
              content: string
              id: string
              memory_type: string
              metadata: Json
              similarity: number
            }[]
          }
        | { Args: never; Returns: undefined }
        | {
            Args: { param1: string; param2: number }
            Returns: {
              id: number
              result: string
            }[]
          }
      match_memories_optimized: {
        Args: never
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
        SetofOptions: {
          from: "*"
          to: "agentic_memories"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      match_qa_documents:
        | {
            Args: {
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
        | {
            Args: {
              match_count?: number
              match_threshold?: number
              p_agent_id?: string
              p_collection_id?: string
              query_embedding: string
            }
            Returns: {
              content: string
              document_name: string
              id: string
              metadata: Json
              similarity: number
            }[]
          }
        | { Args: never; Returns: undefined }
      planning_needed_today: { Args: { p_user_id: string }; Returns: boolean }
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
      store_encrypted_microsoft_token: {
        Args: {
          p_access_token: string
          p_expires_at?: string
          p_ip_address?: unknown
          p_refresh_token?: string
          p_scope?: string
          p_token_type?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: Json
      }
      store_encrypted_server_credentials: {
        Args: { p_config_id: string; p_credentials: string }
        Returns: undefined
      }
      track_milestone: {
        Args: {
          p_milestone_type: string
          p_milestone_value?: number
          p_user_id: string
        }
        Returns: undefined
      }
      update_sender_pattern: {
        Args: {
          p_category: string
          p_is_actionable: boolean
          p_is_ignored: boolean
          p_sender_email: string
          p_user_id: string
        }
        Returns: undefined
      }
      validate_encryption_key_configured: { Args: never; Returns: boolean }
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
      validate_magnetic_timeline_continuity: {
        Args: { p_layer_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      attachment_type: "briefing" | "reference" | "output" | "notes"
      audit_action_type:
        | "create"
        | "update"
        | "delete"
        | "view"
        | "upload"
        | "download"
        | "share"
        | "grant_permission"
        | "revoke_permission"
        | "approve_relationship"
        | "revoke_relationship"
      auth_method:
        | "username_password"
        | "ssh_key"
        | "oauth"
        | "api_key"
        | "certificate"
        | "active_directory"
      brief_status: "draft" | "ready" | "viewed"
      relationship_status: "active" | "pending" | "revoked"
      server_protocol:
        | "smb_cifs"
        | "nfs"
        | "sftp"
        | "ftp"
        | "webdav"
        | "s3"
        | "azure_files"
        | "azure_blob"
      storage_provider: "supabase" | "s3"
      subscription_tier: "starter" | "professional" | "executive"
      user_role_type: "executive" | "assistant" | "standard"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      attachment_type: ["briefing", "reference", "output", "notes"],
      audit_action_type: [
        "create",
        "update",
        "delete",
        "view",
        "upload",
        "download",
        "share",
        "grant_permission",
        "revoke_permission",
        "approve_relationship",
        "revoke_relationship",
      ],
      auth_method: [
        "username_password",
        "ssh_key",
        "oauth",
        "api_key",
        "certificate",
        "active_directory",
      ],
      brief_status: ["draft", "ready", "viewed"],
      relationship_status: ["active", "pending", "revoked"],
      server_protocol: [
        "smb_cifs",
        "nfs",
        "sftp",
        "ftp",
        "webdav",
        "s3",
        "azure_files",
        "azure_blob",
      ],
      storage_provider: ["supabase", "s3"],
      subscription_tier: ["starter", "professional", "executive"],
      user_role_type: ["executive", "assistant", "standard"],
    },
  },
} as const
