/**
 * 文件说明：
 * 应用启动与编排入口（wiring 层）。
 * 负责组装状态、渲染、事件绑定和云同步服务。
 */

import { createClient, type Session } from "@supabase/supabase-js";
import { APP_CONFIG, PLAN_DAYS, SYSTEM_EXERCISES } from "./data";
import type { DraftExerciseItem, ExerciseDefinition, HistoryEntry, PlanDay, RecordType, UiState, WorkoutDraft, WorkoutSet } from "./types";
import { createId, formatDateTime, getErrorMessage, normalizeTargetSetsLabel, parseSetCount, summarizeSet, todayKey } from "./utils/common";
import { emptySet, hasExerciseData, hasSetData, normalizeSet } from "./utils/workout";
import { loadState, makeDefaultState, normalizeCustom, normalizeDay, normalizeState, saveState } from "./state/storage";
import { bindGlobalEvents } from "./events/bindings";
import { renderAppView, renderAuthView, renderFormModalView, renderHistoryModalView, renderHistoryView, renderLibraryModalView, renderMeView, renderPickerModalView, renderTrainingView } from "./render/views";
import { createCloudSyncManager } from "./services/cloud-sync";
import { createWorkoutActions } from "./actions/workout-actions";
import { createExportActions, createSessionActions } from "./actions/session-actions";
import { createAuthActions } from "./actions/auth-actions";
import { createAppContext } from "./app-context";

// ----------------------------
// 运行时配置与全局入口节点
// ----------------------------
const { SUPABASE_URL, SUPABASE_KEY, SITE_URL, STORAGE_KEY, LEGACY_STORAGE_KEYS } = APP_CONFIG;
const { authScreen, appScreen, modalRoot, toastEl } = createAppContext();

let currentSession: Session | null = null;
let toastTimer: number | null = null;
let lastRenderedTab: UiState["tab"] | null = null;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function nextDay(day: number) {
  return day >= PLAN_DAYS.length ? 1 : day + 1;
}

function getCatalog(custom: ExerciseDefinition[] = state.customExercises) {
  return [...SYSTEM_EXERCISES, ...custom];
}

function getExerciseById(exerciseId: string, custom: ExerciseDefinition[] = state.customExercises) {
  return getCatalog(custom).find(item => item.id === exerciseId) || null;
}

function getPlan(day = state.currentDay): PlanDay {
  return PLAN_DAYS.find(item => item.id === normalizeDay(day, PLAN_DAYS.length)) || PLAN_DAYS[0];
}

function normalizeStateWithContext(raw: unknown) {
  return normalizeState(raw, {
    maxDay: PLAN_DAYS.length,
    getPlanTitle: (day: number) => getPlan(day).title,
    resolveExercise: (exerciseId: string, custom?: ExerciseDefinition[]) => getExerciseById(exerciseId, custom ?? state.customExercises)
  });
}

let state = loadState(STORAGE_KEY, LEGACY_STORAGE_KEYS, {
  maxDay: PLAN_DAYS.length,
  getPlanTitle: (day: number) => getPlan(day).title,
  resolveExercise: (exerciseId: string, custom?: ExerciseDefinition[]) => getExerciseById(exerciseId, custom ?? state.customExercises)
});
// UI 只保存界面状态，不保存业务数据
const ui: UiState = {
  booting: true,
  authMode: "signin",
  authBusy: false,
  authError: "",
  tab: "training",
  modal: null,
  historyQuery: "",
  libraryQuery: "",
  pickerQuery: "",
  pendingDay: state.currentDay,
  syncKind: "info",
  syncText: "登录后自动同步",
  lastSyncedAt: ""
};

function getDraft(): WorkoutDraft | null {
  return state.workoutDrafts[state.currentDay] || null;
}

function createDraftExercise(itemKey: string, definition: ExerciseDefinition, overrides: any = {}): DraftExerciseItem {
  const setCount = parseSetCount(overrides.targetSets, 3);
  return {
    itemKey,
    exerciseId: definition.id,
    nameSnapshot: definition.name,
    category: definition.category,
    recordType: definition.recordType,
    completed: false,
    targetSets: normalizeTargetSetsLabel(overrides.targetSets, setCount),
    targetReps: overrides.targetReps || "",
    targetNote: overrides.targetNote || definition.note || "",
    sets: Array.from({ length: setCount }, emptySet)
  };
}

