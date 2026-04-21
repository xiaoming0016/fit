/**
 * 文件说明：
 * 全局 DOM 事件绑定层。
 * 将页面事件分发到业务动作与状态更新函数。
 */

import type { WorkoutSet } from "../types";

interface BindingsDeps {
  closeModal: () => void;
  renderAuth: () => void;
  renderApp: () => void;
  renderModal: () => void;
  setAuthMode: (mode: "signin" | "signup") => void;
  switchTab: (tab: "training" | "history" | "me") => void;
  createDraft: (mode: "plan" | "free") => void;
  markRestComplete: () => void;
  addSet: (itemKey: string) => void;
  removeSet: (itemKey: string, setIndex: number) => void;
  toggleExercise: (itemKey: string) => void;
  completeWorkout: () => void;
  openModal: (type: "history" | "library" | "picker" | "form", payload?: Record<string, unknown>) => void;
  toggleCustomExercise: (exerciseId: string) => void;
  addExerciseToDraft: (exerciseId: string) => void;
  saveCloudState: () => Promise<void>;
  exportJson: () => void;
  exportCsv: () => void;
  logout: () => Promise<void>;
  saveDay: () => void;
  resetProgress: () => void;
  reloadCloudCache: () => Promise<void>;
  updateDraftField: (field: "bodyWeight" | "note", value: string) => void;
  updateSetField: (itemKey: string, setIndex: number, field: keyof WorkoutSet, value: string) => void;
  rerenderWithFocus: (renderFn: () => void, inputId: string, value: string) => void;
  setHistoryQuery: (value: string) => void;
  setLibraryQuery: (value: string) => void;
  setPickerQuery: (value: string) => void;
  setPendingDay: (value: number) => void;
  handleAuthSubmit: (form: HTMLFormElement) => void;
  saveExercise: (form: HTMLFormElement) => void;
  hasModal: () => boolean;
}

export function bindGlobalEvents(deps: BindingsDeps) {
  document.addEventListener("click", async event => {
    const button = (event.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
    if (!button) return;
    const action = button.dataset.action;
    if (action === "close-overlay" && event.target === button) return deps.closeModal();
    if (action === "set-auth-mode") {
      deps.setAuthMode((button.dataset.mode as "signin" | "signup") || "signin");
      return deps.renderAuth();
    }
    if (action === "switch-tab") {
      deps.switchTab((button.dataset.tab as "training" | "history" | "me") || "training");
      return deps.renderApp();
    }
    if (action === "start-plan") return deps.createDraft("plan");
    if (action === "start-free") return deps.createDraft("free");
    if (action === "mark-rest") return deps.markRestComplete();
    if (action === "add-set") return deps.addSet(button.dataset.itemKey || "");
    if (action === "remove-set") return deps.removeSet(button.dataset.itemKey || "", Number(button.dataset.setIndex));
    if (action === "toggle-exercise") return deps.toggleExercise(button.dataset.itemKey || "");
    if (action === "complete-workout") return deps.completeWorkout();
    if (action === "open-history") return deps.openModal("history", { id: button.dataset.historyId || "" });
    if (action === "open-library") return deps.openModal("library");
    if (action === "open-picker") return deps.openModal("picker");
    if (action === "open-form") return deps.openModal("form");
    if (action === "open-form-from-picker") return deps.openModal("form", { fromPicker: true });
    if (action === "edit-exercise") return deps.openModal("form", { id: button.dataset.exerciseId });
    if (action === "toggle-custom") return deps.toggleCustomExercise(button.dataset.exerciseId || "");
    if (action === "pick-exercise") return deps.addExerciseToDraft(button.dataset.exerciseId || "");
    if (action === "sync-now") return deps.saveCloudState();
    if (action === "export-json") return deps.exportJson();
    if (action === "export-csv") return deps.exportCsv();
    if (action === "logout") return deps.logout();
    if (action === "save-day") return deps.saveDay();
    if (action === "reset-progress") return deps.resetProgress();
    if (action === "reload-cloud") return deps.reloadCloudCache();
    if (action === "close-modal") return deps.closeModal();
  });

  document.addEventListener("input", event => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (target.matches("[data-draft-meta]")) return deps.updateDraftField(target.dataset.draftMeta as "bodyWeight" | "note", target.value);
    if (target.matches("[data-set-field]")) return deps.updateSetField(target.dataset.itemKey || "", Number(target.dataset.setIndex), target.dataset.setField as keyof WorkoutSet, target.value);
    if (target.id === "historySearchInput") {
      deps.setHistoryQuery(target.value);
      return deps.rerenderWithFocus(deps.renderApp, "historySearchInput", target.value);
    }
    if (target.id === "librarySearchInput") {
      deps.setLibraryQuery(target.value);
      return deps.rerenderWithFocus(deps.renderModal, "librarySearchInput", target.value);
    }
    if (target.id === "pickerSearchInput") {
      deps.setPickerQuery(target.value);
      return deps.rerenderWithFocus(deps.renderModal, "pickerSearchInput", target.value);
    }
  });

  document.addEventListener("change", event => {
    const target = event.target as HTMLSelectElement;
    if (target.id === "daySelect") deps.setPendingDay(Number(target.value));
  });

  document.addEventListener("submit", event => {
    const form = event.target as HTMLFormElement;
    if (form.matches("[data-form='auth']")) {
      event.preventDefault();
      deps.handleAuthSubmit(form);
    }
    if (form.matches("[data-form='exercise']")) {
      event.preventDefault();
      deps.saveExercise(form);
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && deps.hasModal()) deps.closeModal();
  });
}
