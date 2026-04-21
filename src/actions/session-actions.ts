/**
 * 文件说明：
 * 训练会话与导出相关动作。
 * 包括完成训练、标记休息、保存动作库项、导出 JSON/CSV。
 */

import type { AppState, HistoryEntry, RecordType, WorkoutDraft, WorkoutSet } from "../types";
import { todayKey } from "../utils/common";
import { emptySet, hasExerciseData, hasSetData, normalizeSet } from "../utils/workout";

interface SessionActionDeps {
  getState: () => AppState;
  setState: (nextState: AppState) => void;
  getDraft: () => WorkoutDraft | null;
  getCurrentDay: () => number;
  setCurrentDay: (day: number) => void;
  setPendingDay: (day: number) => void;
  nextDay: (day: number) => number;
  getPlanTitle: () => string;
  persist: () => void;
  renderApp: () => void;
  closeModal: () => void;
  toast: (message: string) => void;
  createId: (prefix: string) => string;
  normalizeCustom: (item: any) => any;
  getDraftExists: () => boolean;
  addExerciseToDraft: (exerciseId: string) => void;
  getConfirm: (message: string) => boolean;
}

interface ExportActionDeps {
  getState: () => AppState;
  download: (filename: string, content: string, type: string) => void;
}

export function createSessionActions(deps: SessionActionDeps) {
  function completeWorkout() {
    const draft = deps.getDraft();
    if (!draft) return;
    const exercises = draft.exerciseOrder
      .map(itemKey => draft.exerciseItems[itemKey])
      .filter(hasExerciseData)
      .map(item => ({
        exerciseId: item.exerciseId,
        nameSnapshot: item.nameSnapshot,
        category: item.category,
        recordType: item.recordType,
        completed: item.completed,
        sets: item.sets.filter(hasSetData).map(normalizeSet)
      }));
    if (!exercises.length && !draft.note && !draft.bodyWeight && !deps.getConfirm("还没有记录任何内容，仍然完成今天吗？")) return;

    const state = deps.getState();
    state.history.push({
      id: deps.createId("session"),
      dateKey: todayKey(),
      day: deps.getCurrentDay(),
      title: draft.title,
      mode: draft.mode,
      status: draft.mode === "rest" ? "rest" : "completed",
      bodyWeight: draft.bodyWeight,
      note: draft.note,
      completedAt: new Date().toISOString(),
      exercises
    } as HistoryEntry);
    delete state.workoutDrafts[deps.getCurrentDay()];
    const upcomingDay = deps.nextDay(deps.getCurrentDay());
    deps.setCurrentDay(upcomingDay);
    deps.setPendingDay(upcomingDay);
    deps.setState(state);
    deps.persist();
    deps.renderApp();
    deps.toast("今天的训练已保存，已进入下一天");
  }

  function markRestComplete() {
    const state = deps.getState();
    state.history.push({
      id: deps.createId("session"),
      dateKey: todayKey(),
      day: deps.getCurrentDay(),
      title: deps.getPlanTitle(),
      mode: "rest",
      status: "rest",
      bodyWeight: "",
      note: "休息日已完成",
      completedAt: new Date().toISOString(),
      exercises: []
    } as HistoryEntry);
    const upcomingDay = deps.nextDay(deps.getCurrentDay());
    deps.setCurrentDay(upcomingDay);
    deps.setPendingDay(upcomingDay);
    deps.setState(state);
    deps.persist();
    deps.renderApp();
    deps.toast("已标记今天休息，进入下一天");
  }

  function saveExercise(form: HTMLFormElement) {
    const editId = (form.querySelector("#exerciseFormId") as HTMLInputElement).value.trim();
    const fromPicker = (form.querySelector("#exerciseFormFromPicker") as HTMLInputElement).value === "true";
    const name = (form.querySelector("#exerciseNameInput") as HTMLInputElement).value.trim();
    if (!name) return deps.toast("请先填写动作名称");
    const payload = {
      name,
      category: (form.querySelector("#exerciseCategoryInput") as HTMLSelectElement).value,
      recordType: (form.querySelector("#exerciseRecordTypeInput") as HTMLSelectElement).value as RecordType,
      note: (form.querySelector("#exerciseNoteInput") as HTMLTextAreaElement).value.trim(),
      active: (form.querySelector("#exerciseActiveInput") as HTMLSelectElement).value === "true"
    };
    const state = deps.getState();
    if (editId) {
      const target = state.customExercises.find(item => item.id === editId);
      if (target) Object.assign(target, payload);
      Object.values(state.workoutDrafts).forEach(draft => {
        draft.exerciseOrder.forEach(itemKey => {
          const item = draft.exerciseItems[itemKey];
          if (!item || item.exerciseId !== editId) return;
          item.nameSnapshot = payload.name;
          item.category = payload.category;
          item.recordType = payload.recordType;
        });
      });
    } else {
      const custom = deps.normalizeCustom(payload);
      state.customExercises.unshift(custom);
      deps.setState(state);
      deps.persist();
      if (fromPicker && deps.getDraftExists()) return deps.addExerciseToDraft(custom.id);
    }
    deps.setState(state);
    deps.persist();
    deps.closeModal();
    deps.renderApp();
    deps.toast("动作已保存");
  }

  function resetProgress() {
    if (!deps.getConfirm("确定要把当前训练进度重置到 Day 1 吗？历史记录会保留。")) return;
    const state = deps.getState();
    state.currentDay = 1;
    state.workoutDrafts = {};
    deps.setPendingDay(1);
    deps.setState(state);
    deps.persist();
    deps.renderApp();
  }

  return {
    completeWorkout,
    markRestComplete,
    saveExercise,
    resetProgress
  };
}

export function createExportActions(deps: ExportActionDeps) {
  function exportJson() {
    deps.download(`training-tracker-${todayKey()}.json`, JSON.stringify(deps.getState(), null, 2), "application/json");
  }

  function exportCsv() {
    const state = deps.getState();
    const rows: string[][] = [["date", "day", "title", "mode", "exercise", "set_no", "weight", "reps", "duration", "distance", "note", "session_note", "body_weight"]];
    state.history.forEach(entry => {
      if (!entry.exercises.length) rows.push([entry.dateKey, String(entry.day), entry.title, entry.mode, "", "", "", "", "", "", "", entry.note || "", entry.bodyWeight || ""]);
      entry.exercises.forEach(item => {
        (item.sets.length ? item.sets : [emptySet()]).forEach((set: WorkoutSet, index: number) => {
          rows.push([entry.dateKey, String(entry.day), entry.title, entry.mode, item.nameSnapshot, String(index + 1), set.weight || "", set.reps || "", set.duration || "", set.distance || "", set.note || "", entry.note || "", entry.bodyWeight || ""]);
        });
      });
    });
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    deps.download(`training-history-${todayKey()}.csv`, csv, "text/csv;charset=utf-8;");
  }

  return {
    exportJson,
    exportCsv
  };
}