function createDraft(mode: "plan" | "free") {
  const plan = getPlan();
  const draft: WorkoutDraft = {
    day: state.currentDay,
    mode,
    title: mode === "free" ? `${plan.title} · 自由训练` : plan.title,
    bodyWeight: "",
    note: "",
    exerciseOrder: [],
    exerciseItems: {}
  };
  if (mode === "plan" && plan.type === "train") {
    plan.exercises.forEach((item, index) => {
      const definition = getExerciseById(item.exerciseId);
      if (!definition) return;
      const itemKey = `${definition.id}__plan_${index + 1}`;
      draft.exerciseOrder.push(itemKey);
      draft.exerciseItems[itemKey] = createDraftExercise(itemKey, definition, item);
    });
  }
  state.workoutDrafts[state.currentDay] = draft;
  persist();
  renderApp();
}

function persist(sync = true) {
  saveState(state, STORAGE_KEY, LEGACY_STORAGE_KEYS);
  if (sync) queueSync();
}

function toast(message: string) {
  if (!message) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function setSync(text: string, kind: UiState["syncKind"] = "info") {
  ui.syncText = text;
  ui.syncKind = kind;
  document.querySelectorAll("[data-sync-text]").forEach(node => {
    node.textContent = text;
  });
  document.querySelectorAll("[data-sync-badge]").forEach(node => {
    node.className = `sync-pill ${kind}`;
    node.textContent = kind === "synced" ? "云端已同步" : kind === "waiting" ? "等待同步" : kind === "error" ? "同步异常" : "准备同步";
  });
  document.querySelectorAll("[data-last-sync]").forEach(node => {
    node.textContent = ui.lastSyncedAt ? formatDateTime(ui.lastSyncedAt) : "尚未同步";
  });
}

function rerenderWithFocus(renderFn: () => void, inputId: string, value: string) {
  renderFn();
  requestAnimationFrame(() => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) return;
    input.focus();
    if (typeof input.setSelectionRange === "function") {
      input.setSelectionRange(String(value).length, String(value).length);
    }
  });
}

function lastReference(exerciseId: string) {
  const definition = getExerciseById(exerciseId);
  if (!definition) return "暂无历史参考";
  for (let i = state.history.length - 1; i >= 0; i -= 1) {
    const found = state.history[i].exercises.find(item => item.exerciseId === exerciseId || item.nameSnapshot === definition.name);
    if (!found) continue;
    const tags = found.sets.filter(hasSetData).slice(0, 2).map(set => summarizeSet(set, found.recordType));
    return tags.length ? `上次参考：${tags.join(" / ")}` : "有历史记录";
  }
  return "暂无历史参考";
}

let isHydrating = false;

const authActions = createAuthActions({
  supabase,
  getAuthMode: () => ui.authMode,
  setAuthMode: mode => { ui.authMode = mode; },
  getAuthBusy: () => ui.authBusy,
  setAuthBusy: value => { ui.authBusy = value; },
  setAuthError: value => { ui.authError = value; },
  renderAuth,
  toast,
  siteUrl: SITE_URL,
  getErrorMessage
});

// ----------------------------
// 视图渲染
// ----------------------------
function renderAuth() {
  if (currentSession?.user) {
    authScreen.classList.add("hidden");
    return;
  }
  authScreen.classList.remove("hidden");
  authScreen.innerHTML = renderAuthView({
    booting: ui.booting,
    authMode: ui.authMode,
    authBusy: ui.authBusy,
    authError: ui.authError
  });
}

function renderTraining() {
  return renderTrainingView({
    planDays: PLAN_DAYS,
    systemExercises: SYSTEM_EXERCISES,
    stateCurrentDay: state.currentDay,
    stateHistory: state.history,
    plan: getPlan(),
    draft: getDraft(),
    getExerciseById,
    lastReference
  });
}

