/**
 * 文件说明：
 * 认证相关动作。
 * 负责登录/注册提交流程与错误处理，不直接绑定 DOM 事件。
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface AuthActionDeps {
  supabase: SupabaseClient;
  getAuthMode: () => "signin" | "signup";
  setAuthMode: (mode: "signin" | "signup") => void;
  getAuthBusy: () => boolean;
  setAuthBusy: (value: boolean) => void;
  setAuthError: (value: string) => void;
  renderAuth: () => void;
  toast: (message: string) => void;
  siteUrl: string;
  getErrorMessage: (error: unknown) => string;
}

export function createAuthActions(deps: AuthActionDeps) {
  async function handleAuthSubmit(form: HTMLFormElement) {
    if (deps.getAuthBusy()) return;
    const email = (form.querySelector("#authEmailInput") as HTMLInputElement)?.value.trim();
    const password = (form.querySelector("#authPasswordInput") as HTMLInputElement)?.value;
    if (!email || !password) {
      deps.setAuthError("请先填写邮箱和密码。");
      deps.renderAuth();
      return;
    }

    deps.setAuthBusy(true);
    deps.setAuthError("");
    deps.renderAuth();
    try {
      if (deps.getAuthMode() === "signin") {
        const { error } = await deps.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await deps.supabase.auth.signUp({ email, password, options: { emailRedirectTo: deps.siteUrl } });
        if (error) throw error;
        if (!data.session) {
          deps.toast("注册成功，请按你的 Supabase 设置完成邮箱验证后再登录。");
          deps.setAuthMode("signin");
        }
      }
    } catch (error) {
      deps.setAuthError(deps.getErrorMessage(error) || "登录失败，请稍后再试。");
    } finally {
      deps.setAuthBusy(false);
      deps.renderAuth();
    }
  }

  return {
    handleAuthSubmit
  };
}
