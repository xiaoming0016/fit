/**
 * 文件说明：
 * 视图渲染层。
 * 提供页面与弹窗的 HTML 模板函数，不直接处理业务状态变更。
 */

import type { ExerciseDefinition, HistoryEntry, PlanDay, RecordType, UiState, WorkoutDraft, WorkoutSet } from "../types";
import { escapeHtml, formatDate, formatDateTime, recordTypeLabel, summarizeSet } from "../utils/common";
import { emptySet, hasSetData } from "../utils/workout";

interface RenderShared {
  planDays: PlanDay[];
  systemExercises: ExerciseDefinition[];
}

interface RenderTrainingInput extends RenderShared {
  stateCurrentDay: number;
  stateHistory: HistoryEntry[];
  plan: PlanDay;
  draft: WorkoutDraft | null;
  getExerciseById: (exerciseId: string) => ExerciseDefinition | null;
  lastReference: (exerciseId: string) => string;
}

interface RenderHistoryInput {
  history: HistoryEntry[];
  query: string;
}

interface RenderMeInput extends RenderShared {
  currentEmail: string;
  stateHistoryCount: number;
  customCount: number;
  customActiveCount: number;
  pendingDay: number;
  syncText: string;
  syncKind: UiState["syncKind"];
  lastSyncedAt: string;
}

function renderSetRow(itemKey: string, type: RecordType, set: WorkoutSet, index: number) {
  const compact = type === "reps_only" || type === "duration" ? "compact-two" : "";
  const fields = type === "weight_reps"
    ? `<div class="mini-field"><span>重量</span><input data-set-field="weight" data-item-key="${itemKey}" data-set-index="${index}" value="${escapeHtml(set.weight)}" placeholder="kg" /></div><div class="mini-field"><span>次数</span><input data-set-field="reps" data-item-key="${itemKey}" data-set-index="${index}" value="${escapeHtml(set.reps)}" placeholder="次数" /></div><div class="mini-field"><span>备注</span><input data-set-field="note" data-item-key="${itemKey}" data-set-index="${index}" value="${escapeHtml(set.note)}" placeholder="状态、RIR..." /></div>`
    : type === "reps_only"
      ? `<div class="mini-field"><span>次数</span><input data-set-field="reps" data-item-key="${itemKey}" data-set-index="${index}" value="${escapeHtml(set.reps)}" placeholder="次数" /></div><div class="mini-field"><span>备注</span><input data-set-field="note" data-item-key="${itemKey}" data-set-index="${index}" value="${escapeHtml(set.note)}" placeholder="节奏、感受..." /></div>`
      : type === "duration"
        ? `<div class="mini-field"><span>时长</span><input data-set-field="duration" data-item-key="${itemKey}" data-set-index="${index}" value="${escapeHtml(set.duration)}" placeholder="分钟" /></div><div class="mini-field"><span>备注</span><input data-set-field="note" data-item-key="${itemKey}" data-set-index="${index}" value="${escapeHtml(set.note)}" placeholder="配速、心率..." /></div>`
        : `<div class="mini-field"><span>距离</span><input data-set-field="distance" data-item-key="${itemKey}" data-set-index="${index}" value="${escapeHtml(set.distance)}" placeholder="km" /></div><div class="mini-field"><span>时长</span><input data-set-field="duration" data-item-key="${itemKey}" data-set-index="${index}" value="${escapeHtml(set.duration)}" placeholder="分钟" /></div><div class="mini-field"><span>备注</span><input data-set-field="note" data-item-key="${itemKey}" data-set-index="${index}" value="${escapeHtml(set.note)}" placeholder="配速、感受..." /></div>`;
  return `<div class="set-row ${compact}"><div class="set-index">#${index + 1}</div>${fields}<button type="button" class="icon-btn" data-action="remove-set" data-item-key="${itemKey}" data-set-index="${index}">−</button></div>`;
}

