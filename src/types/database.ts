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
/** Moderation status — photos with no visible dog are 'pending' until an
 *  admin approves ('approved') or declines ('rejected'). */
export type DogStatus = "approved" | "pending" | "rejected";

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
  /** Scoring v2: date string YYYY-MM-DD when daily quest was last claimed. */
  quest_last_claimed_date: string | null;
  /** Scoring v2: cumulative XP from daily-quest claims. */
  quest_bonus_total: number;
  /** Mission v2 active state — null when no active mission. */
  active_mission_slug?: string | null;
  active_mission_started_at?: string | null;
  active_mission_distinct_count?: number;
  active_mission_awards_today?: number;
  active_mission_award_date?: string | null;
  /** Find Doggo active state — null when no active target. */
  active_finddoggo_dog_id?: string | null;
  active_finddoggo_started_at?: string | null;
  /** Remembered shelter info, prefilled into the Add-Dog shelter field. */
  shelter_info?: string | null;
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
  shelter_info?: string | null;
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
  status: DogStatus;
  /** City the dog belongs to (derived from coordinates, admin-overridable). */
  city_slug: string | null;
  /** Welfare flag: the dog lives in / is cared for by a shelter. */
  in_shelter: boolean;
  /** Free-text shelter info (name/address/contact) when in_shelter. */
  shelter_info: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Slim projection of `dogs` for list/gallery views — only the columns the
 * cards actually render. Keeps the wire payload lean on cellular.
 */
export interface DogListRow {
  id: string;
  ear_tag_id: string | null;
  names: string[];
  images: string[];
  /**
   * 320x320 webp variant of the primary image, set at upload time.
   * Optional because:
   *   1. Older rows (pre-migration-016) have no thumbnail column populated.
   *   2. Some callers (e.g. the gallery direct query) intentionally project
   *      DOG_LIST_COLUMNS, which excludes thumbnail so the SELECT doesn't
   *      fail on stacks that haven't applied migration 016 yet.
   * Components should read `dog.thumbnail ?? dog.images[0]`.
   */
  thumbnail?: string | null;
  last_sighting_date: string | null;
  created_at: string;
  first_registered_by_id: string | null;
  city_slug?: string | null;
}

// Excludes `thumbnail` so direct SELECTs work whether or not migration 016
// is applied. The composite dashboard RPC projects thumbnail explicitly.
export const DOG_LIST_COLUMNS =
  "id,ear_tag_id,names,images,last_sighting_date,created_at,first_registered_by_id,city_slug";

/**
 * Slim projection for the map view — just enough to place markers and
 * render the side panel without re-fetching.
 */
export interface DogMarker {
  id: string;
  ear_tag_id: string | null;
  names: string[];
  images: string[];
  last_latitude: number;
  last_longitude: number;
  last_sighting_date: string | null;
  city_slug?: string | null;
}

export const DOG_MARKER_COLUMNS =
  "id,ear_tag_id,names,images,last_latitude,last_longitude,last_sighting_date,city_slug";

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
  status?: DogStatus;
  city_slug?: string | null;
  in_shelter?: boolean;
  shelter_info?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DogUpdate {
  ear_tag_id?: string | null;
  names?: string[];
  images?: string[];
  thumbnail?: string | null;
  ear_tag_image?: string | null;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_sighting_date?: string | null;
  character?: DogCharacter | null;
  size?: number | null;
  gender?: DogGender | null;
  age?: DogAge | null;
  first_registered_by_id?: string | null;
  status?: DogStatus;
  city_slug?: string | null;
  in_shelter?: boolean;
  shelter_info?: string | null;
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
  client_uuid: string | null;
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
  client_uuid?: string | null;
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
  /** Capped at 5 per (dog, day). May be < total_catches if user farms. */
  total_catches_points: number;
  total_score: number;
  // Scoring v2 fields — undefined when older RPC is still deployed.
  ear_tag_bonus_count?: number;
  ear_tag_bonus_points?: number;
  quest_bonus_points?: number;
  // Scoring v3 — +2 per sighting of a dog without an ear tag.
  no_tag_bonus_count?: number;
  no_tag_bonus_points?: number;
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
