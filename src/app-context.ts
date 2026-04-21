/**
 * 文件说明：
 * 应用上下文组装层。
 * 用于集中管理根节点引用，减少 main.ts 的样板代码。
 */

export interface AppContext {
  authScreen: HTMLElement;
  appScreen: HTMLElement;
  modalRoot: HTMLElement;
  toastEl: HTMLElement;
}

export function createAppContext(): AppContext {
  const authScreen = document.getElementById("authScreen");
  const appScreen = document.getElementById("appScreen");
  const modalRoot = document.getElementById("modalRoot");
  const toastEl = document.getElementById("toast");

  if (!authScreen || !appScreen || !modalRoot || !toastEl) {
    throw new Error("页面缺少必要挂载节点，请检查 index.html 结构。");
  }

  return {
    authScreen,
    appScreen,
    modalRoot,
    toastEl
  };
}
