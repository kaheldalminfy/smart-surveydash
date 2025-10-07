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
  public: {
    Tables: {
      answers: {
        Row: {
          created_at: string | null
          id: string
          numeric_value: number | null
          question_id: string
          response_id: string
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          numeric_value?: number | null
          question_id: string
          response_id: string
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          numeric_value?: number | null
          question_id?: string
          response_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      archives: {
        Row: {
          academic_year: string
          archived_at: string | null
          archived_by: string | null
          data: Json
          data_type: string
          id: string
          is_frozen: boolean | null
          program_id: string | null
          semester: string
        }
        Insert: {
          academic_year: string
          archived_at?: string | null
          archived_by?: string | null
          data: Json
          data_type: string
          id?: string
          is_frozen?: boolean | null
          program_id?: string | null
          semester: string
        }
        Update: {
          academic_year?: string
          archived_at?: string | null
          archived_by?: string | null
          data?: Json
          data_type?: string
          id?: string
          is_frozen?: boolean | null
          program_id?: string | null
          semester?: string
        }
        Relationships: [
          {
            foreignKeyName: "archives_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          academic_year: string | null
          attachments: Json | null
          created_at: string | null
          description: string
          id: string
          program_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          semester: string | null
          status: Database["public"]["Enums"]["complaint_status"] | null
          student_email: string | null
          student_id: string | null
          student_name: string | null
          subject: string
          type: Database["public"]["Enums"]["complaint_type"]
          updated_at: string | null
        }
        Insert: {
          academic_year?: string | null
          attachments?: Json | null
          created_at?: string | null
          description: string
          id?: string
          program_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          semester?: string | null
          status?: Database["public"]["Enums"]["complaint_status"] | null
          student_email?: string | null
          student_id?: string | null
          student_name?: string | null
          subject: string
          type: Database["public"]["Enums"]["complaint_type"]
          updated_at?: string | null
        }
        Update: {
          academic_year?: string | null
          attachments?: Json | null
          created_at?: string | null
          description?: string
          id?: string
          program_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          semester?: string | null
          status?: Database["public"]["Enums"]["complaint_status"] | null
          student_email?: string | null
          student_id?: string | null
          student_name?: string | null
          subject?: string
          type?: Database["public"]["Enums"]["complaint_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          program_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          program_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          program_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          name_en: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          name_en?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          name_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string | null
          id: string
          is_required: boolean | null
          options: Json | null
          order_index: number
          survey_id: string
          text: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          order_index: number
          survey_id: string
          text: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          order_index?: number
          survey_id?: string
          text?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          academic_year: string | null
          assigned_to: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          priority: string | null
          program_id: string | null
          semester: string | null
          source_id: string | null
          source_type: string
          status: Database["public"]["Enums"]["recommendation_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          academic_year?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          priority?: string | null
          program_id?: string | null
          semester?: string | null
          source_id?: string | null
          source_type: string
          status?: Database["public"]["Enums"]["recommendation_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          priority?: string | null
          program_id?: string | null
          semester?: string | null
          source_id?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["recommendation_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          academic_year: string | null
          excel_url: string | null
          generated_at: string | null
          generated_by: string | null
          generated_by_ai: boolean | null
          id: string
          pdf_url: string | null
          recommendations_text: string | null
          semester: string | null
          statistics: Json | null
          summary: string | null
          survey_id: string | null
        }
        Insert: {
          academic_year?: string | null
          excel_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generated_by_ai?: boolean | null
          id?: string
          pdf_url?: string | null
          recommendations_text?: string | null
          semester?: string | null
          statistics?: Json | null
          summary?: string | null
          survey_id?: string | null
        }
        Update: {
          academic_year?: string | null
          excel_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generated_by_ai?: boolean | null
          id?: string
          pdf_url?: string | null
          recommendations_text?: string | null
          semester?: string | null
          statistics?: Json | null
          summary?: string | null
          survey_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          id: string
          respondent_id: string | null
          submitted_at: string | null
          survey_id: string
        }
        Insert: {
          id?: string
          respondent_id?: string | null
          submitted_at?: string | null
          survey_id: string
        }
        Update: {
          id?: string
          respondent_id?: string | null
          submitted_at?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          is_anonymous: boolean | null
          program_id: string | null
          qr_code: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["survey_status"] | null
          survey_link: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_anonymous?: boolean | null
          program_id?: string | null
          qr_code?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["survey_status"] | null
          survey_link?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_anonymous?: boolean | null
          program_id?: string | null
          qr_code?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["survey_status"] | null
          survey_link?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          program_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          program_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          program_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_program: {
        Args: {
          _program_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coordinator" | "faculty" | "dean"
      complaint_status: "pending" | "in_progress" | "resolved" | "closed"
      complaint_type: "academic" | "administrative" | "technical" | "other"
      question_type: "likert" | "mcq" | "text" | "rating"
      recommendation_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "postponed"
      survey_status: "draft" | "active" | "closed"
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
      app_role: ["admin", "coordinator", "faculty", "dean"],
      complaint_status: ["pending", "in_progress", "resolved", "closed"],
      complaint_type: ["academic", "administrative", "technical", "other"],
      question_type: ["likert", "mcq", "text", "rating"],
      recommendation_status: [
        "pending",
        "in_progress",
        "completed",
        "postponed",
      ],
      survey_status: ["draft", "active", "closed"],
    },
  },
} as const