export function renderAuthView(input: { booting: boolean; authMode: "signin" | "signup"; authBusy: boolean; authError: string }) {
  if (input.booting) {
    return `<div class="auth-card"><div class="loading-state"><div><div class="brand-mark">训</div><strong>正在检查登录状态</strong><div>稍等一下，马上进入训练记录页面。</div></div></div></div>`;
  }
  const helper = input.authMode === "signin" ? "登录后才能进入主页面，训练记录会自动同步到云端。" : "注册成功后，如启用了邮箱验证，请先完成验证。";
  return `
    <div class="auth-card">
      <div class="brand-mark">训</div>
      <div class="eyebrow">Training Tracker</div>
      <h1 class="auth-title">训练记录助手</h1>
      <div class="auth-copy">一个给自己用的轻网页训练记录页。先登录，再开始今天的训练。</div>
      <div class="auth-switch">
        <button type="button" class="switch-pill ${input.authMode === "signin" ? "active" : ""}" data-action="set-auth-mode" data-mode="signin">登录</button>
        <button type="button" class="switch-pill ${input.authMode === "signup" ? "active" : ""}" data-action="set-auth-mode" data-mode="signup">注册</button>
      </div>
      <form class="form-stack" data-form="auth">
        <div class="field"><label for="authEmailInput">邮箱</label><input id="authEmailInput" type="email" placeholder="you@example.com" required /></div>
        <div class="field"><label for="authPasswordInput">密码</label><input id="authPasswordInput" type="password" placeholder="至少 6 位" required /></div>
        <div class="small muted">${escapeHtml(helper)}</div>
        ${input.authError ? `<div class="chip error">${escapeHtml(input.authError)}</div>` : ""}
        <div class="button-row full"><button type="submit" class="primary-btn" ${input.authBusy ? "disabled" : ""}>${input.authBusy ? "处理中..." : input.authMode === "signin" ? "登录进入训练页" : "注册并创建账号"}</button></div>
      </form>
    </div>
  `;
}

