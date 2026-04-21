/**
 * 文件说明：
 * 云同步服务层。
 * 负责与 Supabase 的训练状态拉取、保存、排队同步与重载缓存。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "../types";

interface CloudSyncDeps {
  supabase: SupabaseClient;
  getUserId: () => string | null;
  getState: () => AppState;
  setState: (state: AppState) => void;
  getIsHydrating: () => boolean;
  setIsHydrating: (value: boolean) => void;
  setLastSyncedAt: (value: string) => void;
  setPendingDay: (value: number) => void;
  setSync: (text: string, kind: "info" | "waiting" | "error" | "synced") => void;
  renderAll: () => void;
  saveLocalState: () => void;
  normalizeState: (raw: unknown) => AppState;
  getDefaultState: () => AppState;
  getErrorMessage: (error: unknown) => string;
}

export function createCloudSyncManager(deps: CloudSyncDeps) {
  let syncTimer: number | null = null;

  async function fetchCloudState() {
    const userId = deps.getUserId();
    if (!userId) return null;
    const { data, error } = await deps.supabase
      .from("training_states")
      .select("state,updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function saveCloudState() {
    const userId = deps.getUserId();
    if (!userId || deps.getIsHydrating()) return;
    const updatedAt = new Date().toISOString();
    deps.setSync("正在同步到云端", "waiting");
    const { error } = await deps.supabase
      .from("training_states")
      .upsert({ user_id: userId, state: deps.getState(), updated_at: updatedAt }, { onConflict: "user_id" });
    if (error) {
      deps.setSync(`同步失败：${error.message}`, "error");
      return;
    }
    deps.setLastSyncedAt(updatedAt);
    deps.setSync("最近改动已同步到云端", "synced");
  }

  function queueSync() {
    const userId = deps.getUserId();
    if (!userId) return;
    deps.setSync("检测到新改动，等待同步", "waiting");
    if (syncTimer) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      saveCloudState().catch(error => deps.setSync(`同步失败：${deps.getErrorMessage(error)}`, "error"));
    }, 900);
  }

  async function initCloudState() {
    const userId = deps.getUserId();
    if (!userId) return;
    try {
      deps.setIsHydrating(true);
      deps.setSync("正在连接云端数据", "waiting");
      const cloud = await fetchCloudState();
      if (cloud?.state) {
        const nextState = deps.normalizeState(cloud.state);
        deps.setState(nextState);
        deps.setPendingDay(nextState.currentDay);
        deps.setLastSyncedAt(cloud.updated_at || "");
        deps.saveLocalState();
        deps.renderAll();
        deps.setSync("已加载云端数据", "synced");
      } else {
        await saveCloudState();
        deps.renderAll();
      }
    } catch (error) {
      deps.setSync(`读取云端失败：${deps.getErrorMessage(error)}`, "error");
    } finally {
      deps.setIsHydrating(false);
    }
  }

  async function reloadCloudCache() {
    if (!confirm("确定要用云端数据重建本地缓存吗？当前浏览器里的未同步改动会被覆盖。")) return;
    const cloud = await fetchCloudState();
    const nextState = deps.normalizeState(cloud?.state || deps.getDefaultState());
    deps.setState(nextState);
    deps.setPendingDay(nextState.currentDay);
    deps.setLastSyncedAt(cloud?.updated_at || "");
    deps.saveLocalState();
    deps.renderAll();
    deps.setSync("已从云端重建本地缓存", "synced");
  }

  return {
    fetchCloudState,
    saveCloudState,
    queueSync,
    initCloudState,
    reloadCloudCache
  };
}
