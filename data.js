window.APP_CONFIG = {
  SUPABASE_URL: "https://pqnfgjrzwikotbeephzl.supabase.co",
  SUPABASE_KEY: "sb_publishable_60fHrSGzG2if3pavzsLU6w_jND_-Y1F",
  SITE_URL: "https://xiaoming0016.github.io/fit/",
  STORAGE_KEY: "training_tracker_app_v2",
  LEGACY_STORAGE_KEYS: ["training_tracker_html_supabase_v1"]
};

window.SYSTEM_EXERCISES = [
  { id: "bench-press", name: "平板卧推", category: "胸", recordType: "weight_reps", source: "system", note: "胸部主练动作", active: true },
  { id: "lat-pulldown", name: "高位下拉", category: "背", recordType: "weight_reps", source: "system", note: "背部垂直拉", active: true },
  { id: "incline-dumbbell-press", name: "上斜哑铃卧推", category: "胸", recordType: "weight_reps", source: "system", note: "上胸发力", active: true },
  { id: "chest-supported-row", name: "胸托划船", category: "背", recordType: "weight_reps", source: "system", note: "减少借力", active: true },
  { id: "lateral-raise", name: "侧平举", category: "肩", recordType: "weight_reps", source: "system", note: "中束补量", active: true },
  { id: "triceps-pushdown", name: "绳索下压", category: "手臂", recordType: "weight_reps", source: "system", note: "肱三头孤立", active: true },
  { id: "dumbbell-curl", name: "哑铃弯举", category: "手臂", recordType: "weight_reps", source: "system", note: "肱二头补量", active: true },
  { id: "squat-machine", name: "深蹲 / 腿举", category: "腿", recordType: "weight_reps", source: "system", note: "下肢主项", active: true },
  { id: "romanian-deadlift", name: "罗马尼亚硬拉", category: "腿", recordType: "weight_reps", source: "system", note: "腘绳肌和臀部发力", active: true },
  { id: "split-squat", name: "保加利亚分腿蹲", category: "腿", recordType: "weight_reps", source: "system", note: "单侧稳定", active: true },
  { id: "calf-raise", name: "站姿提踵", category: "腿", recordType: "weight_reps", source: "system", note: "小腿训练", active: true },
  { id: "hanging-leg-raise", name: "悬垂举腿", category: "核心", recordType: "weight_reps", source: "system", note: "核心补充", active: true },
  { id: "hammer-curl", name: "锤式弯举", category: "手臂", recordType: "weight_reps", source: "system", note: "前臂和肱桡肌", active: true },
  { id: "overhead-triceps", name: "过顶绳索臂屈伸", category: "手臂", recordType: "weight_reps", source: "system", note: "肱三头长头", active: true },
  { id: "incline-barbell-press", name: "上斜杠铃卧推", category: "胸", recordType: "weight_reps", source: "system", note: "上胸力量", active: true },
  { id: "pull-up", name: "引体向上 / 中立下拉", category: "背", recordType: "weight_reps", source: "system", note: "背阔肌发力", active: true },
  { id: "machine-chest-press", name: "器械推胸 / 哑铃卧推", category: "胸", recordType: "weight_reps", source: "system", note: "胸部补量", active: true },
  { id: "one-arm-row", name: "单臂哑铃划船", category: "背", recordType: "weight_reps", source: "system", note: "单侧控制", active: true },
  { id: "reverse-fly", name: "反向飞鸟", category: "肩", recordType: "weight_reps", source: "system", note: "后束补量", active: true },
  { id: "cable-curl", name: "绳索弯举", category: "手臂", recordType: "weight_reps", source: "system", note: "持续张力", active: true },
  { id: "shoulder-press", name: "器械肩推 / 哑铃肩推", category: "肩", recordType: "weight_reps", source: "system", note: "肩部主项", active: true },
  { id: "incline-machine-press", name: "上斜器械推胸 / 双杠臂屈伸", category: "胸", recordType: "weight_reps", source: "system", note: "上胸和胸下混合", active: true },
  { id: "wide-grip-pulldown", name: "宽握下拉 / 直臂下拉", category: "背", recordType: "weight_reps", source: "system", note: "背阔补量", active: true }
];

