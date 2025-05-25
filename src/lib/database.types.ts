export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      templates: {
        Row: {
          id: string
          name: string
          content: string
          type: 'contract' | 'invoice' | 'act'
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          content: string
          type: 'contract' | 'invoice' | 'act'
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          content?: string
          type?: 'contract' | 'invoice' | 'act'
          created_at?: string
          user_id?: string
        }
      }
      placeholders: {
        Row: {
          id: string
          template_id: string
          name: string
          value: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          template_id: string
          name: string
          value?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          template_id?: string
          name?: string
          value?: string | null
          created_at?: string
          user_id?: string
        }
      }
      requisites: {
        Row: {
          id: string
          value: string
          type: string
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          value: string
          type: string
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          value?: string
          type?: string
          created_at?: string
          user_id?: string
        }
      }
    }
    Functions: {
      match_requisites: {
        Args: {
          template_id: string
          user_id: string
        }
        Returns: {
          placeholder_id: string
          requisite_value: string
        }[]
      }
    }
  }
}