function renderHistory() {
  return renderHistoryView({ history: state.history, query: ui.historyQuery });
}

function renderMe() {
  return renderMeView({
    planDays: PLAN_DAYS,
    systemExercises: SYSTEM_EXERCISES,
    currentEmail: currentSession?.user?.email || "",
    stateHistoryCount: state.history.length,
    customCount: state.customExercises.length,
    customActiveCount: state.customExercises.filter(item => item.active).length,
    pendingDay: ui.pendingDay,
    syncText: ui.syncText,
    syncKind: ui.syncKind,
    lastSyncedAt: ui.lastSyncedAt
  });
}

function renderApp() {
  if (!currentSession?.user) {
    appScreen.classList.add("hidden");
    appScreen.innerHTML = "";
    lastRenderedTab = null;
    return;
  }
  const previousContent = appScreen.querySelector(".app-content") as HTMLElement | null;
  const shouldRestoreScroll = lastRenderedTab === ui.tab;
  const previousScrollTop = shouldRestoreScroll ? previousContent?.scrollTop ?? 0 : 0;
  appScreen.classList.remove("hidden");
  const panel = ui.tab === "training" ? renderTraining() : ui.tab === "history" ? renderHistory() : renderMe();
  appScreen.innerHTML = renderAppView({
    uiTab: ui.tab,
    uiSyncKind: ui.syncKind,
    uiSyncText: ui.syncText,
    stateCurrentDay: state.currentDay,
    stateHistoryCount: state.history.length,
    currentEmail: currentSession.user.email || "",
    planGoal: getPlan().goal,
    panelHtml: panel
  });
  if (shouldRestoreScroll) {
    const nextContent = appScreen.querySelector(".app-content") as HTMLElement | null;
    if (nextContent) nextContent.scrollTop = previousScrollTop;
  }
  lastRenderedTab = ui.tab;
  setSync(ui.syncText, ui.syncKind);
}

function renderHistoryModal(entry: HistoryEntry) {
  return renderHistoryModalView(entry);
}

function renderLibraryModal() {
  return renderLibraryModalView({
    libraryQuery: ui.libraryQuery,
    customExercises: state.customExercises,
    systemExercises: SYSTEM_EXERCISES
  });
}

function renderPickerModal() {
  return renderPickerModalView({
    pickerQuery: ui.pickerQuery,
    draft: getDraft(),
    getCatalog
  });
}

function renderFormModal(item: ExerciseDefinition | null, fromPicker: boolean) {
  return renderFormModalView(item, fromPicker);
}

function renderModal() {
  const modal = ui.modal;
  if (!modal) return (modalRoot.innerHTML = "");
  if (modal.type === "history") {
    const entry = state.history.find(item => item.id === modal.id);
    modalRoot.innerHTML = entry ? renderHistoryModal(entry) : "";
    return;
  }
  if (modal.type === "library") modalRoot.innerHTML = renderLibraryModal();
  if (modal.type === "picker") modalRoot.innerHTML = renderPickerModal();
  if (modal.type === "form") {
    const item = modal.id ? state.customExercises.find(exercise => exercise.id === modal.id) || null : null;
    modalRoot.innerHTML = renderFormModal(item, !!modal.fromPicker);
  }
}

function renderAll() {
  renderAuth();
  renderApp();
  renderModal();
}

const cloudSync = createCloudSyncManager({
  supabase,
  getUserId: () => currentSession?.user?.id || null,
  getState: () => state,
  setState: nextState => { state = nextState; },
  getIsHydrating: () => isHydrating,
  setIsHydrating: value => { isHydrating = value; },
  setLastSyncedAt: value => { ui.lastSyncedAt = value; },
  setPendingDay: value => { ui.pendingDay = value; },
  setSync,
  renderAll,
  saveLocalState: () => saveState(state, STORAGE_KEY, LEGACY_STORAGE_KEYS),
  normalizeState: normalizeStateWithContext,
  getDefaultState: makeDefaultState,
  getErrorMessage
});

function saveCloudState() {
  return cloudSync.saveCloudState();
}

function queueSync() {
  return cloudSync.queueSync();
}