export function renderTrainingView(input: RenderTrainingInput) {
  const strip = `<div class="day-strip">${input.planDays.map(day => `<div class="day-pill ${day.id === input.stateCurrentDay ? "current" : input.stateHistory.some(entry => entry.day === day.id) ? "done" : ""}">${day.id}</div>`).join("")}</div>`;
  if (!input.draft) {
    return `<div class="panel-stack"><div class="hero-card"><div class="hero-top"><div><div class="eyebrow">Today</div><h2 class="section-title" style="margin-top:8px">${escapeHtml(input.plan.title)}</h2><p class="section-copy">${escapeHtml(input.plan.goal)} · 预计 ${escapeHtml(input.plan.duration)}</p></div><span class="status-pill ${input.plan.type === "rest" ? "rest" : "info"}">${input.plan.type === "rest" ? "休息日" : "待开始"}</span></div>${strip}<div class="button-row full" style="margin-top:18px">${input.plan.type === "train" ? `<button type="button" class="primary-btn" data-action="start-plan">开始今天训练</button>` : `<button type="button" class="primary-btn" data-action="mark-rest">标记今天已休息</button>`}<button type="button" class="secondary-btn" data-action="start-free">${input.plan.type === "rest" ? "开始自由训练" : "今天改成自由训练"}</button></div></div><div class="card"><div class="card-head"><div><h3 class="section-title">今日动作预览</h3><div class="section-copy">开始后就进入可记录状态。</div></div></div><div class="preview-list">${input.plan.exercises.length ? input.plan.exercises.map(item => { const definition = input.getExerciseById(item.exerciseId); return `<div class="preview-item"><div class="preview-name">${escapeHtml(definition?.name || item.exerciseId)}</div><div class="preview-meta">${item.targetSets} 组 · ${escapeHtml(item.targetReps)} · ${escapeHtml(item.targetNote)}</div></div>`; }).join("") : `<div class="empty-state"><strong>今天是休息日</strong><div>如果你状态不错，也可以开始一场自由训练。</div></div>`}</div></div></div>`;
  }
  const cards = input.draft.exerciseOrder.map(itemKey => {
    const item = input.draft?.exerciseItems[itemKey];
    return `<div class="exercise-card ${item.completed ? "completed" : ""}"><div class="exercise-top"><div><div class="exercise-name">${escapeHtml(item.nameSnapshot)}</div><div class="exercise-meta">${escapeHtml(item.targetSets)} 组 · ${escapeHtml(item.targetReps || "自定义")} · ${escapeHtml(item.targetNote || recordTypeLabel(item.recordType))}</div><div class="exercise-meta">${escapeHtml(input.lastReference(item.exerciseId))}</div></div><div class="chip-row"><span class="chip">${escapeHtml(item.category)}</span><span class="chip ${item.completed ? "success" : "info"}">${item.completed ? "已完成" : "记录中"}</span></div></div><div class="set-list">${item.sets.map((set, index) => renderSetRow(itemKey, item.recordType, set, index)).join("")}</div><div class="exercise-actions"><button type="button" class="ghost-btn" data-action="add-set" data-item-key="${itemKey}">新增一组</button><button type="button" class="secondary-btn" data-action="toggle-exercise" data-item-key="${itemKey}">${item.completed ? "取消完成" : "标记完成"}</button></div></div>`;
  }).join("");
  return `<div class="panel-stack"><div class="hero-card"><div class="hero-top"><div><div class="eyebrow">${input.draft.mode === "free" ? "Free Workout" : "Today"}</div><h2 class="section-title" style="margin-top:8px">${escapeHtml(input.draft.title)}</h2><p class="section-copy">从这里直接记录每个动作。完成后会自动进入下一训练日。</p></div><span class="status-pill success">进行中</span></div><div class="overview-grid" style="margin-top:18px"><div class="metric-card"><div class="metric-label">当前 Day</div><div class="metric-value">Day ${input.stateCurrentDay}</div></div><div class="metric-card"><div class="metric-label">已加入动作</div><div class="metric-value">${input.draft.exerciseOrder.length} 个</div></div></div><div class="button-row full" style="margin-top:18px"><button type="button" class="ghost-btn" data-action="open-picker">添加动作</button><button type="button" class="primary-btn" data-action="complete-workout">完成今天</button></div></div><div class="card"><div class="field"><label for="bodyWeightInput">体重（kg）</label><input id="bodyWeightInput" data-draft-meta="bodyWeight" value="${escapeHtml(input.draft.bodyWeight)}" placeholder="例如 95.0" /></div><div class="field"><label for="draftNoteInput">训练备注</label><textarea id="draftNoteInput" data-draft-meta="note" placeholder="今天状态、动作感受、加重情况...">${escapeHtml(input.draft.note)}</textarea></div></div>${cards || `<div class="empty-state"><strong>还没有动作</strong><div>先从动作库里添加一个动作。</div></div>`}</div>`;
}

export function renderHistoryView(input: RenderHistoryInput) {
  const query = input.query.trim().toLowerCase();
  const list = [...input.history].reverse().filter(entry => !query || entry.title.toLowerCase().includes(query) || (entry.note || "").toLowerCase().includes(query) || entry.exercises.some(item => item.nameSnapshot.toLowerCase().includes(query)));
  return `<div class="panel-stack"><div class="card"><div class="card-head"><div><h3 class="section-title">训练历史</h3><div class="section-copy">支持按标题、备注或动作名搜索。</div></div></div><input id="historySearchInput" class="search-input" value="${escapeHtml(input.query)}" placeholder="搜索训练标题或动作..." /></div>${list.length ? `<div class="history-list">${list.map(entry => `<button type="button" class="history-card" data-action="open-history" data-history-id="${escapeHtml(entry.id)}"><div class="history-top"><div><div class="history-name">${escapeHtml(entry.title)}</div><div class="history-copy">${escapeHtml(formatDate(entry.dateKey))}</div></div><span class="chip ${entry.status === "rest" ? "rest" : "success"}">${entry.status === "rest" ? "休息记录" : entry.mode === "free" ? "自由训练" : "计划训练"}</span></div><div class="history-meta"><span class="chip">Day ${entry.day}</span><span class="chip">${entry.exercises.length} 个动作</span>${entry.bodyWeight ? `<span class="chip">${escapeHtml(entry.bodyWeight)} kg</span>` : ""}</div>${entry.note ? `<div class="history-copy" style="margin-top:10px">${escapeHtml(entry.note)}</div>` : ""}</button>`).join("")}</div>` : `<div class="empty-state"><strong>${input.history.length ? "没有匹配到记录" : "还没有训练历史"}</strong><div>${input.history.length ? "换个关键字再试试。" : "完成一次训练后，这里会出现完整记录。"}</div></div>`}</div>`;
}

