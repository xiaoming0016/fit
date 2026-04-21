/**
 * 文件说明：
 * 训练数据结构工具。
 * 包括组数据初始化、规范化与是否有记录的判断。
 */

import type { DraftExerciseItem, WorkoutSet } from "../types";

export function emptySet(): WorkoutSet {
  return { weight: "", reps: "", duration: "", distance: "", note: "" };
}

export function normalizeSet(input: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    weight: String(input.weight ?? ""),
    reps: String(input.reps ?? ""),
    duration: String(input.duration ?? ""),
    distance: String(input.distance ?? ""),
    note: String(input.note ?? "")
  };
}

export function hasSetData(set: WorkoutSet) {
  return Boolean(set.weight || set.reps || set.duration || set.distance || set.note);
}

export function hasExerciseData(item: DraftExerciseItem) {
  return item.completed || item.sets.some(hasSetData);
}
