// ============================================================================
// Supabase-compatible TypeScript types for Street Dog App
// Generated from supabase/migrations/001_initial_schema.sql
// ============================================================================

// -- Enum types (matching PostgreSQL enums) --

export type UserRole = "user" | "rescuer" | "admin";
export type ReportType = "issue" | "health" | "feedback" | "other";
export type ReportStatus = "open" | "in_progress" | "resolved";
export type DogCharacter =
  | "friendly"
  | "very_friendly"
  | "indifferent"
  | "sleeping"
  | "afraid"
  | "aggressive";
export type DogGender = "male" | "female" | "unknown";
export type DogAge = "puppy" | "young" | "adult" | "old";

// -- Table Row / Insert / Update types --

export interface ProfileRow {
  id: string;
  email: string;
  nickname: string | null;
  role: UserRole;
  is_banned: boolean;
  ocr_usage_count: number;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  email: string;
  nickname?: string | null;
  role?: UserRole;
  is_banned?: boolean;
  ocr_usage_count?: number;
  last_activity?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  email?: string;
  nickname?: string | null;
  role?: UserRole;
  is_banned?: boolean;
  ocr_usage_count?: number;
  last_activity?: string;
  updated_at?: string;
}

export interface DogRow {
  id: string;
  ear_tag_id: string | null;
  names: string[];
  images: string[];
  ear_tag_image: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_sighting_date: string | null;
  character: DogCharacter | null;
  size: number | null;
  gender: DogGender | null;
  age: DogAge | null;
  first_registered_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DogInsert {
  id?: string;
  ear_tag_id?: string | null;
  names?: string[];
  images?: string[];
  ear_tag_image?: string | null;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_sighting_date?: string | null;
  character?: DogCharacter | null;
  size?: number | null;
  gender?: DogGender | null;
  age?: DogAge | null;
  first_registered_by_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DogUpdate {
  ear_tag_id?: string | null;
  names?: string[];
  images?: string[];
  ear_tag_image?: string | null;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_sighting_date?: string | null;
  character?: DogCharacter | null;
  size?: number | null;
  gender?: DogGender | null;
  age?: DogAge | null;
  first_registered_by_id?: string | null;
  updated_at?: string;
}

export interface SightingRow {
  id: string;
  user_id: string;
  dog_id: string;
  latitude: number;
  longitude: number;
  character: DogCharacter;
  size: number;
  gender: DogGender;
  age: DogAge;
  notes: string | null;
  image_url: string | null;
  ear_tag_image_url: string | null;
  timestamp: string;
}

export interface SightingInsert {
  id?: string;
  user_id: string;
  dog_id: string;
  latitude: number;
  longitude: number;
  character: DogCharacter;
  size: number;
  gender: DogGender;
  age: DogAge;
  notes?: string | null;
  image_url?: string | null;
  ear_tag_image_url?: string | null;
  timestamp?: string;
}

export interface SightingUpdate {
  latitude?: number;
  longitude?: number;
  character?: DogCharacter;
  size?: number;
  gender?: DogGender;
  age?: DogAge;
  notes?: string | null;
  image_url?: string | null;
  ear_tag_image_url?: string | null;
}

export interface FavoriteRow {
  id: string;
  user_id: string;
  dog_id: string;
  created_at: string;
}

export interface FavoriteInsert {
  id?: string;
  user_id: string;
  dog_id: string;
  created_at?: string;
}

export interface ReportRow {
  id: string;
  user_id: string;
  dog_id: string | null;
  report_type: ReportType;
  message: string;
  status: ReportStatus;
  created_at: string;
}

export interface ReportInsert {
  id?: string;
  user_id: string;
  dog_id?: string | null;
  report_type: ReportType;
  message: string;
  status?: ReportStatus;
  created_at?: string;
}

export interface ReportUpdate {
  dog_id?: string | null;
  report_type?: ReportType;
  message?: string;
  status?: ReportStatus;
}

// -- RPC response type --

export interface ScoreResult {
  new_dogs: number;
  new_dogs_points: number;
  unique_dogs: number;
  unique_dogs_points: number;
  total_catches: number;
  total_catches_points: number;
  total_score: number;
}

// -- Supabase Database interface --

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      dogs: {
        Row: DogRow;
        Insert: DogInsert;
        Update: DogUpdate;
      };
      sightings: {
        Row: SightingRow;
        Insert: SightingInsert;
        Update: SightingUpdate;
      };
      favorites: {
        Row: FavoriteRow;
        Insert: FavoriteInsert;
        Update: never;
      };
      reports: {
        Row: ReportRow;
        Insert: ReportInsert;
        Update: ReportUpdate;
      };
    };
    Functions: {
      get_user_score: {
        Args: { p_user_id: string };
        Returns: ScoreResult;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_banned: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      report_type: ReportType;
      report_status: ReportStatus;
      dog_character: DogCharacter;
      dog_gender: DogGender;
      dog_age: DogAge;
    };
  };
}
