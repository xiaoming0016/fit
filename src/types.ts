/**
 * 文件说明：
 * 全局类型定义。
 * 包括动作、计划、草稿、历史记录和 UI 状态模型。
 */

export type RecordType = "weight_reps" | "reps_only" | "duration" | "distance_duration";
export type ExerciseSource = "system" | "custom";
export type PlanDayType = "train" | "rest";
export type WorkoutMode = "plan" | "free" | "rest";
export type SessionStatus = "completed" | "rest";
export type AuthMode = "signin" | "signup";
export type AppTab = "training" | "history" | "me";

export interface AppConfig {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  SITE_URL: string;
  STORAGE_KEY: string;
  LEGACY_STORAGE_KEYS: string[];
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  category: string;
  recordType: RecordType;
  source: ExerciseSource;
  note: string;
  active: boolean;
}

export interface PlanExercise {
  exerciseId: string;
  targetSets: string | number;
  targetReps: string;
  targetNote: string;
}

export interface PlanDay {
  id: number;
  title: string;
  type: PlanDayType;
  duration: string;
  goal: string;
  exercises: PlanExercise[];
}

export interface WorkoutSet {
  weight: string;
  reps: string;
  duration: string;
  distance: string;
  note: string;
}

export interface DraftExerciseItem {
  itemKey: string;
  exerciseId: string;
  nameSnapshot: string;
  category: string;
  recordType: RecordType;
  completed: boolean;
  targetSets: string;
  targetReps: string;
  targetNote: string;
  sets: WorkoutSet[];
}

export interface WorkoutDraft {
  day: number;
  mode: WorkoutMode;
  title: string;
  bodyWeight: string;
  note: string;
  exerciseOrder: string[];
  exerciseItems: Record<string, DraftExerciseItem>;
}

export interface HistoryEntry {
  id: string;
  dateKey: string;
  day: number;
  title: string;
  mode: WorkoutMode;
  status: SessionStatus;
  bodyWeight: string;
  note: string;
  completedAt: string;
  exercises: Array<Omit<DraftExerciseItem, "itemKey" | "targetSets" | "targetReps" | "targetNote">>;
}

export interface AppState {
  version: number;
  currentDay: number;
  workoutDrafts: Record<number, WorkoutDraft>;
  history: HistoryEntry[];
  customExercises: ExerciseDefinition[];
}

export interface UiState {
  booting: boolean;
  authMode: AuthMode;
  authBusy: boolean;
  authError: string;
  tab: AppTab;
  modal: { type: "history"; id: string } | { type: "library" } | { type: "picker" } | { type: "form"; id?: string; fromPicker?: boolean } | null;
  historyQuery: string;
  libraryQuery: string;
  pickerQuery: string;
  pendingDay: number;
  syncKind: "info" | "waiting" | "error" | "synced";
  syncText: string;
  lastSyncedAt: string;
}
