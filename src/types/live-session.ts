export type LiveSessionStatus = 'setup' | 'lobby' | 'question' | 'reveal' | 'ended'
export type LiveSessionMode = 'individual' | 'group'
export type LiveSessionPacing = 'manual' | 'timed'
export type LiveSessionRevealMode = 'auto_per_question' | 'manual_per_question' | 'end_of_session'

export interface LiveSessionQuestionChoice {
  id: string
  text: string
}

export interface LiveSession {
  id: string
  classroom_id: string
  status: LiveSessionStatus
  mode: LiveSessionMode
  capacity: number
  pacing: LiveSessionPacing
  default_time_limit_seconds: number | null
  randomize_choices: boolean
  randomize_question_order: boolean
  reveal_mode: LiveSessionRevealMode
  quiz_id?: string | null
  scores_recorded_to_progress?: boolean | null
  is_paused?: boolean
  paused_at?: string | null
  pause_reason?: string | null
  current_question_id: string | null
  question_started_at: string | null
  question_index: number
  results_revealed_at: string | null
  created_by: string
  created_at: string
}

export interface LiveSessionQuestion {
  id: string
  session_id: string
  source_question_id: string | null
  order_index: number
  prompt: string
  choices: LiveSessionQuestionChoice[] | string[]
  correct_answer: string
  time_limit_seconds: number | null
  revealed_at: string | null
}

export interface LiveSessionGroup {
  id: string
  session_id: string
  label: string
  leader_id: string | null
  elected_leader_id: string | null
  total_score: number
  leader?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface LiveSessionParticipant {
  session_id: string
  student_id: string
  joined_at: string
  group_id: string | null
  total_score: number
  removed_at: string | null
  profiles?: {
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface LiveSessionLeaderVote {
  session_id: string
  group_id: string
  voter_id: string
  candidate_id: string
  cast_at: string
}

export interface LiveSessionAnswer {
  id: string
  session_id: string
  question_id: string
  student_id: string | null
  group_id: string | null
  answer: string
  is_correct: boolean
  submitted_at: string
  response_ms: number
  points_awarded: number
  profiles?: {
    full_name: string | null
    avatar_url: string | null
  } | null
  live_session_groups?: {
    label: string
  } | null
}

export interface LeaderboardEntry {
  id: string
  name: string
  avatar_url?: string | null
  score: number
  total_response_ms: number
  is_group: boolean
  is_leader?: boolean
  group_id?: string | null
  member_count?: number
}
