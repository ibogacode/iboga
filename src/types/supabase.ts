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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          is_group: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      medical_history_forms: {
        Row: {
          allergies: string | null
          cardiac_evaluation: string | null
          created_at: string | null
          current_health_status: string | null
          date_of_birth: string | null
          dietary_lifestyle_habits: string | null
          difficulties_chewing_swallowing: string | null
          digestive_health: string | null
          email: string
          emergency_contact_name: string
          emergency_contact_phone: string
          family_personal_health_info: string | null
          first_name: string
          food_allergies_intolerance: string | null
          gender: string | null
          height: string | null
          hormonal_health: string | null
          id: string
          immune_health: string | null
          intake_form_id: string | null
          is_pregnant: boolean | null
          last_name: string
          liver_function_tests: string | null
          medical_conditions: string | null
          medications_medical_use: string | null
          medications_mental_health: string | null
          mental_health_conditions: string | null
          mental_health_treatment: string | null
          metabolic_health_concerns: string | null
          other_physicians: string | null
          pain_stiffness_swelling: string | null
          phone_number: string
          physical_activity_exercise: string | null
          physical_examination_records: string | null
          practitioners_therapists: string | null
          previous_psychedelics_experiences: string | null
          primary_care_provider: string | null
          reason_for_coming: string | null
          reproductive_health: string | null
          signature_data: string | null
          signature_date: string
          substance_use_history: string | null
          updated_at: string | null
          uploaded_file_name: string | null
          uploaded_file_url: string | null
          weight: string | null
        }
        Insert: {
          allergies?: string | null
          cardiac_evaluation?: string | null
          created_at?: string | null
          current_health_status?: string | null
          date_of_birth?: string | null
          dietary_lifestyle_habits?: string | null
          difficulties_chewing_swallowing?: string | null
          digestive_health?: string | null
          email: string
          emergency_contact_name: string
          emergency_contact_phone: string
          family_personal_health_info?: string | null
          first_name: string
          food_allergies_intolerance?: string | null
          gender?: string | null
          height?: string | null
          hormonal_health?: string | null
          id?: string
          immune_health?: string | null
          intake_form_id?: string | null
          is_pregnant?: boolean | null
          last_name: string
          liver_function_tests?: string | null
          medical_conditions?: string | null
          medications_medical_use?: string | null
          medications_mental_health?: string | null
          mental_health_conditions?: string | null
          mental_health_treatment?: string | null
          metabolic_health_concerns?: string | null
          other_physicians?: string | null
          pain_stiffness_swelling?: string | null
          phone_number: string
          physical_activity_exercise?: string | null
          physical_examination_records?: string | null
          practitioners_therapists?: string | null
          previous_psychedelics_experiences?: string | null
          primary_care_provider?: string | null
          reason_for_coming?: string | null
          reproductive_health?: string | null
          signature_data?: string | null
          signature_date: string
          substance_use_history?: string | null
          updated_at?: string | null
          uploaded_file_name?: string | null
          uploaded_file_url?: string | null
          weight?: string | null
        }
        Update: {
          allergies?: string | null
          cardiac_evaluation?: string | null
          created_at?: string | null
          current_health_status?: string | null
          date_of_birth?: string | null
          dietary_lifestyle_habits?: string | null
          difficulties_chewing_swallowing?: string | null
          digestive_health?: string | null
          email?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          family_personal_health_info?: string | null
          first_name?: string
          food_allergies_intolerance?: string | null
          gender?: string | null
          height?: string | null
          hormonal_health?: string | null
          id?: string
          immune_health?: string | null
          intake_form_id?: string | null
          is_pregnant?: boolean | null
          last_name?: string
          liver_function_tests?: string | null
          medical_conditions?: string | null
          medications_medical_use?: string | null
          medications_mental_health?: string | null
          mental_health_conditions?: string | null
          mental_health_treatment?: string | null
          metabolic_health_concerns?: string | null
          other_physicians?: string | null
          pain_stiffness_swelling?: string | null
          phone_number?: string
          physical_activity_exercise?: string | null
          physical_examination_records?: string | null
          practitioners_therapists?: string | null
          previous_psychedelics_experiences?: string | null
          primary_care_provider?: string | null
          reason_for_coming?: string | null
          reproductive_health?: string | null
          signature_data?: string | null
          signature_date?: string
          substance_use_history?: string | null
          updated_at?: string | null
          uploaded_file_name?: string | null
          uploaded_file_url?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_history_forms_intake_form_id_fkey"
            columns: ["intake_form_id"]
            isOneToOne: false
            referencedRelation: "patient_intake_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          is_deleted: boolean | null
          media_url: string | null
          read_at: string | null
          reply_to: string | null
          sender_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          is_deleted?: boolean | null
          media_url?: string | null
          read_at?: string | null
          reply_to?: string | null
          sender_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          is_deleted?: boolean | null
          media_url?: string | null
          read_at?: string | null
          reply_to?: string | null
          sender_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      partial_intake_forms: {
        Row: {
          address: string | null
          city: string | null
          completed_at: string | null
          completed_form_id: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          email_sent_at: string | null
          emergency_contact_address: string | null
          emergency_contact_email: string | null
          emergency_contact_first_name: string | null
          emergency_contact_last_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          expires_at: string | null
          filled_by: string | null
          filler_email: string | null
          filler_first_name: string | null
          filler_last_name: string | null
          filler_phone: string | null
          filler_relationship: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          mode: string
          phone_number: string | null
          program_type: string | null
          recipient_email: string
          recipient_name: string | null
          state: string | null
          token: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          completed_at?: string | null
          completed_form_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_sent_at?: string | null
          emergency_contact_address?: string | null
          emergency_contact_email?: string | null
          emergency_contact_first_name?: string | null
          emergency_contact_last_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          expires_at?: string | null
          filled_by?: string | null
          filler_email?: string | null
          filler_first_name?: string | null
          filler_last_name?: string | null
          filler_phone?: string | null
          filler_relationship?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          mode: string
          phone_number?: string | null
          program_type?: string | null
          recipient_email: string
          recipient_name?: string | null
          state?: string | null
          token: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          completed_at?: string | null
          completed_form_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_sent_at?: string | null
          emergency_contact_address?: string | null
          emergency_contact_email?: string | null
          emergency_contact_first_name?: string | null
          emergency_contact_last_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          expires_at?: string | null
          filled_by?: string | null
          filler_email?: string | null
          filler_first_name?: string | null
          filler_last_name?: string | null
          filler_phone?: string | null
          filler_relationship?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          mode?: string
          phone_number?: string | null
          program_type?: string | null
          recipient_email?: string
          recipient_name?: string | null
          state?: string | null
          token?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partial_intake_forms_completed_form_id_fkey"
            columns: ["completed_form_id"]
            isOneToOne: false
            referencedRelation: "patient_intake_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_intake_forms: {
        Row: {
          address: string | null
          calendar_link_clicked_at: string | null
          city: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          email_sent_at: string | null
          emergency_contact_address: string | null
          emergency_contact_email: string | null
          emergency_contact_first_name: string
          emergency_contact_last_name: string
          emergency_contact_phone: string
          emergency_contact_relationship: string | null
          filled_by: string | null
          filler_email: string | null
          filler_first_name: string | null
          filler_last_name: string | null
          filler_phone: string | null
          filler_relationship: string | null
          first_name: string
          gender: string | null
          id: string
          ip_address: unknown
          last_name: string
          phone_number: string
          privacy_policy_accepted: boolean
          program_type: string | null
          state: string | null
          tracking_token: string | null
          updated_at: string | null
          user_agent: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          calendar_link_clicked_at?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          email_sent_at?: string | null
          emergency_contact_address?: string | null
          emergency_contact_email?: string | null
          emergency_contact_first_name: string
          emergency_contact_last_name: string
          emergency_contact_phone: string
          emergency_contact_relationship?: string | null
          filled_by?: string | null
          filler_email?: string | null
          filler_first_name?: string | null
          filler_last_name?: string | null
          filler_phone?: string | null
          filler_relationship?: string | null
          first_name: string
          gender?: string | null
          id?: string
          ip_address?: unknown
          last_name: string
          phone_number: string
          privacy_policy_accepted?: boolean
          program_type?: string | null
          state?: string | null
          tracking_token?: string | null
          updated_at?: string | null
          user_agent?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          calendar_link_clicked_at?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          email_sent_at?: string | null
          emergency_contact_address?: string | null
          emergency_contact_email?: string | null
          emergency_contact_first_name?: string
          emergency_contact_last_name?: string
          emergency_contact_phone?: string
          emergency_contact_relationship?: string | null
          filled_by?: string | null
          filler_email?: string | null
          filler_first_name?: string | null
          filler_last_name?: string | null
          filler_phone?: string | null
          filler_relationship?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          ip_address?: unknown
          last_name?: string
          phone_number?: string
          privacy_policy_accepted?: boolean
          program_type?: string | null
          state?: string | null
          tracking_token?: string | null
          updated_at?: string | null
          user_agent?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          designation: string | null
          email: string
          first_name: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          is_online: boolean | null
          last_name: string | null
          last_seen_at: string | null
          must_change_password: boolean | null
          name: string | null
          pay_rate_per_hour: number | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          designation?: string | null
          email: string
          first_name?: string | null
          gender?: string | null
          id: string
          is_active?: boolean | null
          is_online?: boolean | null
          last_name?: string | null
          last_seen_at?: string | null
          must_change_password?: boolean | null
          name?: string | null
          pay_rate_per_hour?: number | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          designation?: string | null
          email?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          last_name?: string | null
          last_seen_at?: string | null
          must_change_password?: boolean | null
          name?: string | null
          pay_rate_per_hour?: number | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_agreements: {
        Row: {
          created_at: string | null
          created_by: string | null
          deposit_amount: number
          deposit_percentage: number
          id: string
          intake_form_id: string | null
          patient_email: string
          patient_first_name: string
          patient_id: string | null
          patient_last_name: string
          patient_phone_number: string
          patient_signature_data: string | null
          patient_signature_date: string
          patient_signature_first_name: string
          patient_signature_last_name: string
          patient_signature_name: string
          payment_method: string
          provider_signature_data: string | null
          provider_signature_date: string
          provider_signature_first_name: string
          provider_signature_last_name: string
          provider_signature_name: string
          remaining_balance: number
          total_program_fee: number
          updated_at: string | null
          uploaded_file_name: string | null
          uploaded_file_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deposit_amount: number
          deposit_percentage: number
          id?: string
          intake_form_id?: string | null
          patient_email: string
          patient_first_name: string
          patient_id?: string | null
          patient_last_name: string
          patient_phone_number: string
          patient_signature_data?: string | null
          patient_signature_date: string
          patient_signature_first_name: string
          patient_signature_last_name: string
          patient_signature_name: string
          payment_method: string
          provider_signature_data?: string | null
          provider_signature_date: string
          provider_signature_first_name: string
          provider_signature_last_name: string
          provider_signature_name: string
          remaining_balance: number
          total_program_fee: number
          updated_at?: string | null
          uploaded_file_name?: string | null
          uploaded_file_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deposit_amount?: number
          deposit_percentage?: number
          id?: string
          intake_form_id?: string | null
          patient_email?: string
          patient_first_name?: string
          patient_id?: string | null
          patient_last_name?: string
          patient_phone_number?: string
          patient_signature_data?: string | null
          patient_signature_date?: string
          patient_signature_first_name?: string
          patient_signature_last_name?: string
          patient_signature_name?: string
          payment_method?: string
          provider_signature_data?: string | null
          provider_signature_date?: string
          provider_signature_first_name?: string
          provider_signature_last_name?: string
          provider_signature_name?: string
          remaining_balance?: number
          total_program_fee?: number
          updated_at?: string | null
          uploaded_file_name?: string | null
          uploaded_file_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_agreements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_agreements_intake_form_id_fkey"
            columns: ["intake_form_id"]
            isOneToOne: false
            referencedRelation: "patient_intake_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_agreements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_conversation_with_participants: {
        Args: { p_other_user_id: string }
        Returns: string
      }
      delete_conversation: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      get_chat_contacts: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: string
        }[]
      }
      get_conversation_members: {
        Args: { _conversation_id: string }
        Returns: {
          avatar_url: string
          email: string
          first_name: string
          is_online: boolean
          joined_at: string
          last_name: string
          last_read_at: string
          last_seen_at: string
          role: string
          user_id: string
        }[]
      }
      get_conversation_with_status: {
        Args: { p_conversation_id: string }
        Returns: {
          is_online: boolean
          last_seen_at: string
          other_user_avatar: string
          other_user_id: string
          other_user_name: string
          other_user_role: string
        }[]
      }
      get_unread_count: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: number
      }
      get_user_conversations: {
        Args: { p_limit: number; p_offset: number; p_user_id: string }
        Returns: {
          created_at: string
          id: string
          is_group: boolean
          last_message_at: string
          last_message_preview: string
          name: string
          participants: Json
          unread_count: number
          updated_at: string
        }[]
      }
      is_conversation_member: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_member_of: { Args: { _conversation_id: string }; Returns: boolean }
      mark_messages_as_read:
        | { Args: { p_conversation_id: string }; Returns: undefined }
        | {
            Args: { p_conversation_id: string; p_user_id: string }
            Returns: number
          }
      update_online_status: {
        Args: { p_is_online: boolean }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
