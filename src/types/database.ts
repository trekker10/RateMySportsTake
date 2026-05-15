export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums ───────────────────────────────────────────────────────────────────

export type SourceType = "tweet" | "article" | "tv_segment" | "podcast" | "radio" | "other";
export type TakeType = "prediction" | "opinion" | "narrative" | "criticism" | "praise" | "stat_claim";
export type TimeHorizon = "immediate" | "this_season" | "this_year" | "multi_year" | "career" | "unresolvable";
export type RatingStatus = "pending" | "rated" | "failed";
export type OutcomeStatus = "pending" | "confirmed_true" | "confirmed_false" | "partially_true" | "unresolvable";
export type AgingVerdict = "aged_well" | "aged_poorly" | "neutral" | "too_soon";

// ─── Expert ───────────────────────────────────────────────────────────────────

export interface Expert {
  expert_id: string;
  date_added: string;

  name: string;
  twitter_handle: string | null;
  outlet: string | null;
  sport_focus: string[];
  bio: string | null;
  avatar_url: string | null;

  // rolling stats
  overall_rating: number;
  total_takes: number;
  graded_takes: number;
  accuracy_rate: number;
  boldness_avg: number;
  accountability_score: number;
  flip_count: number;
}

export type ExpertInsert = Pick<Expert, "name"> &
  Partial<Pick<Expert, "twitter_handle" | "outlet" | "sport_focus" | "bio" | "avatar_url">>;

export type ExpertUpdate = Partial<Pick<Expert, "name" | "twitter_handle" | "outlet" | "sport_focus" | "bio" | "avatar_url">>;

// ─── Grade breakdown (jsonb) ──────────────────────────────────────────────────

export interface GradeBreakdown {
  accuracy_score: number;      // base correctness 0–100
  difficulty_bonus: number;    // added for bold/hard takes
  confidence_penalty: number;  // subtracted for overclaiming
  [key: string]: number;       // extensible for future components
}

// ─── Take ─────────────────────────────────────────────────────────────────────

export interface Take {
  take_id: string;
  expert_id: string;
  date_submitted: string;

  // Core
  raw_text: string;
  source_url: string | null;
  source_type: SourceType;
  date_made: string;           // ISO date string

  // AI-generated rating fields
  take_type: TakeType | null;
  sport: string | null;
  subjects: string[];
  difficulty_score: number | null;       // 1–10
  falsifiability_score: number | null;   // 1–10
  confidence_claimed: number | null;     // 1–10
  time_horizon: TimeHorizon | null;
  time_horizon_date: string | null;      // ISO date string
  summary: string | null;
  grading_criteria: string | null;
  flags: string[];                       // e.g. ["bold_call", "guaranteed", "flip_risk"]
  rating_status: RatingStatus;

  // Outcome
  outcome_status: OutcomeStatus;
  outcome_date: string | null;           // ISO date string
  outcome_notes: string | null;
  outcome_source_url: string | null;

  // Grading
  grade: number | null;                  // 0–100
  grade_breakdown: GradeBreakdown | null;
  grade_notes: string | null;
  aging_verdict: AgingVerdict | null;

  // Flip tracking
  related_take_ids: string[];
  is_flip: boolean;
}

export type TakeInsert = Pick<Take, "expert_id" | "raw_text" | "source_type" | "date_made"> &
  Partial<Pick<Take, "source_url" | "sport">>;

export type TakeUpdate = Partial<
  Pick<Take,
    | "take_type" | "sport" | "subjects"
    | "difficulty_score" | "falsifiability_score" | "confidence_claimed"
    | "time_horizon" | "time_horizon_date"
    | "summary" | "grading_criteria" | "flags" | "rating_status"
    | "outcome_status" | "outcome_date" | "outcome_notes" | "outcome_source_url"
    | "grade" | "grade_breakdown" | "grade_notes" | "aging_verdict"
    | "related_take_ids" | "is_flip"
  >
>;

// ─── Supabase Database type map ───────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      experts: {
        Row: Expert;
        Insert: ExpertInsert;
        Update: ExpertUpdate;
        Relationships: [];
      };
      takes: {
        Row: Take;
        Insert: TakeInsert;
        Update: TakeUpdate;
        Relationships: [];
      };
      profiles: {
        Row: { user_id: string; created_at: string; display_name: string | null; bio: string | null; avatar_url: string | null };
        Insert: { user_id: string; display_name?: string | null; bio?: string | null; avatar_url?: string | null };
        Update: { display_name?: string | null; bio?: string | null; avatar_url?: string | null };
        Relationships: [];
      };
      follows: {
        Row: { user_id: string; expert_id: string; created_at: string };
        Insert: { user_id: string; expert_id: string };
        Update: { user_id?: string; expert_id?: string };
        Relationships: [];
      };
      feature_flags: {
        Row: { key: string; enabled: boolean; description: string | null; updated_at: string };
        Insert: { key: string; enabled?: boolean; description?: string | null };
        Update: { enabled?: boolean; description?: string | null; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