window.PLAN_DAYS = [
  { id: 1, title: "Day 1 · 上肢 A", type: "train", duration: "60-70 分钟", goal: "胸背主练，兼顾肩臂", exercises: [
    { exerciseId: "bench-press", targetSets: 4, targetReps: "5-8", targetNote: "RIR 1-2" },
    { exerciseId: "lat-pulldown", targetSets: 4, targetReps: "8-12", targetNote: "RIR 1-2" },
    { exerciseId: "incline-dumbbell-press", targetSets: 3, targetReps: "8-12", targetNote: "RIR 1-2" },
    { exerciseId: "chest-supported-row", targetSets: 3, targetReps: "8-12", targetNote: "RIR 1-2" },
    { exerciseId: "lateral-raise", targetSets: 4, targetReps: "12-20", targetNote: "接近力竭" },
    { exerciseId: "triceps-pushdown", targetSets: 3, targetReps: "10-15", targetNote: "孤立补量" },
    { exerciseId: "dumbbell-curl", targetSets: 2, targetReps: "10-15", targetNote: "控制离心" }
  ]},
  { id: 2, title: "Day 2 · 休息", type: "rest", duration: "-", goal: "散步、拉伸、恢复", exercises: [] },
  { id: 3, title: "Day 3 · 下肢精简 + 手臂", type: "train", duration: "45-55 分钟", goal: "保留下肢刺激，同时补手臂", exercises: [
    { exerciseId: "squat-machine", targetSets: 3, targetReps: "5-8", targetNote: "RIR 1-2" },
    { exerciseId: "romanian-deadlift", targetSets: 3, targetReps: "6-10", targetNote: "RIR 1-2" },
    { exerciseId: "split-squat", targetSets: 2, targetReps: "8-10 / 侧", targetNote: "保持稳定" },
    { exerciseId: "calf-raise", targetSets: 2, targetReps: "10-15", targetNote: "顶峰停顿" },
    { exerciseId: "hanging-leg-raise", targetSets: 2, targetReps: "10-15", targetNote: "核心收紧" },
    { exerciseId: "hammer-curl", targetSets: 3, targetReps: "8-12", targetNote: "控制摆动" },
    { exerciseId: "overhead-triceps", targetSets: 3, targetReps: "10-15", targetNote: "拉伸充分" }
  ]},
  { id: 4, title: "Day 4 · 休息", type: "rest", duration: "-", goal: "散步、拉伸、恢复", exercises: [] },
  { id: 5, title: "Day 5 · 上肢 B", type: "train", duration: "60-70 分钟", goal: "上胸、背阔、肩部厚度", exercises: [
    { exerciseId: "incline-barbell-press", targetSets: 4, targetReps: "6-10", targetNote: "RIR 1-2" },
    { exerciseId: "pull-up", targetSets: 4, targetReps: "6-10", targetNote: "有余力再加重" },
    { exerciseId: "machine-chest-press", targetSets: 3, targetReps: "8-12", targetNote: "中高次数" },
    { exerciseId: "one-arm-row", targetSets: 3, targetReps: "8-12", targetNote: "顶峰收缩" },
    { exerciseId: "reverse-fly", targetSets: 3, targetReps: "12-20", targetNote: "后束补量" },
    { exerciseId: "lateral-raise", targetSets: 3, targetReps: "12-20", targetNote: "稳定动作路径" },
    { exerciseId: "cable-curl", targetSets: 2, targetReps: "10-15", targetNote: "持续张力" }
  ]},
  { id: 6, title: "Day 6 · 休息", type: "rest", duration: "-", goal: "散步、拉伸、恢复", exercises: [] },
  { id: 7, title: "Day 7 · 上肢 C", type: "train", duration: "45-60 分钟", goal: "上肢补量，偏肩背胸泵感", exercises: [
    { exerciseId: "shoulder-press", targetSets: 3, targetReps: "6-10", targetNote: "肩部主练" },
    { exerciseId: "chest-supported-row", targetSets: 3, targetReps: "8-12", targetNote: "控制节奏" },
    { exerciseId: "incline-machine-press", targetSets: 3, targetReps: "8-12", targetNote: "胸部泵感" },
    { exerciseId: "wide-grip-pulldown", targetSets: 2, targetReps: "10-15", targetNote: "背阔补量" },
    { exerciseId: "lateral-raise", targetSets: 3, targetReps: "15-20", targetNote: "中束灼烧" },
    { exerciseId: "reverse-fly", targetSets: 2, targetReps: "15-20", targetNote: "后束收尾" },
    { exerciseId: "triceps-pushdown", targetSets: 2, targetReps: "10-15", targetNote: "可与弯举交替" }
  ]},
  { id: 8, title: "Day 8 · 休息", type: "rest", duration: "-", goal: "散步、拉伸、恢复", exercises: [] }
];
