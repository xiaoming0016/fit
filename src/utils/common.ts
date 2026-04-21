/**
 * 文件说明：
 * 通用工具函数集合。
 * 包含转义、日期格式化、字符串解析与展示文案工具。
 */

import type { RecordType } from "../types";
import type { WorkoutSet } from "../types";

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error ?? "未知错误");
}

export function parseSetCount(value: unknown, fallback = 3) {
  if (Number.isFinite(Number(value))) return Math.max(1, Math.round(Number(value)));
  const text = String(value ?? "").trim();
  if (!text) return Math.max(1, fallback);
  const range = text.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) return Math.max(1, Number(range[2]) || Number(range[1]) || fallback);
  const single = text.match(/^(\d+)/);
  if (single) return Math.max(1, Number(single[1]) || fallback);
  return Math.max(1, fallback);
}

export function normalizeTargetSetsLabel(value: unknown, fallbackCount = 3) {
  const text = String(value ?? "").trim();
  if (text) return text;
  return String(Math.max(1, fallbackCount));
}

export function todayKey(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(value: unknown) {
  if (!value) return "--";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.replaceAll("-", "/");
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return text;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateTime(value: unknown) {
  if (!value) return "--";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function recordTypeLabel(type: RecordType) {
  return {
    weight_reps: "重量 + 次数",
    reps_only: "仅次数",
    duration: "仅时长",
    distance_duration: "距离 / 时长"
  }[type] || "重量 + 次数";
}

export function summarizeSet(set: WorkoutSet, type: RecordType) {
  if (type === "reps_only") return `${set.reps || "-"} 次`;
  if (type === "duration") return `${set.duration || "-"} 分钟`;
  if (type === "distance_duration") return `${set.distance || "-"} km · ${set.duration || "-"} 分钟`;
  return `${set.weight || "-"} kg · ${set.reps || "-"} 次`;
}