export function renderMeView(input: RenderMeInput) {
  return `<div class="panel-stack"><div class="card"><div class="card-head"><div><h3 class="section-title">账号</h3><div class="section-copy">${escapeHtml(input.currentEmail || "--")}</div></div><button type="button" class="danger-btn" data-action="logout">退出登录</button></div></div><div class="card"><div class="card-head"><div><h3 class="section-title">同步与导出</h3><div class="section-copy" data-sync-text>${escapeHtml(input.syncText)}</div></div><span data-sync-badge class="sync-pill ${input.syncKind}"></span></div><div class="small muted">最近同步：<span data-last-sync>${escapeHtml(input.lastSyncedAt ? formatDateTime(input.lastSyncedAt) : "尚未同步")}</span></div><div class="button-row full" style="margin-top:14px"><button type="button" class="primary-btn" data-action="sync-now">立即同步</button><button type="button" class="secondary-btn" data-action="export-json">导出 JSON</button><button type="button" class="secondary-btn" data-action="export-csv">导出 CSV</button></div></div><div class="card"><div class="card-head"><div><h3 class="section-title">训练进度</h3><div class="section-copy">可以手动调整当前循环日。</div></div></div><div class="field"><label for="daySelect">当前 Day</label><select id="daySelect">${input.planDays.map(day => `<option value="${day.id}" ${input.pendingDay === day.id ? "selected" : ""}>${escapeHtml(day.title)}</option>`).join("")}</select></div><div class="button-row full"><button type="button" class="primary-btn" data-action="save-day">保存当前 Day</button><button type="button" class="danger-btn" data-action="reset-progress">重置训练进度</button></div></div><div class="card"><div class="card-head"><div><h3 class="section-title">动作库</h3><div class="section-copy">自定义动作 ${input.customCount} 个，其中启用中 ${input.customActiveCount} 个。</div></div><button type="button" class="ghost-btn" data-action="open-library">管理动作库</button></div><div class="button-row full" style="margin-top:14px"><button type="button" class="secondary-btn" data-action="reload-cloud">从云端重建本地缓存</button></div></div></div>`;
}

export function renderAppView(input: {
  uiTab: UiState["tab"];
  uiSyncKind: UiState["syncKind"];
  uiSyncText: string;
  stateCurrentDay: number;
  stateHistoryCount: number;
  currentEmail: string;
  planGoal: string;
  panelHtml: string;
}) {
  const headerMap = {
    training: { eyebrow: `当前计划 · Day ${input.stateCurrentDay}`, title: "训练", note: input.planGoal },
    history: { eyebrow: `已记录 ${input.stateHistoryCount} 次训练`, title: "历史", note: "回看过去的训练和动作表现" },
    me: { eyebrow: "个人设置", title: "我的", note: input.currentEmail || "" }
  };
  const current = headerMap[input.uiTab];
  return `<header class="app-header"><div><div class="eyebrow">${escapeHtml(current.eyebrow)}</div><div class="page-title">${escapeHtml(current.title)}</div><div class="header-note">${escapeHtml(current.note)}</div></div><div class="card-stack" style="align-items:flex-end"><div data-sync-badge class="sync-pill ${input.uiSyncKind}"></div><div class="small muted" data-sync-text></div></div></header><main class="app-content">${input.panelHtml}</main><nav class="tabbar">${["training", "history", "me"].map(tab => `<button type="button" class="tab-item ${input.uiTab === tab ? "active" : ""}" data-action="switch-tab" data-tab="${tab}"><strong>${tab === "training" ? "Today" : tab === "history" ? "History" : "Profile"}</strong><span>${tab === "training" ? "训练" : tab === "history" ? "历史" : "我的"}</span></button>`).join("")}</nav>`;
}

