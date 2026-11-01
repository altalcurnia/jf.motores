// Tipos generados desde el esquema de Supabase (proyecto jf-motores-dev).
// Regenerar después de cada migración.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type CatalogType = Database["public"]["Enums"]["catalog_type"];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      ai_settings: {
        Row: {
          enabled: boolean;
          id: boolean;
          model: string;
          official_domains: string[];
          updated_at: string;
          updated_by: string | null;
          web_verify: boolean;
          budget_base_usd: number;
          budget_per_million_cop_usd: number;
          budget_max_usd: number;
        };
        Insert: {
          enabled?: boolean;
          id?: boolean;
          model?: string;
          official_domains?: string[];
          updated_at?: string;
          updated_by?: string | null;
          web_verify?: boolean;
          budget_base_usd?: number;
          budget_per_million_cop_usd?: number;
          budget_max_usd?: number;
        };
        Update: Partial<Database["public"]["Tables"]["ai_settings"]["Insert"]>;
        Relationships: [];
      };
      ai_usage: {
        Row: { cost_usd: number; month: string; requests: number; tokens_in: number; tokens_out: number; updated_at: string; user_id: string };
        Insert: { cost_usd?: number; month: string; requests?: number; tokens_in?: number; tokens_out?: number; updated_at?: string; user_id: string };
        Update: Partial<Database["public"]["Tables"]["ai_usage"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "ai_usage_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      ai_documents: {
        Row: {
          active: boolean;
          content: string;
          created_at: string;
          created_by: string | null;
          file_path: string | null;
          id: string;
          is_test: boolean;
          title: string;
        };
        Insert: {
          active?: boolean;
          content: string;
          created_at?: string;
          created_by?: string | null;
          file_path?: string | null;
          id?: string;
          is_test?: boolean;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_documents"]["Insert"]>;
        Relationships: [];
      };
      app_waitlist: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          phone: string;
          country: string | null;
          company: string | null;
          role: string | null;
          units_count: string | null;
          site_type: string[];
          signal: string | null;
          plan: string | null;
          priorities: string[];
          site_visits: string | null;
          budget: string | null;
          comments: string | null;
          contact_ok: boolean;
          locale: "es" | "en" | "pt";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          phone: string;
          country?: string | null;
          company?: string | null;
          role?: string | null;
          units_count?: string | null;
          site_type?: string[];
          signal?: string | null;
          plan?: string | null;
          priorities?: string[];
          site_visits?: string | null;
          budget?: string | null;
          comments?: string | null;
          contact_ok?: boolean;
          locale?: "es" | "en" | "pt";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["app_waitlist"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "app_waitlist_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      admin_bootstrap: {
        Row: { email: string };
        Insert: { email: string };
        Update: { email?: string };
        Relationships: [];
      };
      advisors: {
        Row: {
          active: boolean;
          catalogs: CatalogType[];
          countries: string[];
          created_at: string;
          functions: Json;
          id: string;
          is_fallback: boolean;
          languages: string[];
          name: string;
          phone_e164: string;
          photo_path: string | null;
          profile_id: string | null;
          schedule: Json;
          sort: number;
          title: Json;
          updated_at: string;
          weight: number;
        };
        Insert: {
          active?: boolean;
          catalogs?: CatalogType[];
          countries?: string[];
          created_at?: string;
          functions?: Json;
          id?: string;
          is_fallback?: boolean;
          languages?: string[];
          name: string;
          phone_e164: string;
          photo_path?: string | null;
          profile_id?: string | null;
          schedule?: Json;
          sort?: number;
          title?: Json;
          updated_at?: string;
          weight?: number;
        };
        Update: Partial<Database["public"]["Tables"]["advisors"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "advisors_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      audit_log: {
        Row: { action: string; actor: string | null; at: string; diff: Json | null; id: number; record_id: string | null; table_name: string };
        Insert: { action: string; actor?: string | null; at?: string; diff?: Json | null; id?: never; record_id?: string | null; table_name: string };
        Update: { action?: string; actor?: string | null; at?: string; diff?: Json | null; id?: never; record_id?: string | null; table_name?: string };
        Relationships: [];
      };
      branches: {
        Row: {
          active: boolean;
          address: string | null;
          city: string;
          country: string;
          hours: Json;
          id: string;
          lat: number | null;
          lng: number | null;
          name: string;
          phone: string | null;
          sort: number;
        };
        Insert: {
          active?: boolean;
          address?: string | null;
          city: string;
          country?: string;
          hours?: Json;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          name: string;
          phone?: string | null;
          sort?: number;
        };
        Update: Partial<Database["public"]["Tables"]["branches"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          active: boolean;
          catalog: CatalogType;
          created_at: string;
          description: Json;
          engine_part_key: string | null;
          id: string;
          name: Json;
          parent_id: string | null;
          slug: string;
          sort: number;
        };
        Insert: {
          active?: boolean;
          catalog: CatalogType;
          created_at?: string;
          description?: Json;
          engine_part_key?: string | null;
          id?: string;
          name: Json;
          parent_id?: string | null;
          slug: string;
          sort?: number;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "categories_parent_id_fkey"; columns: ["parent_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] },
        ];
      };
      company_settings: {
        Row: {
          email: string | null;
          id: boolean;
          legal_name: string | null;
          nit: string | null;
          phones: Json;
          socials: Json;
          stats: Json;
          texts: Json;
          trade_name: string;
          updated_at: string;
        };
        Insert: {
          email?: string | null;
          id?: boolean;
          legal_name?: string | null;
          nit?: string | null;
          phones?: Json;
          socials?: Json;
          stats?: Json;
          texts?: Json;
          trade_name?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_settings"]["Insert"]>;
        Relationships: [];
      };
      devices: {
        Row: { created_at: string; id: string; key_hash: string; last_seen_at: string | null; unit_id: string };
        Insert: { created_at?: string; id?: string; key_hash: string; last_seen_at?: string | null; unit_id: string };
        Update: { created_at?: string; id?: string; key_hash?: string; last_seen_at?: string | null; unit_id?: string };
        Relationships: [
          { foreignKeyName: "devices_unit_id_fkey"; columns: ["unit_id"]; isOneToOne: true; referencedRelation: "units"; referencedColumns: ["id"] },
        ];
      };
      engine_models: {
        Row: { brand: string; id: string; model: string; notes: string | null; is_demo: boolean };
        Insert: { brand: string; id?: string; model: string; notes?: string | null; is_demo?: boolean };
        Update: { brand?: string; id?: string; model?: string; notes?: string | null; is_demo?: boolean };
        Relationships: [];
      };
      exchange_rates: {
        Row: { currency: string; is_manual: boolean; per_cop: number; updated_at: string };
        Insert: { currency: string; is_manual?: boolean; per_cop: number; updated_at?: string };
        Update: { currency?: string; is_manual?: boolean; per_cop?: number; updated_at?: string };
        Relationships: [];
      };
      forms: {
        Row: { active: boolean; created_at: string; fields: Json; id: string; name: string; placement: string };
        Insert: { active?: boolean; created_at?: string; fields?: Json; id?: string; name: string; placement?: string };
        Update: { active?: boolean; created_at?: string; fields?: Json; id?: string; name?: string; placement?: string };
        Relationships: [];
      };
      leads: {
        Row: {
          advisor_id: string | null;
          catalog: CatalogType | null;
          country: string | null;
          created_at: string;
          currency: string | null;
          customer_id: string | null;
          form_data: Json;
          id: string;
          locale: string | null;
          notes: string | null;
          part_key: string | null;
          price_shown: number | null;
          product_id: string | null;
          rule_id: string | null;
          status: Database["public"]["Enums"]["lead_status"];
          updated_at: string;
          user_agent: string | null;
          utm: Json;
          visitor_id: string | null;
        };
        Insert: {
          advisor_id?: string | null;
          catalog?: CatalogType | null;
          country?: string | null;
          created_at?: string;
          currency?: string | null;
          customer_id?: string | null;
          form_data?: Json;
          id?: string;
          locale?: string | null;
          notes?: string | null;
          part_key?: string | null;
          price_shown?: number | null;
          product_id?: string | null;
          rule_id?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
          user_agent?: string | null;
          utm?: Json;
          visitor_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "leads_advisor_id_fkey"; columns: ["advisor_id"]; isOneToOne: false; referencedRelation: "advisors"; referencedColumns: ["id"] },
          { foreignKeyName: "leads_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "leads_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "leads_rule_id_fkey"; columns: ["rule_id"]; isOneToOne: false; referencedRelation: "routing_rules"; referencedColumns: ["id"] },
        ];
      };
      part_compatibility: {
        Row: { engine_model_id: string | null; id: string; notes: string | null; part_id: string; product_id: string | null };
        Insert: { engine_model_id?: string | null; id?: string; notes?: string | null; part_id: string; product_id?: string | null };
        Update: { engine_model_id?: string | null; id?: string; notes?: string | null; part_id?: string; product_id?: string | null };
        Relationships: [
          { foreignKeyName: "part_compatibility_engine_model_id_fkey"; columns: ["engine_model_id"]; isOneToOne: false; referencedRelation: "engine_models"; referencedColumns: ["id"] },
          { foreignKeyName: "part_compatibility_part_id_fkey"; columns: ["part_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "part_compatibility_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        ];
      };
      permissions: {
        Row: { description: string; key: string };
        Insert: { description: string; key: string };
        Update: { description?: string; key?: string };
        Relationships: [];
      };
      product_images: {
        Row: { alt: Json; id: string; is_reference: boolean; path: string; product_id: string; sort: number };
        Insert: { alt?: Json; id?: string; is_reference?: boolean; path: string; product_id: string; sort?: number };
        Update: { alt?: Json; id?: string; is_reference?: boolean; path?: string; product_id?: string; sort?: number };
        Relationships: [
          { foreignKeyName: "product_images_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        ];
      };
      products: {
        Row: {
          catalog: CatalogType;
          category_id: string | null;
          created_at: string;
          created_by: string | null;
          description: Json;
          engine_model_id: string | null;
          featured: boolean;
          id: string;
          is_demo: boolean;
          model_glb_path: string | null;
          manual_path: string | null;
          manual_public: boolean;
          warranty_months: number | null;
          name: Json;
          price_cop: number | null;
          published_at: string | null;
          ref: string;
          slug: string;
          sold_at: string | null;
          specs: Json;
          status: Database["public"]["Enums"]["product_status"];
          summary: Json;
          updated_at: string;
        };
        Insert: {
          catalog: CatalogType;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: Json;
          engine_model_id?: string | null;
          featured?: boolean;
          id?: string;
          is_demo?: boolean;
          model_glb_path?: string | null;
          manual_path?: string | null;
          manual_public?: boolean;
          warranty_months?: number | null;
          name: Json;
          price_cop?: number | null;
          published_at?: string | null;
          ref: string;
          slug: string;
          sold_at?: string | null;
          specs?: Json;
          status?: Database["public"]["Enums"]["product_status"];
          summary?: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "products_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] },
          { foreignKeyName: "products_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "products_engine_model_id_fkey"; columns: ["engine_model_id"]; isOneToOne: false; referencedRelation: "engine_models"; referencedColumns: ["id"] },
        ];
      };
      profiles: {
        Row: {
          country: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          role_id: number;
          updated_at: string;
          privacy_accepted_at: string | null;
          marketing_opt_in: boolean;
          is_owner: boolean;
          locale: "es" | "en" | "pt";
        };
        Insert: {
          country?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          role_id: number;
          updated_at?: string;
          privacy_accepted_at?: string | null;
          marketing_opt_in?: boolean;
          is_owner?: boolean;
          locale?: "es" | "en" | "pt";
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "profiles_role_id_fkey"; columns: ["role_id"]; isOneToOne: false; referencedRelation: "roles"; referencedColumns: ["id"] },
        ];
      };
      role_permissions: {
        Row: { permission_key: string; role_id: number };
        Insert: { permission_key: string; role_id: number };
        Update: { permission_key?: string; role_id?: number };
        Relationships: [
          { foreignKeyName: "role_permissions_permission_key_fkey"; columns: ["permission_key"]; isOneToOne: false; referencedRelation: "permissions"; referencedColumns: ["key"] },
          { foreignKeyName: "role_permissions_role_id_fkey"; columns: ["role_id"]; isOneToOne: false; referencedRelation: "roles"; referencedColumns: ["id"] },
        ];
      };
      roles: {
        Row: { ai_budget_usd: number | null; description: string | null; id: number; is_internal: boolean; key: string; name: string };
        Insert: { ai_budget_usd?: number | null; description?: string | null; id?: never; is_internal?: boolean; key: string; name: string };
        Update: { ai_budget_usd?: number | null; description?: string | null; id?: never; is_internal?: boolean; key?: string; name?: string };
        Relationships: [];
      };
      routing_rules: {
        Row: {
          active: boolean;
          advisor_ids: string[];
          conditions: Json;
          created_at: string;
          id: string;
          name: string;
          priority: number;
          sticky: boolean;
          strategy: Database["public"]["Enums"]["routing_strategy"];
        };
        Insert: {
          active?: boolean;
          advisor_ids?: string[];
          conditions?: Json;
          created_at?: string;
          id?: string;
          name: string;
          priority?: number;
          sticky?: boolean;
          strategy?: Database["public"]["Enums"]["routing_strategy"];
        };
        Update: Partial<Database["public"]["Tables"]["routing_rules"]["Insert"]>;
        Relationships: [];
      };
      routing_state: {
        Row: { last_index: number; rule_id: string };
        Insert: { last_index?: number; rule_id: string };
        Update: { last_index?: number; rule_id?: string };
        Relationships: [
          { foreignKeyName: "routing_state_rule_id_fkey"; columns: ["rule_id"]; isOneToOne: true; referencedRelation: "routing_rules"; referencedColumns: ["id"] },
        ];
      };
      telemetry: {
        Row: { data: Json; device_id: string; id: number; recorded_at: string };
        Insert: { data: Json; device_id: string; id?: never; recorded_at?: string };
        Update: { data?: Json; device_id?: string; id?: never; recorded_at?: string };
        Relationships: [
          { foreignKeyName: "telemetry_device_id_fkey"; columns: ["device_id"]; isOneToOne: false; referencedRelation: "devices"; referencedColumns: ["id"] },
        ];
      };
      units: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          owner_id: string | null;
          product_id: string | null;
          serial: string | null;
          sold_at: string | null;
          price_cop: number | null;
          channel: "presencial" | "whatsapp" | "web" | "otro";
          sold_by: string | null;
          notified_at: string | null;
          warranty_start: string | null;
          warranty_end: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          owner_id?: string | null;
          product_id?: string | null;
          serial?: string | null;
          sold_at?: string | null;
          price_cop?: number | null;
          channel?: "presencial" | "whatsapp" | "web" | "otro";
          sold_by?: string | null;
          notified_at?: string | null;
          warranty_start?: string | null;
          warranty_end?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["units"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "units_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "units_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "units_sold_by_fkey"; columns: ["sold_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      accept_privacy: { Args: Record<string, never>; Returns: undefined };
      set_user_role: { Args: { target: string; role_key: string }; Returns: undefined };
      set_role_permission: { Args: { role_key: string; permission_key: string; granted: boolean }; Returns: undefined };
      set_role_all_permissions: { Args: { role_key: string; granted: boolean }; Returns: undefined };
      create_role: { Args: { role_name: string; role_description?: string | null; internal?: boolean; copy_from?: string | null }; Returns: string };
      update_role: { Args: { role_key: string; role_name: string; role_description?: string | null }; Returns: undefined };
      delete_role: { Args: { role_key: string }; Returns: undefined };
      owner_unlock: { Args: { password: string }; Returns: Json };
      owner_lock: { Args: Record<string, never>; Returns: undefined };
      owner_unlock_status: { Args: Record<string, never>; Returns: string | null };
      owner_unlock_scope: { Args: { password: string; scope: string }; Returns: Json };
      owner_lock_scope: { Args: { scope: string }; Returns: undefined };
      owner_scope_status: { Args: Record<string, never>; Returns: Json };
      set_role_ai_budget: { Args: { role_key: string; usd: number }; Returns: undefined };
      find_customer: {
        Args: { customer_email: string };
        Returns: { id: string; full_name: string | null; email: string; phone: string | null; country: string | null; purchases: number }[];
      };
      register_sale: {
        Args: {
          product: string;
          customer_email: string;
          serial?: string | null;
          price_cop?: number | null;
          channel?: string;
          sold_on?: string | null;
          notes?: string | null;
          mark_sold?: boolean;
          warranty_months?: number | null;
        };
        Returns: string;
      };
      assistant_context: { Args: Record<string, never>; Returns: Json };
      ai_budget: { Args: Record<string, never>; Returns: Json };
      ai_charge: { Args: { cost: number; tokens_in: number; tokens_out: number }; Returns: undefined };
      list_customers: {
        Args: Record<string, never>;
        Returns: { id: string; email: string; full_name: string | null; phone: string | null; purchases: number }[];
      };
      set_unit_warranty: { Args: { unit: string; starts: string; months: number | null }; Returns: undefined };
      delete_sale: { Args: { unit: string }; Returns: undefined };
    };
    Enums: {
      catalog_type: "motobomba" | "motor" | "repuesto";
      lead_status: "nuevo" | "contactado" | "cotizado" | "vendido" | "perdido";
      product_status: "borrador" | "disponible" | "vendido";
      routing_strategy: "fijo" | "rotacion" | "ponderada" | "eleccion";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
