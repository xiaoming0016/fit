/**
 * 文件说明：
 * 训练草稿相关动作（增删组、更新输入、完成动作、添加动作）。
 * 这一层只负责业务动作，不直接处理事件绑定。
 */

import type { DraftExerciseItem, ExerciseDefinition, WorkoutDraft, WorkoutSet } from "../types";
import { emptySet } from "../utils/workout";

interface WorkoutActionDeps {
  getDraft: () => WorkoutDraft | null;
  getExerciseById: (exerciseId: string) => ExerciseDefinition | null;
  createDraftExercise: (itemKey: string, definition: ExerciseDefinition, overrides?: any) => DraftExerciseItem;
  createId: (prefix: string) => string;
  saveLocalState: () => void;
  queueSync: () => void;
  persist: () => void;
  renderApp: () => void;
  closeModal: () => void;
  toast: (message: string) => void;
}

export function createWorkoutActions(deps: WorkoutActionDeps) {
  function updateDraftField(field: "bodyWeight" | "note", value: string) {
    const draft = deps.getDraft();
    if (!draft) return;
    draft[field] = value;
    deps.saveLocalState();
    deps.queueSync();
  }

  function updateSetField(itemKey: string, setIndex: number, field: keyof WorkoutSet, value: string) {
    const item = deps.getDraft()?.exerciseItems?.[itemKey];
    if (!item || !item.sets[setIndex]) return;
    item.sets[setIndex][field] = value;
    deps.saveLocalState();
    deps.queueSync();
  }

  function addSet(itemKey: string) {
    const item = deps.getDraft()?.exerciseItems?.[itemKey];
    if (!item) return;
    item.sets.push(emptySet());
    deps.persist();
    deps.renderApp();
  }

  function removeSet(itemKey: string, setIndex: number) {
    const item = deps.getDraft()?.exerciseItems?.[itemKey];
    if (!item) return;
    if (item.sets.length === 1) item.sets[0] = emptySet();
    else item.sets.splice(setIndex, 1);
    deps.persist();
    deps.renderApp();
  }

  function toggleExercise(itemKey: string) {
    const item = deps.getDraft()?.exerciseItems?.[itemKey];
    if (!item) return;
    item.completed = !item.completed;
    deps.persist();
    deps.renderApp();
  }

  function addExerciseToDraft(exerciseId: string) {
    const draft = deps.getDraft();
    const definition = deps.getExerciseById(exerciseId);
    if (!draft || !definition || draft.exerciseOrder.some(itemKey => draft.exerciseItems[itemKey]?.exerciseId === exerciseId)) return;
    const itemKey = `${exerciseId}__custom_${deps.createId("item")}`;
    draft.exerciseOrder.push(itemKey);
    draft.exerciseItems[itemKey] = deps.createDraftExercise(itemKey, definition, { targetSets: 3, targetReps: definition.recordType === "weight_reps" ? "8-12" : "" });
    deps.persist();
    deps.closeModal();
    deps.renderApp();
    deps.toast(`已添加动作：${definition.name}`);
  }

  return {
    updateDraftField,
    updateSetField,
    addSet,
    removeSet,
    toggleExercise,
    addExerciseToDraft
  };
}
