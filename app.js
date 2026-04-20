(() => {
  const { SUPABASE_URL, SUPABASE_KEY, SITE_URL, STORAGE_KEY, LEGACY_STORAGE_KEYS } = window.APP_CONFIG;
  const SYSTEM_EXERCISES = window.SYSTEM_EXERCISES;
  const PLAN_DAYS = window.PLAN_DAYS;

  const authScreen = document.getElementById("authScreen");
  const appScreen = document.getElementById("appScreen");
  const modalRoot = document.getElementById("modalRoot");
  const toastEl = document.getElementById("toast");

  let currentSession = null;
  let isHydrating = false;
  let syncTimer = null;
  let toastTimer = null;
  const supabase = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  function createId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function emptySet() {
    return { weight: "", reps: "", duration: "", distance: "", note: "" };
  }

  function normalizeSet(input = {}) {
    return {
      weight: String(input.weight ?? ""),
      reps: String(input.reps ?? ""),
      duration: String(input.duration ?? ""),
      distance: String(input.distance ?? ""),
      note: String(input.note ?? "")
    };
  }

  function normalizeDay(value) {
    const day = Number(value);
    if (!Number.isFinite(day) || day < 1) return 1;
    return Math.min(Math.round(day), PLAN_DAYS.length);
  }

  function todayKey(date = new Date()) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function formatDate(value) {
    if (!value) return "--";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replaceAll("-", "/");
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatDateTime(value) {
    if (!value) return "--";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return `${formatDate(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function recordTypeLabel(type) {
    return {
      weight_reps: "重量 + 次数",
      reps_only: "仅次数",
      duration: "仅时长",
      distance_duration: "距离 / 时长"
    }[type] || "重量 + 次数";
  }

  function getPlan(day = state.currentDay) {
    return PLAN_DAYS.find(item => item.id === normalizeDay(day)) || PLAN_DAYS[0];
  }

  function nextDay(day) {
    return day >= PLAN_DAYS.length ? 1 : day + 1;
  }

  function getCatalog(custom = state.customExercises) {
    return [...SYSTEM_EXERCISES, ...custom];
  }

  function getExerciseById(exerciseId, custom = state.customExercises) {
    return getCatalog(custom).find(item => item.id === exerciseId) || null;
  }

  function hasSetData(set) {
    return Boolean(set.weight || set.reps || set.duration || set.distance || set.note);
  }

  function hasExerciseData(item) {
    return item.completed || item.sets.some(hasSetData);
  }

  function parseSetCount(value, fallback = 3) {
    if (Number.isFinite(Number(value))) return Math.max(1, Math.round(Number(value)));
    const text = String(value ?? "").trim();
    if (!text) return Math.max(1, fallback);
    const range = text.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) return Math.max(1, Number(range[2]) || Number(range[1]) || fallback);
    const single = text.match(/^(\d+)/);
    if (single) return Math.max(1, Number(single[1]) || fallback);
    return Math.max(1, fallback);
  }

  function normalizeTargetSetsLabel(value, fallbackCount = 3) {
    const text = String(value ?? "").trim();
    if (text) return text;
    return String(Math.max(1, fallbackCount));
  }

  function makeDefaultState() {
    return { version: 2, currentDay: 1, workoutDrafts: {}, history: [], customExercises: [] };
  }

  function normalizeCustom(item = {}) {
    return {
      id: item.id || createId("custom"),
      name: String(item.name || "未命名动作").trim(),
      category: item.category || "其他",
      recordType: item.recordType || "weight_reps",
      note: item.note || "",
      source: "custom",
      active: item.active !== false
    };
  }

  function migrateLegacy(raw) {
    const next = makeDefaultState();
    next.currentDay = normalizeDay(raw.currentDay || 1);
    next.history = (raw.history || []).map(entry => ({
      id: createId("legacy"),
      dateKey: entry.date || todayKey(),
      day: normalizeDay(entry.day || 1),
      title: entry.title || `Day ${normalizeDay(entry.day || 1)}`,
      mode: entry.type === "rest" ? "rest" : "plan",
      status: entry.type === "rest" ? "rest" : "completed",
      bodyWeight: "",
      note: entry.dayNote || "",
      completedAt: "",
      exercises: Object.entries(entry.log || {}).map(([name, values]) => ({
        exerciseId: `legacy-${name}`,
        nameSnapshot: name,
        category: "其他",
        recordType: "weight_reps",
        completed: true,
        sets: [normalizeSet(values)]
      }))
    }));
    return next;
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return makeDefaultState();
    if (raw.version !== 2) return migrateLegacy(raw);
    const next = makeDefaultState();
    next.currentDay = normalizeDay(raw.currentDay || 1);
    next.customExercises = Array.isArray(raw.customExercises) ? raw.customExercises.map(normalizeCustom) : [];
    next.history = Array.isArray(raw.history) ? raw.history.map(entry => ({
      id: entry.id || createId("session"),
      dateKey: entry.dateKey || todayKey(),
      day: normalizeDay(entry.day || 1),
      title: entry.title || `Day ${normalizeDay(entry.day || 1)}`,
      mode: entry.mode || "plan",
      status: entry.status || "completed",
      bodyWeight: entry.bodyWeight || "",
      note: entry.note || "",
      completedAt: entry.completedAt || "",
      exercises: (entry.exercises || []).map(item => ({
        exerciseId: item.exerciseId || createId("exercise"),
        nameSnapshot: item.nameSnapshot || item.name || "未命名动作",
        category: item.category || "其他",
        recordType: item.recordType || "weight_reps",
        completed: item.completed !== false,
        sets: (item.sets || []).map(normalizeSet)
      }))
    })) : [];
    if (raw.workoutDrafts && typeof raw.workoutDrafts === "object") {
      Object.entries(raw.workoutDrafts).forEach(([key, draft]) => {
        const day = normalizeDay(key);
        next.workoutDrafts[day] = {
          day,
          mode: draft.mode || "plan",
          title: draft.title || getPlan(day).title,
          bodyWeight: draft.bodyWeight || "",
          note: draft.note || "",
          exerciseOrder: Array.isArray(draft.exerciseOrder) ? [...draft.exerciseOrder] : [],
          exerciseItems: {}
        };
        next.workoutDrafts[day].exerciseOrder.forEach(itemKey => {
          const source = draft.exerciseItems?.[itemKey] || {};
          const exerciseId = source.exerciseId || itemKey;
          const resolved = getExerciseById(exerciseId, next.customExercises);
          const setCount = parseSetCount(source.targetSets, 3);
          next.workoutDrafts[day].exerciseItems[itemKey] = {
            itemKey,
            exerciseId,
            nameSnapshot: source.nameSnapshot || resolved?.name || exerciseId,
            category: source.category || resolved?.category || "其他",
            recordType: source.recordType || resolved?.recordType || "weight_reps",
            completed: !!source.completed,
            targetSets: normalizeTargetSetsLabel(source.targetSets, setCount),
            targetReps: source.targetReps || "",
            targetNote: source.targetNote || "",
            sets: (source.sets || Array.from({ length: setCount }, emptySet)).map(normalizeSet)
          };
        });
      });
    }
    return next;
  }

  function loadState() {
    for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) return normalizeState(JSON.parse(raw));
      } catch (error) {
        console.error(error);
      }
    }
    return makeDefaultState();
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  }

  let state = loadState();
  const ui = {
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

  function getDraft() {
    return state.workoutDrafts[state.currentDay] || null;
  }

  function createDraftExercise(itemKey, definition, overrides = {}) {
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

  function createDraft(mode) {
    const plan = getPlan();
    const draft = {
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
    saveState();
    if (sync) queueSync();
  }

  function toast(message) {
    if (!message) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  function setSync(text, kind = "info") {
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

  function rerenderWithFocus(renderFn, inputId, value) {
    renderFn();
    requestAnimationFrame(() => {
      const input = document.getElementById(inputId);
      if (!input) return;
      input.focus();
      if (typeof input.setSelectionRange === "function") {
        input.setSelectionRange(String(value).length, String(value).length);
      }
    });
  }

  function summarizeSet(set, type) {
    if (type === "reps_only") return `${set.reps || "-"} 次`;
    if (type === "duration") return `${set.duration || "-"} 分钟`;
    if (type === "distance_duration") return `${set.distance || "-"} km · ${set.duration || "-"} 分钟`;
    return `${set.weight || "-"} kg · ${set.reps || "-"} 次`;
  }

  function lastReference(exerciseId) {
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

  async function fetchCloudState() {
    if (!supabase || !currentSession?.user?.id) return null;
    const { data, error } = await supabase.from("training_states").select("state,updated_at").eq("user_id", currentSession.user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function saveCloudState() {
    if (!supabase || !currentSession?.user?.id || isHydrating) return;
    const updatedAt = new Date().toISOString();
    setSync("正在同步到云端", "waiting");
    const { error } = await supabase
      .from("training_states")
      .upsert({ user_id: currentSession.user.id, state, updated_at: updatedAt }, { onConflict: "user_id" });
    if (error) {
      setSync(`同步失败：${error.message}`, "error");
      return;
    }
    ui.lastSyncedAt = updatedAt;
    setSync("最近改动已同步到云端", "synced");
  }

  function queueSync() {
    if (!currentSession?.user?.id) return;
    setSync("检测到新改动，等待同步", "waiting");
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      saveCloudState().catch(error => setSync(`同步失败：${error.message}`, "error"));
    }, 900);
  }

  async function initCloudState() {
    if (!currentSession?.user?.id) return;
    try {
      isHydrating = true;
      setSync("正在连接云端数据", "waiting");
      const cloud = await fetchCloudState();
      if (cloud?.state) {
        state = normalizeState(cloud.state);
        ui.pendingDay = state.currentDay;
        ui.lastSyncedAt = cloud.updated_at || "";
        saveState();
        renderAll();
        setSync("已加载云端数据", "synced");
      } else {
        await saveCloudState();
        renderAll();
      }
    } catch (error) {
      setSync(`读取云端失败：${error.message}`, "error");
    } finally {
      isHydrating = false;
    }
  }

  async function handleAuthSubmit(form) {
    if (ui.authBusy) return;
    if (!supabase) {
      ui.authError = "Supabase 服务未成功加载，请检查网络后刷新页面。";
      renderAuth();
      return;
    }
    const email = form.querySelector("#authEmailInput").value.trim();
    const password = form.querySelector("#authPasswordInput").value;
    if (!email || !password) {
      ui.authError = "请先填写邮箱和密码。";
      renderAuth();
      return;
    }
    ui.authBusy = true;
    ui.authError = "";
    renderAuth();
    try {
      if (ui.authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: SITE_URL } });
        if (error) throw error;
        if (!data.session) {
          toast("注册成功，请按你的 Supabase 设置完成邮箱验证后再登录。");
          ui.authMode = "signin";
        }
      }
    } catch (error) {
      ui.authError = error.message || "登录失败，请稍后再试。";
    } finally {
      ui.authBusy = false;
      renderAuth();
    }
  }

  function renderAuth() {
    if (currentSession?.user) {
      authScreen.classList.add("hidden");
      return;
    }
    authScreen.classList.remove("hidden");
    if (ui.booting) {
      authScreen.innerHTML = `<div class="auth-card"><div class="loading-state"><div><div class="brand-mark">训</div><strong>正在检查登录状态</strong><div>稍等一下，马上进入训练记录页面。</div></div></div></div>`;
      return;
    }
    const helper = ui.authMode === "signin" ? "登录后才能进入主页面，训练记录会自动同步到云端。" : "注册成功后，如启用了邮箱验证，请先完成验证。";
    authScreen.innerHTML = `
      <div class="auth-card">
        <div class="brand-mark">训</div>
        <div class="eyebrow">Training Tracker</div>
        <h1 class="auth-title">训练记录助手</h1>
        <div class="auth-copy">一个给自己用的轻网页训练记录页。先登录，再开始今天的训练。</div>
        <div class="auth-switch">
          <button type="button" class="switch-pill ${ui.authMode === "signin" ? "active" : ""}" data-action="set-auth-mode" data-mode="signin">登录</button>
          <button type="button" class="switch-pill ${ui.authMode === "signup" ? "active" : ""}" data-action="set-auth-mode" data-mode="signup">注册</button>
        </div>
        <form class="form-stack" data-form="auth">
          <div class="field"><label for="authEmailInput">邮箱</label><input id="authEmailInput" type="email" placeholder="you@example.com" required /></div>
          <div class="field"><label for="authPasswordInput">密码</label><input id="authPasswordInput" type="password" placeholder="至少 6 位" required /></div>
          <div class="small muted">${escapeHtml(helper)}</div>
          ${ui.authError ? `<div class="chip error">${escapeHtml(ui.authError)}</div>` : ""}
          <div class="button-row full"><button type="submit" class="primary-btn" ${ui.authBusy ? "disabled" : ""}>${ui.authBusy ? "处理中..." : ui.authMode === "signin" ? "登录进入训练页" : "注册并创建账号"}</button></div>
        </form>
      </div>
    `;
  }

  function renderSetRow(itemKey, type, set, index) {
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

  function renderTraining() {
    const plan = getPlan();
    const draft = getDraft();
    const strip = `<div class="day-strip">${PLAN_DAYS.map(day => `<div class="day-pill ${day.id === state.currentDay ? "current" : state.history.some(entry => entry.day === day.id) ? "done" : ""}">${day.id}</div>`).join("")}</div>`;
    if (!draft) {
      return `<div class="panel-stack"><div class="hero-card"><div class="hero-top"><div><div class="eyebrow">Today</div><h2 class="section-title" style="margin-top:8px">${escapeHtml(plan.title)}</h2><p class="section-copy">${escapeHtml(plan.goal)} · 预计 ${escapeHtml(plan.duration)}</p></div><span class="status-pill ${plan.type === "rest" ? "rest" : "info"}">${plan.type === "rest" ? "休息日" : "待开始"}</span></div>${strip}<div class="button-row full" style="margin-top:18px">${plan.type === "train" ? `<button type="button" class="primary-btn" data-action="start-plan">开始今天训练</button>` : `<button type="button" class="primary-btn" data-action="mark-rest">标记今天已休息</button>`}<button type="button" class="secondary-btn" data-action="start-free">${plan.type === "rest" ? "开始自由训练" : "今天改成自由训练"}</button></div></div><div class="card"><div class="card-head"><div><h3 class="section-title">今日动作预览</h3><div class="section-copy">开始后就进入可记录状态。</div></div></div><div class="preview-list">${plan.exercises.length ? plan.exercises.map(item => { const definition = getExerciseById(item.exerciseId); return `<div class="preview-item"><div class="preview-name">${escapeHtml(definition?.name || item.exerciseId)}</div><div class="preview-meta">${item.targetSets} 组 · ${escapeHtml(item.targetReps)} · ${escapeHtml(item.targetNote)}</div></div>`; }).join("") : `<div class="empty-state"><strong>今天是休息日</strong><div>如果你状态不错，也可以开始一场自由训练。</div></div>`}</div></div></div>`;
    }
    const cards = draft.exerciseOrder.map(itemKey => {
      const item = draft.exerciseItems[itemKey];
      return `<div class="exercise-card ${item.completed ? "completed" : ""}"><div class="exercise-top"><div><div class="exercise-name">${escapeHtml(item.nameSnapshot)}</div><div class="exercise-meta">${escapeHtml(item.targetSets)} 组 · ${escapeHtml(item.targetReps || "自定义")} · ${escapeHtml(item.targetNote || recordTypeLabel(item.recordType))}</div><div class="exercise-meta">${escapeHtml(lastReference(item.exerciseId))}</div></div><div class="chip-row"><span class="chip">${escapeHtml(item.category)}</span><span class="chip ${item.completed ? "success" : "info"}">${item.completed ? "已完成" : "记录中"}</span></div></div><div class="set-list">${item.sets.map((set, index) => renderSetRow(itemKey, item.recordType, set, index)).join("")}</div><div class="exercise-actions"><button type="button" class="ghost-btn" data-action="add-set" data-item-key="${itemKey}">新增一组</button><button type="button" class="secondary-btn" data-action="toggle-exercise" data-item-key="${itemKey}">${item.completed ? "取消完成" : "标记完成"}</button></div></div>`;
    }).join("");
    return `<div class="panel-stack"><div class="hero-card"><div class="hero-top"><div><div class="eyebrow">${draft.mode === "free" ? "Free Workout" : "Today"}</div><h2 class="section-title" style="margin-top:8px">${escapeHtml(draft.title)}</h2><p class="section-copy">从这里直接记录每个动作。完成后会自动进入下一训练日。</p></div><span class="status-pill success">进行中</span></div><div class="overview-grid" style="margin-top:18px"><div class="metric-card"><div class="metric-label">当前 Day</div><div class="metric-value">Day ${state.currentDay}</div></div><div class="metric-card"><div class="metric-label">已加入动作</div><div class="metric-value">${draft.exerciseOrder.length} 个</div></div></div><div class="button-row full" style="margin-top:18px"><button type="button" class="ghost-btn" data-action="open-picker">添加动作</button><button type="button" class="primary-btn" data-action="complete-workout">完成今天</button></div></div><div class="card"><div class="field"><label for="bodyWeightInput">体重（kg）</label><input id="bodyWeightInput" data-draft-meta="bodyWeight" value="${escapeHtml(draft.bodyWeight)}" placeholder="例如 95.0" /></div><div class="field"><label for="draftNoteInput">训练备注</label><textarea id="draftNoteInput" data-draft-meta="note" placeholder="今天状态、动作感受、加重情况...">${escapeHtml(draft.note)}</textarea></div></div>${cards || `<div class="empty-state"><strong>还没有动作</strong><div>先从动作库里添加一个动作。</div></div>`}</div>`;
  }

  function renderHistory() {
    const query = ui.historyQuery.trim().toLowerCase();
    const list = [...state.history].reverse().filter(entry => !query || entry.title.toLowerCase().includes(query) || (entry.note || "").toLowerCase().includes(query) || entry.exercises.some(item => item.nameSnapshot.toLowerCase().includes(query)));
    return `<div class="panel-stack"><div class="card"><div class="card-head"><div><h3 class="section-title">训练历史</h3><div class="section-copy">支持按标题、备注或动作名搜索。</div></div></div><input id="historySearchInput" class="search-input" value="${escapeHtml(ui.historyQuery)}" placeholder="搜索训练标题或动作..." /></div>${list.length ? `<div class="history-list">${list.map(entry => `<button type="button" class="history-card" data-action="open-history" data-history-id="${escapeHtml(entry.id)}"><div class="history-top"><div><div class="history-name">${escapeHtml(entry.title)}</div><div class="history-copy">${escapeHtml(formatDate(entry.dateKey))}</div></div><span class="chip ${entry.status === "rest" ? "rest" : "success"}">${entry.status === "rest" ? "休息记录" : entry.mode === "free" ? "自由训练" : "计划训练"}</span></div><div class="history-meta"><span class="chip">Day ${entry.day}</span><span class="chip">${entry.exercises.length} 个动作</span>${entry.bodyWeight ? `<span class="chip">${escapeHtml(entry.bodyWeight)} kg</span>` : ""}</div>${entry.note ? `<div class="history-copy" style="margin-top:10px">${escapeHtml(entry.note)}</div>` : ""}</button>`).join("")}</div>` : `<div class="empty-state"><strong>${state.history.length ? "没有匹配到记录" : "还没有训练历史"}</strong><div>${state.history.length ? "换个关键字再试试。" : "完成一次训练后，这里会出现完整记录。"}</div></div>`}</div>`;
  }

  function renderMe() {
    return `<div class="panel-stack"><div class="card"><div class="card-head"><div><h3 class="section-title">账号</h3><div class="section-copy">${escapeHtml(currentSession?.user?.email || "--")}</div></div><button type="button" class="danger-btn" data-action="logout">退出登录</button></div></div><div class="card"><div class="card-head"><div><h3 class="section-title">同步与导出</h3><div class="section-copy" data-sync-text>${escapeHtml(ui.syncText)}</div></div><span data-sync-badge class="sync-pill ${ui.syncKind}"></span></div><div class="small muted">最近同步：<span data-last-sync>${escapeHtml(ui.lastSyncedAt ? formatDateTime(ui.lastSyncedAt) : "尚未同步")}</span></div><div class="button-row full" style="margin-top:14px"><button type="button" class="primary-btn" data-action="sync-now">立即同步</button><button type="button" class="secondary-btn" data-action="export-json">导出 JSON</button><button type="button" class="secondary-btn" data-action="export-csv">导出 CSV</button></div></div><div class="card"><div class="card-head"><div><h3 class="section-title">训练进度</h3><div class="section-copy">可以手动调整当前循环日。</div></div></div><div class="field"><label for="daySelect">当前 Day</label><select id="daySelect">${PLAN_DAYS.map(day => `<option value="${day.id}" ${ui.pendingDay === day.id ? "selected" : ""}>${escapeHtml(day.title)}</option>`).join("")}</select></div><div class="button-row full"><button type="button" class="primary-btn" data-action="save-day">保存当前 Day</button><button type="button" class="danger-btn" data-action="reset-progress">重置训练进度</button></div></div><div class="card"><div class="card-head"><div><h3 class="section-title">动作库</h3><div class="section-copy">自定义动作 ${state.customExercises.length} 个，其中启用中 ${state.customExercises.filter(item => item.active).length} 个。</div></div><button type="button" class="ghost-btn" data-action="open-library">管理动作库</button></div><div class="button-row full" style="margin-top:14px"><button type="button" class="secondary-btn" data-action="reload-cloud">从云端重建本地缓存</button></div></div></div>`;
  }

  function renderApp() {
    if (!currentSession?.user) {
      appScreen.classList.add("hidden");
      appScreen.innerHTML = "";
      return;
    }
    appScreen.classList.remove("hidden");
    const headerMap = {
      training: { eyebrow: `当前计划 · Day ${state.currentDay}`, title: "训练", note: getPlan().goal },
      history: { eyebrow: `已记录 ${state.history.length} 次训练`, title: "历史", note: "回看过去的训练和动作表现" },
      me: { eyebrow: "个人设置", title: "我的", note: currentSession.user.email || "" }
    };
    const current = headerMap[ui.tab];
    const panel = ui.tab === "training" ? renderTraining() : ui.tab === "history" ? renderHistory() : renderMe();
    appScreen.innerHTML = `<header class="app-header"><div><div class="eyebrow">${escapeHtml(current.eyebrow)}</div><div class="page-title">${escapeHtml(current.title)}</div><div class="header-note">${escapeHtml(current.note)}</div></div><div class="card-stack" style="align-items:flex-end"><div data-sync-badge class="sync-pill ${ui.syncKind}"></div><div class="small muted" data-sync-text></div></div></header><main class="app-content">${panel}</main><nav class="tabbar">${["training", "history", "me"].map(tab => `<button type="button" class="tab-item ${ui.tab === tab ? "active" : ""}" data-action="switch-tab" data-tab="${tab}"><strong>${tab === "training" ? "Today" : tab === "history" ? "History" : "Profile"}</strong><span>${tab === "training" ? "训练" : tab === "history" ? "历史" : "我的"}</span></button>`).join("")}</nav>`;
    setSync(ui.syncText, ui.syncKind);
  }

  function renderHistoryModal(entry) {
    return `<div class="modal-overlay" data-action="close-overlay"><div class="modal-sheet"><div class="modal-head"><div><div class="eyebrow">训练详情</div><div class="modal-title">${escapeHtml(entry.title)}</div><div class="muted">${escapeHtml(formatDate(entry.dateKey))}</div></div><button type="button" class="modal-close" data-action="close-modal">×</button></div><div class="modal-body"><div class="detail-meta"><span class="chip">Day ${entry.day}</span><span class="chip ${entry.status === "rest" ? "rest" : "success"}">${entry.status === "rest" ? "休息记录" : entry.mode === "free" ? "自由训练" : "计划训练"}</span>${entry.bodyWeight ? `<span class="chip">${escapeHtml(entry.bodyWeight)} kg</span>` : ""}</div>${entry.note ? `<div class="card" style="margin-top:16px"><div class="section-copy">${escapeHtml(entry.note)}</div></div>` : ""}<div class="detail-list" style="margin-top:16px">${entry.exercises.length ? entry.exercises.map(item => `<div class="detail-item"><div class="detail-name">${escapeHtml(item.nameSnapshot)}</div><div class="detail-copy">${escapeHtml(item.category)} · ${escapeHtml(recordTypeLabel(item.recordType))}</div><div class="set-summary">${(item.sets.filter(hasSetData).length ? item.sets.filter(hasSetData) : [emptySet()]).map((set, index) => `<span class="set-tag">#${index + 1} · ${escapeHtml(summarizeSet(set, item.recordType))}${set.note ? ` · ${escapeHtml(set.note)}` : ""}</span>`).join("")}</div></div>`).join("") : `<div class="empty-state"><strong>这是一条休息记录</strong><div>当天没有训练动作，只作为进度推进。</div></div>`}</div></div></div></div>`;
  }

  function renderLibraryModal() {
    const query = ui.libraryQuery.trim().toLowerCase();
    const mine = state.customExercises.filter(item => !query || item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));
    const system = SYSTEM_EXERCISES.filter(item => !query || item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));
    return `<div class="modal-overlay" data-action="close-overlay"><div class="modal-sheet"><div class="modal-head"><div><div class="eyebrow">Exercise Library</div><div class="modal-title">动作库管理</div><div class="muted">自定义动作可编辑和停用，系统动作只读。</div></div><button type="button" class="modal-close" data-action="close-modal">×</button></div><div class="modal-body"><div class="button-row spread" style="margin-bottom:14px"><input id="librarySearchInput" class="search-input" value="${escapeHtml(ui.libraryQuery)}" placeholder="搜索动作名称或分类..." /><button type="button" class="primary-btn" data-action="open-form">新建动作</button></div><div class="card" style="margin-bottom:16px"><div class="card-head"><div><h3 class="section-title">我的动作</h3></div></div><div class="library-list">${mine.length ? mine.map(item => `<div class="library-item"><div><div class="preview-name">${escapeHtml(item.name)}</div><div class="preview-meta">${escapeHtml(item.category)} · ${escapeHtml(recordTypeLabel(item.recordType))}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</div></div><div class="button-row"><button type="button" class="mini-btn" data-action="edit-exercise" data-exercise-id="${escapeHtml(item.id)}">编辑</button><button type="button" class="mini-btn" data-action="toggle-custom" data-exercise-id="${escapeHtml(item.id)}">${item.active ? "停用" : "启用"}</button></div></div>`).join("") : `<div class="empty-state"><strong>还没有自定义动作</strong><div>点右上角“新建动作”添加到动作库里。</div></div>`}</div></div><div class="card"><div class="card-head"><div><h3 class="section-title">系统动作</h3></div></div><div class="library-list">${system.map(item => `<div class="library-item"><div><div class="preview-name">${escapeHtml(item.name)}</div><div class="preview-meta">${escapeHtml(item.category)} · ${escapeHtml(recordTypeLabel(item.recordType))}</div></div><span class="chip info">系统动作</span></div>`).join("")}</div></div></div></div></div>`;
  }

  function renderPickerModal() {
    const draft = getDraft();
    const query = ui.pickerQuery.trim().toLowerCase();
    const list = getCatalog().filter(item => {
      const alreadyAdded = draft.exerciseOrder.some(itemKey => draft.exerciseItems[itemKey]?.exerciseId === item.id);
      return (item.source === "system" || item.active) && !alreadyAdded && (!query || item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));
    });
    return `<div class="modal-overlay" data-action="close-overlay"><div class="modal-sheet"><div class="modal-head"><div><div class="eyebrow">Add Exercise</div><div class="modal-title">添加动作</div><div class="muted">可选系统动作，也可以直接新建自定义动作。</div></div><button type="button" class="modal-close" data-action="close-modal">×</button></div><div class="modal-body"><div class="button-row spread" style="margin-bottom:14px"><input id="pickerSearchInput" class="search-input" value="${escapeHtml(ui.pickerQuery)}" placeholder="搜索动作名称或分类..." /><button type="button" class="primary-btn" data-action="open-form-from-picker">新建动作</button></div>${list.length ? list.map(item => `<div class="picker-item"><div><div class="preview-name">${escapeHtml(item.name)}</div><div class="preview-meta">${escapeHtml(item.category)} · ${escapeHtml(recordTypeLabel(item.recordType))}</div></div><button type="button" class="ghost-btn" data-action="pick-exercise" data-exercise-id="${escapeHtml(item.id)}">加入训练</button></div>`).join("") : `<div class="empty-state"><strong>没有可加入的动作</strong><div>可能都已经加到今天的训练里了，也可以直接新建一个动作。</div></div>`}</div></div></div>`;
  }

  function renderFormModal(item, fromPicker) {
    return `<div class="modal-overlay" data-action="close-overlay"><div class="modal-sheet"><div class="modal-head"><div><div class="eyebrow">Custom Exercise</div><div class="modal-title">${item ? "编辑自定义动作" : "新建自定义动作"}</div></div><button type="button" class="modal-close" data-action="close-modal">×</button></div><div class="modal-body"><form class="form-stack" data-form="exercise"><input type="hidden" id="exerciseFormId" value="${escapeHtml(item?.id || "")}" /><input type="hidden" id="exerciseFormFromPicker" value="${fromPicker ? "true" : "false"}" /><div class="field"><label for="exerciseNameInput">动作名称</label><input id="exerciseNameInput" value="${escapeHtml(item?.name || "")}" required /></div><div class="field"><label for="exerciseCategoryInput">动作分类</label><select id="exerciseCategoryInput">${["胸", "背", "腿", "肩", "手臂", "核心", "有氧", "其他"].map(option => `<option value="${option}" ${(item?.category || "其他") === option ? "selected" : ""}>${option}</option>`).join("")}</select></div><div class="field"><label for="exerciseRecordTypeInput">记录方式</label><select id="exerciseRecordTypeInput">${[{ value: "weight_reps", label: "重量 + 次数" }, { value: "reps_only", label: "仅次数" }, { value: "duration", label: "仅时长" }, { value: "distance_duration", label: "距离 / 时长" }].map(option => `<option value="${option.value}" ${(item?.recordType || "weight_reps") === option.value ? "selected" : ""}>${option.label}</option>`).join("")}</select></div><div class="field"><label for="exerciseNoteInput">备注说明</label><textarea id="exerciseNoteInput">${escapeHtml(item?.note || "")}</textarea></div><div class="field"><label for="exerciseActiveInput">状态</label><select id="exerciseActiveInput"><option value="true" ${(item?.active ?? true) ? "selected" : ""}>启用</option><option value="false" ${item && item.active === false ? "selected" : ""}>停用</option></select></div><div class="button-row full"><button type="submit" class="primary-btn">保存动作</button><button type="button" class="secondary-btn" data-action="close-modal">取消</button></div></form></div></div></div>`;
  }

  function renderModal() {
    if (!ui.modal) return (modalRoot.innerHTML = "");
    if (ui.modal.type === "history") {
      const entry = state.history.find(item => item.id === ui.modal.id);
      modalRoot.innerHTML = entry ? renderHistoryModal(entry) : "";
      return;
    }
    if (ui.modal.type === "library") modalRoot.innerHTML = renderLibraryModal();
    if (ui.modal.type === "picker") modalRoot.innerHTML = renderPickerModal();
    if (ui.modal.type === "form") {
      const item = ui.modal.id ? state.customExercises.find(exercise => exercise.id === ui.modal.id) : null;
      modalRoot.innerHTML = renderFormModal(item, !!ui.modal.fromPicker);
    }
  }

  function renderAll() {
    renderAuth();
    renderApp();
    renderModal();
  }

  function openModal(type, payload = {}) {
    ui.modal = { type, ...payload };
    renderModal();
  }

  function closeModal() {
    ui.modal = null;
    renderModal();
  }

  function updateDraftField(field, value) {
    const draft = getDraft();
    if (!draft) return;
    draft[field] = value;
    saveState();
    queueSync();
  }

  function updateSetField(itemKey, setIndex, field, value) {
    const item = getDraft()?.exerciseItems?.[itemKey];
    if (!item || !item.sets[setIndex]) return;
    item.sets[setIndex][field] = value;
    saveState();
    queueSync();
  }

  function addSet(itemKey) {
    const item = getDraft()?.exerciseItems?.[itemKey];
    if (!item) return;
    item.sets.push(emptySet());
    persist();
    renderApp();
  }

  function removeSet(itemKey, setIndex) {
    const item = getDraft()?.exerciseItems?.[itemKey];
    if (!item) return;
    if (item.sets.length === 1) item.sets[0] = emptySet();
    else item.sets.splice(setIndex, 1);
    persist();
    renderApp();
  }

  function toggleExercise(itemKey) {
    const item = getDraft()?.exerciseItems?.[itemKey];
    if (!item) return;
    item.completed = !item.completed;
    persist();
    renderApp();
  }

  function addExerciseToDraft(exerciseId) {
    const draft = getDraft();
    const definition = getExerciseById(exerciseId);
    if (!draft || !definition || draft.exerciseOrder.some(itemKey => draft.exerciseItems[itemKey]?.exerciseId === exerciseId)) return;
    const itemKey = `${exerciseId}__custom_${createId("item")}`;
    draft.exerciseOrder.push(itemKey);
    draft.exerciseItems[itemKey] = createDraftExercise(itemKey, definition, { targetSets: 3, targetReps: definition.recordType === "weight_reps" ? "8-12" : "" });
    persist();
    closeModal();
    renderApp();
    toast(`已添加动作：${definition.name}`);
  }

  function completeWorkout() {
    const draft = getDraft();
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
    if (!exercises.length && !draft.note && !draft.bodyWeight && !confirm("还没有记录任何内容，仍然完成今天吗？")) return;
    state.history.push({
      id: createId("session"),
      dateKey: todayKey(),
      day: state.currentDay,
      title: draft.title,
      mode: draft.mode,
      status: draft.mode === "rest" ? "rest" : "completed",
      bodyWeight: draft.bodyWeight,
      note: draft.note,
      completedAt: new Date().toISOString(),
      exercises
    });
    delete state.workoutDrafts[state.currentDay];
    state.currentDay = nextDay(state.currentDay);
    ui.pendingDay = state.currentDay;
    persist();
    renderApp();
    toast("今天的训练已保存，已进入下一天");
  }

  function markRestComplete() {
    const plan = getPlan();
    state.history.push({
      id: createId("session"),
      dateKey: todayKey(),
      day: state.currentDay,
      title: plan.title,
      mode: "rest",
      status: "rest",
      bodyWeight: "",
      note: "休息日已完成",
      completedAt: new Date().toISOString(),
      exercises: []
    });
    state.currentDay = nextDay(state.currentDay);
    ui.pendingDay = state.currentDay;
    persist();
    renderApp();
    toast("已标记今天休息，进入下一天");
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    download(`training-tracker-${todayKey()}.json`, JSON.stringify(state, null, 2), "application/json");
  }

  function exportCsv() {
    const rows = [["date", "day", "title", "mode", "exercise", "set_no", "weight", "reps", "duration", "distance", "note", "session_note", "body_weight"]];
    state.history.forEach(entry => {
      if (!entry.exercises.length) rows.push([entry.dateKey, entry.day, entry.title, entry.mode, "", "", "", "", "", "", "", entry.note || "", entry.bodyWeight || ""]);
      entry.exercises.forEach(item => {
        (item.sets.length ? item.sets : [emptySet()]).forEach((set, index) => {
          rows.push([entry.dateKey, entry.day, entry.title, entry.mode, item.nameSnapshot, index + 1, set.weight || "", set.reps || "", set.duration || "", set.distance || "", set.note || "", entry.note || "", entry.bodyWeight || ""]);
        });
      });
    });
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    download(`training-history-${todayKey()}.csv`, csv, "text/csv;charset=utf-8;");
  }

  function saveExercise(form) {
    const editId = form.querySelector("#exerciseFormId").value.trim();
    const fromPicker = form.querySelector("#exerciseFormFromPicker").value === "true";
    const name = form.querySelector("#exerciseNameInput").value.trim();
    if (!name) return toast("请先填写动作名称");
    const payload = {
      name,
      category: form.querySelector("#exerciseCategoryInput").value,
      recordType: form.querySelector("#exerciseRecordTypeInput").value,
      note: form.querySelector("#exerciseNoteInput").value.trim(),
      active: form.querySelector("#exerciseActiveInput").value === "true"
    };
    if (editId) {
      const target = state.customExercises.find(item => item.id === editId);
      Object.assign(target, payload);
      Object.values(state.workoutDrafts).forEach(draft => {
        draft.exerciseOrder.forEach(itemKey => {
          const item = draft.exerciseItems[itemKey];
          if (!item || item.exerciseId !== editId) return;
          item.nameSnapshot = payload.name;
          item.category = payload.category;
          item.recordType = payload.recordType;
        });
        if (draft.exerciseItems[editId]) {
          draft.exerciseItems[editId].nameSnapshot = payload.name;
          draft.exerciseItems[editId].category = payload.category;
          draft.exerciseItems[editId].recordType = payload.recordType;
        }
      });
    } else {
      const custom = normalizeCustom(payload);
      state.customExercises.unshift(custom);
      persist();
      if (fromPicker && getDraft()) return addExerciseToDraft(custom.id);
    }
    persist();
    closeModal();
    renderApp();
    toast("动作已保存");
  }

  async function reloadCloudCache() {
    if (!confirm("确定要用云端数据重建本地缓存吗？当前浏览器里的未同步改动会被覆盖。")) return;
    const cloud = await fetchCloudState();
    state = normalizeState(cloud?.state || makeDefaultState());
    ui.pendingDay = state.currentDay;
    ui.lastSyncedAt = cloud?.updated_at || "";
    saveState();
    renderAll();
    setSync("已从云端重建本地缓存", "synced");
  }

  function resetProgress() {
    if (!confirm("确定要把当前训练进度重置到 Day 1 吗？历史记录会保留。")) return;
    state.currentDay = 1;
    state.workoutDrafts = {};
    ui.pendingDay = 1;
    persist();
    renderApp();
  }

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "close-overlay" && event.target === button) return closeModal();
    if (action === "set-auth-mode") { ui.authMode = button.dataset.mode; ui.authError = ""; return renderAuth(); }
    if (action === "switch-tab") { ui.tab = button.dataset.tab; return renderApp(); }
    if (action === "start-plan") return createDraft("plan");
    if (action === "start-free") return createDraft("free");
    if (action === "mark-rest") return markRestComplete();
    if (action === "add-set") return addSet(button.dataset.itemKey);
    if (action === "remove-set") return removeSet(button.dataset.itemKey, Number(button.dataset.setIndex));
    if (action === "toggle-exercise") return toggleExercise(button.dataset.itemKey);
    if (action === "complete-workout") return completeWorkout();
    if (action === "open-history") return openModal("history", { id: button.dataset.historyId });
    if (action === "open-library") return openModal("library");
    if (action === "open-picker") return openModal("picker");
    if (action === "open-form") return openModal("form");
    if (action === "open-form-from-picker") return openModal("form", { fromPicker: true });
    if (action === "edit-exercise") return openModal("form", { id: button.dataset.exerciseId });
    if (action === "toggle-custom") {
      const target = state.customExercises.find(item => item.id === button.dataset.exerciseId);
      target.active = !target.active;
      persist();
      renderModal();
      return renderApp();
    }
    if (action === "pick-exercise") return addExerciseToDraft(button.dataset.exerciseId);
    if (action === "sync-now") return saveCloudState();
    if (action === "export-json") return exportJson();
    if (action === "export-csv") return exportCsv();
    if (action === "logout") return supabase?.auth.signOut();
    if (action === "save-day") {
      state.currentDay = normalizeDay(document.getElementById("daySelect")?.value || state.currentDay);
      ui.pendingDay = state.currentDay;
      persist();
      return renderApp();
    }
    if (action === "reset-progress") return resetProgress();
    if (action === "reload-cloud") return reloadCloudCache();
    if (action === "close-modal") return closeModal();
  });

  document.addEventListener("input", event => {
    const target = event.target;
    if (target.matches("[data-draft-meta]")) return updateDraftField(target.dataset.draftMeta, target.value);
    if (target.matches("[data-set-field]")) return updateSetField(target.dataset.itemKey, Number(target.dataset.setIndex), target.dataset.setField, target.value);
    if (target.id === "historySearchInput") {
      ui.historyQuery = target.value;
      return rerenderWithFocus(renderApp, "historySearchInput", target.value);
    }
    if (target.id === "librarySearchInput") {
      ui.libraryQuery = target.value;
      return rerenderWithFocus(renderModal, "librarySearchInput", target.value);
    }
    if (target.id === "pickerSearchInput") {
      ui.pickerQuery = target.value;
      return rerenderWithFocus(renderModal, "pickerSearchInput", target.value);
    }
  });

  document.addEventListener("change", event => {
    if (event.target.id === "daySelect") ui.pendingDay = Number(event.target.value);
  });

  document.addEventListener("submit", event => {
    const form = event.target;
    if (form.matches("[data-form='auth']")) {
      event.preventDefault();
      handleAuthSubmit(form);
    }
    if (form.matches("[data-form='exercise']")) {
      event.preventDefault();
      saveExercise(form);
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && ui.modal) closeModal();
  });

  async function boot() {
    if (!supabase) {
      ui.booting = false;
      ui.authError = "Supabase SDK 加载失败，请检查网络后刷新。";
      return renderAll();
    }
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
      ui.authError = error.message || "初始化失败，请刷新页面重试。";
      renderAll();
    }
  }

  boot();
})();