function initCloudState() {
  return cloudSync.initCloudState();
}

function reloadCloudCache() {
  return cloudSync.reloadCloudCache();
}

function openModal(type: NonNullable<UiState["modal"]>["type"], payload: Record<string, unknown> = {}) {
  ui.modal = { type, ...payload } as UiState["modal"];
  renderModal();
}

function closeModal() {
  ui.modal = null;
  renderModal();
}

// ----------------------------
// 交互处理与事件绑定
// ----------------------------
const workoutActions = createWorkoutActions({
  getDraft,
  getExerciseById,
  createDraftExercise,
  createId,
  saveLocalState: () => saveState(state, STORAGE_KEY, LEGACY_STORAGE_KEYS),
  queueSync,
  persist,
  renderApp,
  closeModal,
  toast
});

const sessionActions = createSessionActions({
  getState: () => state,
  setState: nextState => { state = nextState; },
  getDraft,
  getCurrentDay: () => state.currentDay,
  setCurrentDay: day => { state.currentDay = day; },
  setPendingDay: day => { ui.pendingDay = day; },
  nextDay,
  getPlanTitle: () => getPlan().title,
  persist,
  renderApp,
  closeModal,
  toast,
  createId,
  normalizeCustom,
  getDraftExists: () => Boolean(getDraft()),
  addExerciseToDraft: workoutActions.addExerciseToDraft,
  getConfirm: message => confirm(message)
});

const exportActions = createExportActions({
  getState: () => state,
  download
});

function toggleCustomExercise(exerciseId: string) {
  const target = state.customExercises.find(item => item.id === exerciseId);
  if (!target) return;
  target.active = !target.active;
  persist();
  renderModal();
  renderApp();
}

function saveDay() {
  state.currentDay = normalizeDay((document.getElementById("daySelect") as HTMLSelectElement | null)?.value || state.currentDay, PLAN_DAYS.length);
  ui.pendingDay = state.currentDay;
  persist();
  renderApp();
}

function logout() {
  return supabase.auth.signOut().then(() => undefined);
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

bindGlobalEvents({
  closeModal,
  renderAuth,
  renderApp,
  renderModal,
  setAuthMode: mode => { ui.authMode = mode; ui.authError = ""; },
  switchTab: tab => { ui.tab = tab; },
  createDraft,
  markRestComplete: sessionActions.markRestComplete,
  addSet: workoutActions.addSet,
  removeSet: workoutActions.removeSet,
  toggleExercise: workoutActions.toggleExercise,
  completeWorkout: sessionActions.completeWorkout,
  openModal,
  toggleCustomExercise,
  addExerciseToDraft: workoutActions.addExerciseToDraft,
  saveCloudState,
  exportJson: exportActions.exportJson,
  exportCsv: exportActions.exportCsv,
  logout,
  saveDay,
  resetProgress: sessionActions.resetProgress,
  reloadCloudCache,
  updateDraftField: workoutActions.updateDraftField,
  updateSetField: workoutActions.updateSetField,
  rerenderWithFocus,
  setHistoryQuery: value => { ui.historyQuery = value; },
  setLibraryQuery: value => { ui.libraryQuery = value; },
  setPickerQuery: value => { ui.pickerQuery = value; },
  setPendingDay: value => { ui.pendingDay = value; },
  handleAuthSubmit: authActions.handleAuthSubmit,
  saveExercise: sessionActions.saveExercise,
  hasModal: () => Boolean(ui.modal)
});

async function boot() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    currentSession = data.session || null;
    ui.booting = false;
    renderAll();
    if (currentSession?.user) await initCloudState();
    else setSync("登录后会自动同步训练数据", "info");
    supabase.auth.onAuthStateChange(async (type, session) => {
      if (type === "INITIAL_SESSION") return;
      currentSession = session || null;
      ui.tab = "training";
      ui.modal = null;
      renderAll();
      if (currentSession?.user) await initCloudState();
    });
  } catch (error) {
    ui.booting = false;
    ui.authError = getErrorMessage(error) || "初始化失败，请刷新页面重试。";
    renderAll();
  }
}

boot();
