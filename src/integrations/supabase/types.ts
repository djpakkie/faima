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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      arrears_notes: {
        Row: {
          created_at: string
          created_by: string | null
          follow_up_date: string | null
          id: string
          loan_id: string
          note: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          loan_id: string
          note: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          loan_id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrears_notes_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          ip_address: string | null
          meta: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          meta?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          meta?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      customer_documents: {
        Row: {
          created_at: string
          customer_id: string
          doc_type: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          doc_type: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          doc_type?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          alt_phone: string | null
          bank_account_number: string | null
          bank_branch_code: string | null
          bank_name: string | null
          created_at: string
          created_by: string | null
          customer_number: string
          date_of_birth: string | null
          email: string | null
          employer: string | null
          employment_status: string | null
          full_name: string
          gender: string | null
          id: string
          id_number: string
          marital_status: string | null
          monthly_income: number | null
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          next_of_kin_relationship: string | null
          notes: string | null
          occupation: string | null
          phone: string
          physical_address: string | null
          postal_address: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alt_phone?: string | null
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_number?: string
          date_of_birth?: string | null
          email?: string | null
          employer?: string | null
          employment_status?: string | null
          full_name: string
          gender?: string | null
          id?: string
          id_number: string
          marital_status?: string | null
          monthly_income?: number | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          notes?: string | null
          occupation?: string | null
          phone: string
          physical_address?: string | null
          postal_address?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          alt_phone?: string | null
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_number?: string
          date_of_birth?: string | null
          email?: string | null
          employer?: string | null
          employment_status?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          id_number?: string
          marital_status?: string | null
          monthly_income?: number | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string
          physical_address?: string | null
          postal_address?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      loan_applications: {
        Row: {
          affordability_ratio: number | null
          affordability_verdict: string | null
          amount: number
          application_number: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          declined_reason: string | null
          existing_debt: number | null
          id: string
          interest_method: string
          interest_rate_percent: number
          monthly_expenses: number | null
          monthly_income: number | null
          notes: string | null
          officer_id: string | null
          product_id: string
          purpose: string | null
          recommended_at: string | null
          recommended_by: string | null
          repayment_frequency: string
          status: string
          term_months: number
          updated_at: string
        }
        Insert: {
          affordability_ratio?: number | null
          affordability_verdict?: string | null
          amount: number
          application_number?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          declined_reason?: string | null
          existing_debt?: number | null
          id?: string
          interest_method: string
          interest_rate_percent: number
          monthly_expenses?: number | null
          monthly_income?: number | null
          notes?: string | null
          officer_id?: string | null
          product_id: string
          purpose?: string | null
          recommended_at?: string | null
          recommended_by?: string | null
          repayment_frequency: string
          status?: string
          term_months: number
          updated_at?: string
        }
        Update: {
          affordability_ratio?: number | null
          affordability_verdict?: string | null
          amount?: number
          application_number?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          declined_reason?: string | null
          existing_debt?: number | null
          id?: string
          interest_method?: string
          interest_rate_percent?: number
          monthly_expenses?: number | null
          monthly_income?: number | null
          notes?: string | null
          officer_id?: string | null
          product_id?: string
          purpose?: string | null
          recommended_at?: string | null
          recommended_by?: string | null
          repayment_frequency?: string
          status?: string
          term_months?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_applications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_applications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "loan_products"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_products: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          insurance_fee_percent: number
          interest_method: string
          interest_rate_percent: number
          late_fee_percent: number
          max_amount: number
          max_term_months: number
          min_amount: number
          min_term_months: number
          name: string
          processing_fee_percent: number
          repayment_frequency: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          insurance_fee_percent?: number
          interest_method?: string
          interest_rate_percent: number
          late_fee_percent?: number
          max_amount: number
          max_term_months: number
          min_amount: number
          min_term_months: number
          name: string
          processing_fee_percent?: number
          repayment_frequency?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          insurance_fee_percent?: number
          interest_method?: string
          interest_rate_percent?: number
          late_fee_percent?: number
          max_amount?: number
          max_term_months?: number
          min_amount?: number
          min_term_months?: number
          name?: string
          processing_fee_percent?: number
          repayment_frequency?: string
          updated_at?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          application_id: string
          closed_at: string | null
          created_at: string
          customer_id: string
          disbursed_at: string
          disbursed_by: string | null
          first_due_date: string
          id: string
          insurance_fee: number
          interest_method: string
          interest_rate_percent: number
          loan_number: string
          maturity_date: string
          outstanding_balance: number
          principal: number
          processing_fee: number
          product_id: string
          repayment_frequency: string
          status: string
          term_months: number
          total_interest: number
          total_repayable: number
          updated_at: string
        }
        Insert: {
          application_id: string
          closed_at?: string | null
          created_at?: string
          customer_id: string
          disbursed_at: string
          disbursed_by?: string | null
          first_due_date: string
          id?: string
          insurance_fee?: number
          interest_method: string
          interest_rate_percent: number
          loan_number?: string
          maturity_date: string
          outstanding_balance?: number
          principal: number
          processing_fee?: number
          product_id: string
          repayment_frequency: string
          status?: string
          term_months: number
          total_interest?: number
          total_repayable?: number
          updated_at?: string
        }
        Update: {
          application_id?: string
          closed_at?: string | null
          created_at?: string
          customer_id?: string
          disbursed_at?: string
          disbursed_by?: string | null
          first_due_date?: string
          id?: string
          insurance_fee?: number
          interest_method?: string
          interest_rate_percent?: number
          loan_number?: string
          maturity_date?: string
          outstanding_balance?: number
          principal?: number
          processing_fee?: number
          product_id?: string
          repayment_frequency?: string
          status?: string
          term_months?: number
          total_interest?: number
          total_repayable?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "loan_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      repayment_schedule: {
        Row: {
          balance_after: number
          created_at: string
          due_date: string
          id: string
          instalment: number
          interest: number
          loan_id: string
          paid_amount: number
          paid_at: string | null
          principal: number
          seq: number
          status: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          due_date: string
          id?: string
          instalment: number
          interest: number
          loan_id: string
          paid_amount?: number
          paid_at?: string | null
          principal: number
          seq: number
          status?: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          due_date?: string
          id?: string
          instalment?: number
          interest?: number
          loan_id?: string
          paid_amount?: number
          paid_at?: string | null
          principal?: number
          seq?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "repayment_schedule_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      repayments: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          method: string
          notes: string | null
          paid_on: string
          penalty: number
          receipt_number: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          method: string
          notes?: string | null
          paid_on?: string
          penalty?: number
          receipt_number?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          method?: string
          notes?: string | null
          paid_on?: string
          penalty?: number
          receipt_number?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      next_application_number: { Args: never; Returns: string }
      next_customer_number: { Args: never; Returns: string }
      next_loan_number: { Args: never; Returns: string }
      next_receipt_number: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "administrator" | "loan_officer" | "finance_officer"
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
      app_role: ["administrator", "loan_officer", "finance_officer"],
    },
  },
} as const