export function renderHistoryModalView(entry: HistoryEntry) {
  return `<div class="modal-overlay" data-action="close-overlay"><div class="modal-sheet"><div class="modal-head"><div><div class="eyebrow">训练详情</div><div class="modal-title">${escapeHtml(entry.title)}</div><div class="muted">${escapeHtml(formatDate(entry.dateKey))}</div></div><button type="button" class="modal-close" data-action="close-modal">×</button></div><div class="modal-body"><div class="detail-meta"><span class="chip">Day ${entry.day}</span><span class="chip ${entry.status === "rest" ? "rest" : "success"}">${entry.status === "rest" ? "休息记录" : entry.mode === "free" ? "自由训练" : "计划训练"}</span>${entry.bodyWeight ? `<span class="chip">${escapeHtml(entry.bodyWeight)} kg</span>` : ""}</div>${entry.note ? `<div class="card" style="margin-top:16px"><div class="section-copy">${escapeHtml(entry.note)}</div></div>` : ""}<div class="detail-list" style="margin-top:16px">${entry.exercises.length ? entry.exercises.map(item => `<div class="detail-item"><div class="detail-name">${escapeHtml(item.nameSnapshot)}</div><div class="detail-copy">${escapeHtml(item.category)} · ${escapeHtml(recordTypeLabel(item.recordType))}</div><div class="set-summary">${(item.sets.filter(hasSetData).length ? item.sets.filter(hasSetData) : [emptySet()]).map((set, index) => `<span class="set-tag">#${index + 1} · ${escapeHtml(summarizeSet(set, item.recordType))}${set.note ? ` · ${escapeHtml(set.note)}` : ""}</span>`).join("")}</div></div>`).join("") : `<div class="empty-state"><strong>这是一条休息记录</strong><div>当天没有训练动作，只作为进度推进。</div></div>`}</div></div></div></div>`;
}

export function renderLibraryModalView(input: { libraryQuery: string; customExercises: ExerciseDefinition[]; systemExercises: ExerciseDefinition[] }) {
  const query = input.libraryQuery.trim().toLowerCase();
  const mine = input.customExercises.filter(item => !query || item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));
  const system = input.systemExercises.filter(item => !query || item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));
  return `<div class="modal-overlay" data-action="close-overlay"><div class="modal-sheet"><div class="modal-head"><div><div class="eyebrow">Exercise Library</div><div class="modal-title">动作库管理</div><div class="muted">自定义动作可编辑和停用，系统动作只读。</div></div><button type="button" class="modal-close" data-action="close-modal">×</button></div><div class="modal-body"><div class="button-row spread" style="margin-bottom:14px"><input id="librarySearchInput" class="search-input" value="${escapeHtml(input.libraryQuery)}" placeholder="搜索动作名称或分类..." /><button type="button" class="primary-btn" data-action="open-form">新建动作</button></div><div class="card" style="margin-bottom:16px"><div class="card-head"><div><h3 class="section-title">我的动作</h3></div></div><div class="library-list">${mine.length ? mine.map(item => `<div class="library-item"><div><div class="preview-name">${escapeHtml(item.name)}</div><div class="preview-meta">${escapeHtml(item.category)} · ${escapeHtml(recordTypeLabel(item.recordType))}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</div></div><div class="button-row"><button type="button" class="mini-btn" data-action="edit-exercise" data-exercise-id="${escapeHtml(item.id)}">编辑</button><button type="button" class="mini-btn" data-action="toggle-custom" data-exercise-id="${escapeHtml(item.id)}">${item.active ? "停用" : "启用"}</button></div></div>`).join("") : `<div class="empty-state"><strong>还没有自定义动作</strong><div>点右上角“新建动作”添加到动作库里。</div></div>`}</div></div><div class="card"><div class="card-head"><div><h3 class="section-title">系统动作</h3></div></div><div class="library-list">${system.map(item => `<div class="library-item"><div><div class="preview-name">${escapeHtml(item.name)}</div><div class="preview-meta">${escapeHtml(item.category)} · ${escapeHtml(recordTypeLabel(item.recordType))}</div></div><span class="chip info">系统动作</span></div>`).join("")}</div></div></div></div></div>`;
}

