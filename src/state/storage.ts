/**
 * 文件说明：
 * 本地存储与状态迁移层。
 * 负责 localStorage 读写、历史版本迁移与状态规范化。
 */

import type { AppState, ExerciseDefinition, WorkoutDraft } from "../types";
import { createId, normalizeTargetSetsLabel, parseSetCount, todayKey } from "../utils/common";
import { emptySet, normalizeSet } from "../utils/workout";

type ResolveExercise = (exerciseId: string, custom?: ExerciseDefinition[]) => ExerciseDefinition | null;

interface NormalizeContext {
  maxDay: number;
  getPlanTitle: (day: number) => string;
  resolveExercise: ResolveExercise;
}

export function normalizeDay(value: unknown, maxDay: number) {
  const day = Number(value);
  if (!Number.isFinite(day) || day < 1) return 1;
  return Math.min(Math.round(day), maxDay);
}

export function makeDefaultState(): AppState {
  return { version: 2, currentDay: 1, workoutDrafts: {}, history: [], customExercises: [] };
}

export function normalizeCustom(item: Partial<ExerciseDefinition> = {}): ExerciseDefinition {
  return {
    id: item.id || createId("custom"),
    name: String(item.name || "未命名动作").trim(),
    category: item.category || "其他",
    recordType: item.recordType || "weight_reps",
    note: item.note || "",
    source: "custom",
    active: item.active !== false
  };
}

function migrateLegacy(raw: any, ctx: NormalizeContext): AppState {
  const next = makeDefaultState();
  next.currentDay = normalizeDay(raw.currentDay || 1, ctx.maxDay);
  next.history = (raw.history || []).map((entry: any) => ({
    id: createId("legacy"),
    dateKey: entry.date || todayKey(),
    day: normalizeDay(entry.day || 1, ctx.maxDay),
    title: entry.title || `Day ${normalizeDay(entry.day || 1, ctx.maxDay)}`,
    mode: entry.type === "rest" ? "rest" : "plan",
    status: entry.type === "rest" ? "rest" : "completed",
    bodyWeight: "",
    note: entry.dayNote || "",
    completedAt: "",
    exercises: Object.entries(entry.log || {}).map(([name, values]) => ({
      exerciseId: `legacy-${name}`,
      nameSnapshot: name,
      category: "其他",
      recordType: "weight_reps",
      completed: true,
      sets: [normalizeSet(values as any)]
    }))
  }));
  return next;
}

export function normalizeState(raw: any, ctx: NormalizeContext): AppState {
  if (!raw || typeof raw !== "object") return makeDefaultState();
  if (raw.version !== 2) return migrateLegacy(raw, ctx);

  const next = makeDefaultState();
  next.currentDay = normalizeDay(raw.currentDay || 1, ctx.maxDay);
  next.customExercises = Array.isArray(raw.customExercises) ? raw.customExercises.map(normalizeCustom) : [];
  next.history = Array.isArray(raw.history) ? raw.history.map((entry: any) => ({
    id: entry.id || createId("session"),
    dateKey: entry.dateKey || todayKey(),
    day: normalizeDay(entry.day || 1, ctx.maxDay),
    title: entry.title || `Day ${normalizeDay(entry.day || 1, ctx.maxDay)}`,
    mode: entry.mode || "plan",
    status: entry.status || "completed",
    bodyWeight: entry.bodyWeight || "",
    note: entry.note || "",
    completedAt: entry.completedAt || "",
    exercises: (entry.exercises || []).map((item: any) => ({
      exerciseId: item.exerciseId || createId("exercise"),
      nameSnapshot: item.nameSnapshot || item.name || "未命名动作",
      category: item.category || "其他",
      recordType: item.recordType || "weight_reps",
      completed: item.completed !== false,
      sets: (item.sets || []).map(normalizeSet)
    }))
  })) : [];

  if (raw.workoutDrafts && typeof raw.workoutDrafts === "object") {
    Object.entries(raw.workoutDrafts).forEach(([key, draftRaw]) => {
      const draft = draftRaw as any;
      const day = normalizeDay(key, ctx.maxDay);
      next.workoutDrafts[day] = {
        day,
        mode: draft.mode || "plan",
        title: draft.title || ctx.getPlanTitle(day),
        bodyWeight: draft.bodyWeight || "",
        note: draft.note || "",
        exerciseOrder: Array.isArray(draft.exerciseOrder) ? [...draft.exerciseOrder] : [],
        exerciseItems: {}
      } as WorkoutDraft;

      next.workoutDrafts[day].exerciseOrder.forEach(itemKey => {
        const source = draft.exerciseItems?.[itemKey] || {};
        const exerciseId = source.exerciseId || itemKey;
        const resolved = ctx.resolveExercise(exerciseId, next.customExercises);
        const setCount = parseSetCount(source.targetSets, 3);
        next.workoutDrafts[day].exerciseItems[itemKey] = {
          itemKey,
          exerciseId,
          nameSnapshot: source.nameSnapshot || resolved?.name || exerciseId,
          category: source.category || resolved?.category || "其他",
          recordType: source.recordType || resolved?.recordType || "weight_reps",
          completed: !!source.completed,
          targetSets: normalizeTargetSetsLabel(source.targetSets, setCount),
          targetReps: source.targetReps || "",
          targetNote: source.targetNote || "",
          sets: (source.sets || Array.from({ length: setCount }, emptySet)).map(normalizeSet)
        };
      });
    });
  }
  return next;
}

export function loadState(storageKey: string, legacyKeys: string[], ctx: NormalizeContext) {
  for (const key of [storageKey, ...legacyKeys]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return normalizeState(JSON.parse(raw), ctx);
    } catch (error) {
      console.error(error);
    }
  }
  return makeDefaultState();
}

export function saveState(state: AppState, storageKey: string, legacyKeys: string[]) {
  localStorage.setItem(storageKey, JSON.stringify(state));
  legacyKeys.forEach(key => localStorage.removeItem(key));
}
