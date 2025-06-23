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
      academic_years: {
        Row: {
          end_date: string
          id: string
          name: string
          school_id: string
          start_date: string
        }
        Insert: {
          end_date: string
          id?: string
          name: string
          school_id: string
          start_date: string
        }
        Update: {
          end_date?: string
          id?: string
          name?: string
          school_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_offerings: {
        Row: {
          assignment_type: string | null
          class_id: string
          course_id: string
          id: string
          periods_per_week: number
          required_hours_per_term: number | null
          term_id: string
        }
        Insert: {
          assignment_type?: string | null
          class_id: string
          course_id: string
          id?: string
          periods_per_week: number
          required_hours_per_term?: number | null
          term_id: string
        }
        Update: {
          assignment_type?: string | null
          class_id?: string
          course_id?: string
          id?: string
          periods_per_week?: number
          required_hours_per_term?: number | null
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_offerings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_offerings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_offerings_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          grade_level: number
          id: string
          name: string
          school_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          grade_level: number
          id?: string
          name: string
          school_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          grade_level?: number
          id?: string
          name?: string
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string | null
          department_id: string
          grade_level: number
          hours_distribution_type: string | null
          id: string
          name: string
          school_id: string
          term_hours: Json | null
          total_hours_per_year: number | null
        }
        Insert: {
          code?: string | null
          department_id: string
          grade_level: number
          hours_distribution_type?: string | null
          id?: string
          name: string
          school_id: string
          term_hours?: Json | null
          total_hours_per_year?: number | null
        }
        Update: {
          code?: string | null
          department_id?: string
          grade_level?: number
          hours_distribution_type?: string | null
          id?: string
          name?: string
          school_id?: string
          term_hours?: Json | null
          total_hours_per_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          school_id: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          school_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          date: string
          id: string
          reason: string
          term_id: string
        }
        Insert: {
          date: string
          id?: string
          reason: string
          term_id: string
        }
        Update: {
          date?: string
          id?: string
          reason?: string
          term_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          role: string | null
          school_id: string | null
        }
        Insert: {
          id: string
          role?: string | null
          school_id?: string | null
        }
        Update: {
          id?: string
          role?: string | null
          school_id?: string | null
        }
        Relationships: []
      }
      rooms: {
        Row: {
          capacity: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          room_type: string
          school_id: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          room_type: string
          school_id: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          room_type?: string
          school_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_lessons: {
        Row: {
          date: string
          id: number
          teaching_assignment_id: string
          timeslot_id: string
        }
        Insert: {
          date: string
          id?: number
          teaching_assignment_id: string
          timeslot_id: string
        }
        Update: {
          date?: string
          id?: number
          teaching_assignment_id?: string
          timeslot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_lessons_teaching_assignment_id_fkey"
            columns: ["teaching_assignment_id"]
            isOneToOne: false
            referencedRelation: "teaching_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          end_time: string | null
          id: string
          name: string
          period_duration: number | null
          sessions_per_day: number | null
          start_time: string | null
          user_id: string | null
          working_days: string[] | null
        }
        Insert: {
          end_time?: string | null
          id?: string
          name: string
          period_duration?: number | null
          sessions_per_day?: number | null
          start_time?: string | null
          user_id?: string | null
          working_days?: string[] | null
        }
        Update: {
          end_time?: string | null
          id?: string
          name?: string
          period_duration?: number | null
          sessions_per_day?: number | null
          start_time?: string | null
          user_id?: string | null
          working_days?: string[] | null
        }
        Relationships: []
      }
      subject_grade_mappings: {
        Row: {
          created_at: string | null
          department_id: string
          grade_level: number
          id: string
          is_required: boolean | null
          periods_per_week: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id: string
          grade_level: number
          id?: string
          is_required?: boolean | null
          periods_per_week?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string
          grade_level?: number
          id?: string
          is_required?: boolean | null
          periods_per_week?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_grade_mappings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_departments: {
        Row: {
          created_at: string | null
          department_id: string
          id: string
          is_primary: boolean | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id: string
          id?: string
          is_primary?: boolean | null
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string
          id?: string
          is_primary?: boolean | null
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_departments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_time_constraints: {
        Row: {
          constraint_type: string
          created_at: string | null
          id: string
          priority: number | null
          reason: string | null
          teacher_id: string
          time_slot_id: string
        }
        Insert: {
          constraint_type: string
          created_at?: string | null
          id?: string
          priority?: number | null
          reason?: string | null
          teacher_id: string
          time_slot_id: string
        }
        Update: {
          constraint_type?: string
          created_at?: string | null
          id?: string
          priority?: number | null
          reason?: string | null
          teacher_id?: string
          time_slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_time_constraints_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_time_constraints_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          email: string
          first_name: string
          id: string
          last_name: string
          max_periods_per_week: number | null
          school_id: string
        }
        Insert: {
          email: string
          first_name: string
          id?: string
          last_name: string
          max_periods_per_week?: number | null
          school_id: string
        }
        Update: {
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          max_periods_per_week?: number | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_assignments: {
        Row: {
          assigned_at: string | null
          assignment_type: string | null
          class_offering_id: string
          id: string
          school_id: string
          teacher_id: string
        }
        Insert: {
          assigned_at?: string | null
          assignment_type?: string | null
          class_offering_id: string
          id?: string
          school_id: string
          teacher_id: string
        }
        Update: {
          assigned_at?: string | null
          assignment_type?: string | null
          class_offering_id?: string
          id?: string
          school_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_assignments_class_offering_id_fkey"
            columns: ["class_offering_id"]
            isOneToOne: false
            referencedRelation: "class_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          academic_year_id: string
          end_date: string
          id: string
          name: string
          period_duration_minutes: number | null
          start_date: string
        }
        Insert: {
          academic_year_id: string
          end_date: string
          id?: string
          name: string
          period_duration_minutes?: number | null
          start_date: string
        }
        Update: {
          academic_year_id?: string
          end_date?: string
          id?: string
          name?: string
          period_duration_minutes?: number | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slots: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          is_teaching_period: boolean | null
          period_number: number | null
          school_id: string
          slot_name: string | null
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          is_teaching_period?: boolean | null
          period_number?: number | null
          school_id: string
          slot_name?: string | null
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          is_teaching_period?: boolean | null
          period_number?: number | null
          school_id?: string
          slot_name?: string | null
          start_time?: string
        }
        Relationships: []
      }
      timetable_generations: {
        Row: {
          generated_at: string | null
          generated_by: string | null
          id: string
          notes: string | null
          status: string
          term_id: string
        }
        Insert: {
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          term_id: string
        }
        Update: {
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          term_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      curriculum_structure_guide: {
        Row: {
          concept: string | null
          description: string | null
          table_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_class_section: {
        Args: { p_school_id: string; p_grade_level: number; p_name: string }
        Returns: string
      }
      delete_class_safely: {
        Args: { class_id: string }
        Returns: {
          success: boolean
          message: string
          deleted_offerings: number
          deleted_mappings: number
          deleted_assignments: number
        }[]
      }
      explain_class_structure: {
        Args: Record<PropertyKey, never>
        Returns: {
          component: string
          purpose: string
          key_fields: string
        }[]
      }
      explain_curriculum_structure: {
        Args: Record<PropertyKey, never>
        Returns: {
          component: string
          purpose: string
          key_fields: string
        }[]
      }
      get_class_section_curriculum_summary: {
        Args: { p_class_id: string; p_term_id: string }
        Returns: {
          total_offerings: number
          total_periods_per_week: number
          total_hours_per_term: number
          assigned_offerings: number
          unassigned_offerings: number
        }[]
      }
      get_curriculum_consistency_report: {
        Args: { p_school_id?: string }
        Returns: {
          class_name: string
          course_name: string
          periods_per_week: number
          required_hours_per_term: number
          expected_hours: number
          variance_hours: number
          status: string
          recommendation: string
        }[]
      }
      get_schema_overview: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          purpose: string
          single_source_of_truth: boolean
          key_relationships: string
        }[]
      }
      get_teacher_department_summary: {
        Args: { p_teacher_id: string }
        Returns: {
          department_id: string
          department_name: string
          department_code: string
          is_primary: boolean
          course_count: number
          courses: string[]
        }[]
      }
      get_teacher_qualifications: {
        Args: { p_teacher_id: string }
        Returns: {
          course_id: string
          course_name: string
          course_code: string
          department_id: string
          department_name: string
          grade_level: number
          is_primary_department: boolean
        }[]
      }
      get_teachers_for_course: {
        Args: { p_course_id: string }
        Returns: {
          teacher_id: string
          teacher_name: string
          teacher_email: string
          department_id: string
          department_name: string
          is_primary_department: boolean
        }[]
      }
      my_function_name: {
        Args: { p_class_id: string }
        Returns: undefined
      }
      preview_class_deletion: {
        Args: { class_id: string }
        Returns: {
          class_name: string
          offerings_count: number
          mappings_count: number
          assignments_count: number
          courses_affected: string[]
          teachers_affected: string[]
        }[]
      }
      validate_curriculum_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          validation_type: string
          message: string
          offering_id: string
        }[]
      }
      validate_curriculum_hours: {
        Args: {
          p_periods_per_week: number
          p_required_hours_per_term: number
          p_period_duration_minutes?: number
          p_weeks_per_term?: number
        }
        Returns: {
          is_valid: boolean
          expected_hours: number
          variance_hours: number
          message: string
        }[]
      }
      validate_schema_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          validation_type: string
          message: string
          severity: string
        }[]
      }
    }
    Enums: {
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      time_slot_type: "lecture" | "lab" | "tutorial" | "other"
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
    Enums: {
      day_of_week: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      time_slot_type: ["lecture", "lab", "tutorial", "other"],
    },
  },
} as const