export function renderPickerModalView(input: { pickerQuery: string; draft: WorkoutDraft | null; getCatalog: () => ExerciseDefinition[] }) {
  if (!input.draft) return "";
  const query = input.pickerQuery.trim().toLowerCase();
  const list = input.getCatalog().filter(item => {
    const alreadyAdded = input.draft?.exerciseOrder.some(itemKey => input.draft?.exerciseItems[itemKey]?.exerciseId === item.id);
    return (item.source === "system" || item.active) && !alreadyAdded && (!query || item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));
  });
  return `<div class="modal-overlay" data-action="close-overlay"><div class="modal-sheet"><div class="modal-head"><div><div class="eyebrow">Add Exercise</div><div class="modal-title">添加动作</div><div class="muted">可选系统动作，也可以直接新建自定义动作。</div></div><button type="button" class="modal-close" data-action="close-modal">×</button></div><div class="modal-body"><div class="button-row spread" style="margin-bottom:14px"><input id="pickerSearchInput" class="search-input" value="${escapeHtml(input.pickerQuery)}" placeholder="搜索动作名称或分类..." /><button type="button" class="primary-btn" data-action="open-form-from-picker">新建动作</button></div>${list.length ? list.map(item => `<div class="picker-item"><div><div class="preview-name">${escapeHtml(item.name)}</div><div class="preview-meta">${escapeHtml(item.category)} · ${escapeHtml(recordTypeLabel(item.recordType))}</div></div><button type="button" class="ghost-btn" data-action="pick-exercise" data-exercise-id="${escapeHtml(item.id)}">加入训练</button></div>`).join("") : `<div class="empty-state"><strong>没有可加入的动作</strong><div>可能都已经加到今天的训练里了，也可以直接新建一个动作。</div></div>`}</div></div></div>`;
}

export function renderFormModalView(item: ExerciseDefinition | null, fromPicker: boolean) {
  return `<div class="modal-overlay" data-action="close-overlay"><div class="modal-sheet"><div class="modal-head"><div><div class="eyebrow">Custom Exercise</div><div class="modal-title">${item ? "编辑自定义动作" : "新建自定义动作"}</div></div><button type="button" class="modal-close" data-action="close-modal">×</button></div><div class="modal-body"><form class="form-stack" data-form="exercise"><input type="hidden" id="exerciseFormId" value="${escapeHtml(item?.id || "")}" /><input type="hidden" id="exerciseFormFromPicker" value="${fromPicker ? "true" : "false"}" /><div class="field"><label for="exerciseNameInput">动作名称</label><input id="exerciseNameInput" value="${escapeHtml(item?.name || "")}" required /></div><div class="field"><label for="exerciseCategoryInput">动作分类</label><select id="exerciseCategoryInput">${["胸", "背", "腿", "肩", "手臂", "核心", "有氧", "其他"].map(option => `<option value="${option}" ${(item?.category || "其他") === option ? "selected" : ""}>${option}</option>`).join("")}</select></div><div class="field"><label for="exerciseRecordTypeInput">记录方式</label><select id="exerciseRecordTypeInput">${[{ value: "weight_reps", label: "重量 + 次数" }, { value: "reps_only", label: "仅次数" }, { value: "duration", label: "仅时长" }, { value: "distance_duration", label: "距离 / 时长" }].map(option => `<option value="${option.value}" ${(item?.recordType || "weight_reps") === option.value ? "selected" : ""}>${option.label}</option>`).join("")}</select></div><div class="field"><label for="exerciseNoteInput">备注说明</label><textarea id="exerciseNoteInput">${escapeHtml(item?.note || "")}</textarea></div><div class="field"><label for="exerciseActiveInput">状态</label><select id="exerciseActiveInput"><option value="true" ${(item?.active ?? true) ? "selected" : ""}>启用</option><option value="false" ${item && item.active === false ? "selected" : ""}>停用</option></select></div><div class="button-row full"><button type="submit" class="primary-btn">保存动作</button><button type="button" class="secondary-btn" data-action="close-modal">取消</button></div></form></div></div></div>`;
}
