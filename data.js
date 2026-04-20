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
  { id: "incline-walk", name: "坡度走", category: "有氧", recordType: "duration", source: "system", note: "低冲击有氧", active: true },
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
    { exerciseId: "chest-supported-row", targetSets: "1-2", targetReps: "15-20", targetNote: "激活动作" },
    { exerciseId: "bench-press", targetSets: 4, targetReps: "5-8", targetNote: "主项推进" },
    { exerciseId: "incline-dumbbell-press", targetSets: 3, targetReps: "8-12", targetNote: "上胸补量" },
    { exerciseId: "chest-supported-row", targetSets: 3, targetReps: "8-12", targetNote: "主训练组" },
    { exerciseId: "shoulder-press", targetSets: 2, targetReps: "10-15", targetNote: "肩推补充" },
    { exerciseId: "lateral-raise", targetSets: 3, targetReps: "15-20", targetNote: "中束灼烧" },
    { exerciseId: "triceps-pushdown", targetSets: "2-3", targetReps: "12-15", targetNote: "按恢复调整" }
  ]},
  { id: 2, title: "Day 2 · 休息", type: "rest", duration: "-", goal: "散步、拉伸、恢复", exercises: [] },
  { id: 3, title: "Day 3 · 下肢功能 + 核心", type: "train", duration: "45-55 分钟", goal: "下肢功能性训练，补充核心与有氧", exercises: [
    { exerciseId: "squat-machine", targetSets: 3, targetReps: "10-12", targetNote: "可选高脚杯深蹲/腿举" },
    { exerciseId: "romanian-deadlift", targetSets: 3, targetReps: "8-10", targetNote: "髋主导发力" },
    { exerciseId: "hanging-leg-raise", targetSets: 3, targetReps: "自定次数", targetNote: "核心控制优先" },
    { exerciseId: "incline-walk", targetSets: 1, targetReps: "15-20 分钟", targetNote: "坡度有氧" }
  ]},
  { id: 4, title: "Day 4 · 休息", type: "rest", duration: "-", goal: "散步、拉伸、恢复", exercises: [] },
  { id: 5, title: "Day 5 · 上肢 B", type: "train", duration: "60-70 分钟", goal: "背阔与推举平衡，补肩臂", exercises: [
    { exerciseId: "pull-up", targetSets: 4, targetReps: "8-12", targetNote: "引体向上/对握下拉" },
    { exerciseId: "chest-supported-row", targetSets: 3, targetReps: "8-12", targetNote: "背部厚度" },
    { exerciseId: "machine-chest-press", targetSets: 3, targetReps: "8-12", targetNote: "胸部主训练" },
    { exerciseId: "reverse-fly", targetSets: 3, targetReps: "15-20", targetNote: "后束稳定" },
    { exerciseId: "lateral-raise", targetSets: "3-4", targetReps: "12-20", targetNote: "按状态加减组" },
    { exerciseId: "hammer-curl", targetSets: "2-3", targetReps: "12-15", targetNote: "肱桡肌与前臂" },
    { exerciseId: "triceps-pushdown", targetSets: "0-2", targetReps: "12-15", targetNote: "按恢复决定" }
  ]},
  { id: 6, title: "Day 6 · 休息", type: "rest", duration: "-", goal: "散步、拉伸、恢复", exercises: [] },
  { id: 7, title: "Day 7 · 休息", type: "rest", duration: "-", goal: "散步、拉伸、恢复", exercises: [] }
];
