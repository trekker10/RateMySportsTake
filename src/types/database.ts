export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      experts: {
        Row: Expert;
        Insert: ExpertInsert;
        Update: ExpertUpdate;
      };
      takes: {
        Row: Take;
        Insert: TakeInsert;
        Update: TakeUpdate;
      };
    };
  };
}

// ─── Expert ──────────────────────────────────────────────────────────────────

export interface Expert {
  id: string;
  created_at: string;
  updated_at: string;

  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  twitter_handle: string | null;
  organization: string | null; // ESPN, The Athletic, etc.

  // Computed / cached stats (updated via trigger or background job)
  total_takes: number;
  graded_takes: number;
  accuracy_score: number | null; // 0–100 average grade on resolved takes
  boldness_score: number | null; // average difficulty/boldness of their takes
  flip_rate: number | null;      // 0–1 fraction of takes they later contradicted
}

export type ExpertInsert = Omit<Expert, "id" | "created_at" | "updated_at" | "total_takes" | "graded_takes" | "accuracy_score" | "boldness_score" | "flip_rate">;
export type ExpertUpdate = Partial<ExpertInsert>;

// ─── Take ────────────────────────────────────────────────────────────────────

export type TakeStatus = "pending_ai_rating" | "rated" | "pending_outcome" | "graded" | "contested";
export type TakeSource = "twitter" | "tv" | "podcast" | "article" | "other";
export type Sport = "nfl" | "nba" | "mlb" | "nhl" | "soccer" | "college_football" | "college_basketball" | "other";

export interface Take {
  id: string;
  created_at: string;
  updated_at: string;

  expert_id: string;
  submitted_by: string | null; // auth user id, nullable for anonymous

  // The take itself
  content: string;           // the exact quote / take text
  source: TakeSource;
  source_url: string | null;
  sport: Sport;
  taken_at: string;          // when the take was originally made

  // AI-generated ratings (filled after Claude processes the take)
  status: TakeStatus;
  difficulty_score: number | null;       // 1–10: how risky/bold is this take?
  falsifiability_score: number | null;   // 1–10: can this clearly be proven right/wrong?
  confidence_score: number | null;       // 1–10: how confidently is it stated?
  specificity_score: number | null;      // 1–10: how specific vs vague?
  ai_summary: string | null;             // Claude's one-line summary
  ai_reasoning: string | null;           // Claude's full reasoning for the scores

  // Outcome & grading
  outcome_date: string | null;           // when the outcome became known
  outcome_description: string | null;    // what actually happened
  grade: number | null;                  // 0–100 final score
  grade_reasoning: string | null;        // Claude's grading explanation

  // Meta
  upvotes: number;
  is_notable: boolean;       // editor-flagged as especially significant
}

export type TakeInsert = Omit<Take,
  | "id" | "created_at" | "updated_at"
  | "status"
  | "difficulty_score" | "falsifiability_score" | "confidence_score" | "specificity_score"
  | "ai_summary" | "ai_reasoning"
  | "outcome_date" | "outcome_description"
  | "grade" | "grade_reasoning"
  | "upvotes" | "is_notable"
>;
export type TakeUpdate = Partial<Omit<Take, "id" | "created_at">>;
