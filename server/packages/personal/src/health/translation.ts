import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const healthTranslations = {
  "personal.health": [
    // HumanBodyCanvas
    {
      application: "frontend",
      tKey: "personal.health.canvas.title",
      langCodes: {
        "zh-CN": "高精全景人体解剖与生理健康画像",
        "en-US": "High-Precision Human Anatomy & Health Profile",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.canvas.chipOrganActive",
      langCodes: {
        "zh-CN": "正在高亮显示: {{organName}} (点击空白处重置视图)",
        "en-US": "Highlighting: {{organName}} (Click blank space to reset)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.canvas.chipDefault",
      langCodes: {
        "zh-CN": "点击下方器官或解剖部位触发 3D 聚焦与动态生理监测",
        "en-US":
          "Click organ below for 3D focus and dynamic physiological monitoring",
      },
    },

    // Tooltips
    {
      application: "frontend",
      tKey: "personal.health.tooltip.brain",
      langCodes: {
        "zh-CN": "点击聚焦大脑 (神经元传导与电信号)",
        "en-US": "Click to focus Brain (Neural Signals)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.tooltip.eyes",
      langCodes: {
        "zh-CN": "点击聚焦双眼 (视觉神经与眼底彩照)",
        "en-US": "Click to focus Eyes (Optic Nerves)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.tooltip.heart",
      langCodes: {
        "zh-CN": "点击聚焦心脏 (双重收缩跳动与血流脉冲)",
        "en-US": "Click to focus Heart (Beats & Blood Pulse)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.tooltip.lungs",
      langCodes: {
        "zh-CN": "点击聚焦肺部 (节律性呼吸扩张)",
        "en-US": "Click to focus Lungs (Respiration & Expansion)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.tooltip.stomach",
      langCodes: {
        "zh-CN": "点击聚焦胃部 (胃壁平滑肌蠕动)",
        "en-US": "Click to focus Stomach (Gastric Motility)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.tooltip.liver",
      langCodes: {
        "zh-CN": "点击聚焦肝脏 (蛋白质合成与解毒)",
        "en-US": "Click to focus Liver (Metabolism & Detox)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.tooltip.kidneys",
      langCodes: {
        "zh-CN": "点击聚焦肾脏 (体液平衡与尿液过滤)",
        "en-US": "Click to focus Kidneys (Fluid Balance & Filtration)",
      },
    },

    // Organ Names
    {
      application: "frontend",
      tKey: "personal.health.organ.brain",
      langCodes: {
        "zh-CN": "大脑",
        "en-US": "Brain",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.organ.eyes",
      langCodes: {
        "zh-CN": "眼部",
        "en-US": "Eyes",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.organ.heart",
      langCodes: {
        "zh-CN": "心脏 (跳动)",
        "en-US": "Heart (Beating)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.organ.lungs",
      langCodes: {
        "zh-CN": "肺部 (呼吸)",
        "en-US": "Lungs (Breathing)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.organ.stomach",
      langCodes: {
        "zh-CN": "胃部 (蠕动)",
        "en-US": "Stomach (Motility)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.organ.liver",
      langCodes: {
        "zh-CN": "肝脏",
        "en-US": "Liver",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.organ.kidneys",
      langCodes: {
        "zh-CN": "肾脏",
        "en-US": "Kidneys",
      },
    },

    {
      application: "frontend",
      tKey: "personal.health.organ.brainFull",
      langCodes: {
        "zh-CN": "大脑 (Brain)",
        "en-US": "Brain",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.organ.eyesFull",
      langCodes: {
        "zh-CN": "眼部 (Eyes)",
        "en-US": "Eyes",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.organ.heartFull",
      langCodes: {
        "zh-CN": "心脏 (Heart)",
        "en-US": "Heart",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.organ.lungsFull",
      langCodes: {
        "zh-CN": "肺部 (Lungs)",
        "en-US": "Lungs",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.organ.stomachFull",
      langCodes: {
        "zh-CN": "胃部 (Stomach)",
        "en-US": "Stomach",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.organ.liverFull",
      langCodes: {
        "zh-CN": "肝脏 (Liver)",
        "en-US": "Liver",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.organ.kidneysFull",
      langCodes: {
        "zh-CN": "肾脏 (Kidneys)",
        "en-US": "Kidneys",
      },
    },

    // Organ Drawer Detail Strings
    {
      application: "frontend",
      tKey: "personal.health.drawer.realtimeMonitor",
      langCodes: {
        "zh-CN": "局部健康实时监测",
        "en-US": "Realtime Health Monitor",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.drawer.organRhythm",
      langCodes: {
        "zh-CN": "器官动态与生理节律",
        "en-US": "Organ Dynamics & Physiological Rhythm",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.drawer.keyMetrics",
      langCodes: {
        "zh-CN": "关键生理健康指标",
        "en-US": "Key Health Metrics",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.drawer.suggestions",
      langCodes: {
        "zh-CN": "专家养护建议与提示",
        "en-US": "Expert Care Tips & Suggestions",
      },
    },

    // Eyes Data
    {
      application: "frontend",
      tKey: "personal.health.data.eyes.status",
      langCodes: { "zh-CN": "视力良好", "en-US": "Good Vision" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.eyes.effect",
      langCodes: {
        "zh-CN": "双眼瞳孔对光反射正常 | 晶状体调节能力良好",
        "en-US": "Pupillary light reflex normal | Lens accommodation good",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.eyes.m1.label",
      langCodes: {
        "zh-CN": "裸眼视力 (左/右)",
        "en-US": "Uncorrected Vision (L/R)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.eyes.m1.val",
      langCodes: { "zh-CN": "5.0 / 5.0 (1.0)", "en-US": "5.0 / 5.0 (1.0)" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.eyes.m2.label",
      langCodes: {
        "zh-CN": "眼压测定 (IOP)",
        "en-US": "Intraocular Pressure (IOP)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.eyes.m2.val",
      langCodes: { "zh-CN": "15 mmHg (正常)", "en-US": "15 mmHg (Normal)" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.eyes.m3.label",
      langCodes: {
        "zh-CN": "视疲劳与干眼指数",
        "en-US": "Eye Strain & Dryness Index",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.eyes.m3.val",
      langCodes: { "zh-CN": "18% (轻微)", "en-US": "18% (Mild)" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.eyes.sug",
      langCodes: {
        "zh-CN":
          "双眼视力与眼压均在标准范围。建议遵守“20-20-20”护眼法则，连续用眼40分钟后远眺休息。",
        "en-US":
          "Vision and IOP are within standard range. Follow 20-20-20 rule, rest eyes after 40 mins.",
      },
    },

    // Heart Data
    {
      application: "frontend",
      tKey: "personal.health.data.heart.status",
      langCodes: { "zh-CN": "心律正常", "en-US": "Normal Rhythm" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.heart.effect",
      langCodes: {
        "zh-CN": "心脏收缩跳动频率: 72 BPM | 冠状动脉血液充盈流速正常",
        "en-US": "Heart contraction rate: 72 BPM | Coronary blood flow normal",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.heart.m1.label",
      langCodes: {
        "zh-CN": "静息心率 (Heart Rate)",
        "en-US": "Resting Heart Rate",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.heart.m1.val",
      langCodes: { "zh-CN": "72 次/分", "en-US": "72 bpm" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.heart.m2.label",
      langCodes: {
        "zh-CN": "收缩压/舒张压 (BP)",
        "en-US": "Blood Pressure (BP)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.heart.m2.val",
      langCodes: { "zh-CN": "118/78 mmHg", "en-US": "118/78 mmHg" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.heart.m3.label",
      langCodes: {
        "zh-CN": "心肌供血指数",
        "en-US": "Myocardial Perfusion Index",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.heart.m3.val",
      langCodes: { "zh-CN": "96分 (良好)", "en-US": "96 (Good)" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.heart.sug",
      langCodes: {
        "zh-CN":
          "心功能状态优良。建议每周保持至少150分钟中等强度有氧运动（如慢跑、游泳），维持低盐低脂饮食。",
        "en-US":
          "Cardiac function is excellent. Maintain 150 mins weekly aerobic exercise and low-salt diet.",
      },
    },

    // Stomach Data
    {
      application: "frontend",
      tKey: "personal.health.data.stomach.status",
      langCodes: { "zh-CN": "轻度充血", "en-US": "Mild Hyperemia" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.stomach.effect",
      langCodes: {
        "zh-CN": "胃壁平滑肌波状蠕动频率: 3次/分 | 胃酸分泌评估适中",
        "en-US":
          "Gastric smooth muscle wave frequency: 3/min | Acid secretion moderate",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.stomach.m1.label",
      langCodes: {
        "zh-CN": "胃动力指数 (Gastric Motility)",
        "en-US": "Gastric Motility Index",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.stomach.m1.val",
      langCodes: { "zh-CN": "85分 (正常)", "en-US": "85 (Normal)" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.stomach.m2.label",
      langCodes: {
        "zh-CN": "胃粘膜保护屏障",
        "en-US": "Gastric Mucosal Barrier",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.stomach.m2.val",
      langCodes: { "zh-CN": "78分 (稍薄)", "en-US": "78 (Slightly Thin)" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.stomach.m3.label",
      langCodes: { "zh-CN": "幽门螺杆菌 (Hp检测)", "en-US": "H. pylori Test" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.stomach.m3.val",
      langCodes: { "zh-CN": "阴性 (-)", "en-US": "Negative (-)" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.stomach.sug",
      langCodes: {
        "zh-CN":
          "胃粘膜呈浅表性轻度充血。避免暴饮暴食，减少辛辣刺激性食物及饮酒，规律就餐时间。",
        "en-US":
          "Gastric mucosa shows mild superficial hyperemia. Avoid overeating and spicy foods.",
      },
    },

    // Brain Data
    {
      application: "frontend",
      tKey: "personal.health.data.brain.status",
      langCodes: { "zh-CN": "精力充沛", "en-US": "Energetic" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.brain.effect",
      langCodes: {
        "zh-CN": "神经元突触电信号传递频率: α波为主 | 脑血管灌注良好",
        "en-US":
          "Neuronal synaptic signal frequency: Alpha wave dominant | Cerebrovascular perfusion good",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.brain.m1.label",
      langCodes: {
        "zh-CN": "脑神经疲劳指数",
        "en-US": "Cerebral Fatigue Index",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.brain.m1.val",
      langCodes: { "zh-CN": "25% (低疲劳)", "en-US": "25% (Low)" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.brain.m2.label",
      langCodes: {
        "zh-CN": "深度睡眠质量评分",
        "en-US": "Deep Sleep Quality Score",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.brain.m2.val",
      langCodes: { "zh-CN": "88分", "en-US": "88 pts" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.brain.m3.label",
      langCodes: {
        "zh-CN": "认知与专注力状态",
        "en-US": "Cognitive Focus State",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.brain.m3.val",
      langCodes: { "zh-CN": "92分 (充沛)", "en-US": "92 pts (High)" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.brain.sug",
      langCodes: {
        "zh-CN":
          "大脑α波平稳，睡眠恢复良好。保持良好睡眠习惯，工作每满45分钟进行5分钟远眺放松。",
        "en-US":
          "Alpha waves stable, sleep recovery good. Maintain good sleep habits and rest periodically.",
      },
    },

    // Lungs Data
    {
      application: "frontend",
      tKey: "personal.health.data.lungs.status",
      langCodes: { "zh-CN": "通气顺畅", "en-US": "Clear Ventilation" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.lungs.effect",
      langCodes: {
        "zh-CN": "呼吸潮气量: 550mL | 肺泡气体交换效率 98%",
        "en-US": "Tidal volume: 550mL | Alveolar gas exchange efficiency 98%",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.lungs.m1.label",
      langCodes: {
        "zh-CN": "血氧饱和度 (SpO2)",
        "en-US": "Blood Oxygen (SpO2)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.lungs.m1.val",
      langCodes: { "zh-CN": "99%", "en-US": "99%" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.lungs.m2.label",
      langCodes: {
        "zh-CN": "肺活量 (FVC)",
        "en-US": "Forced Vital Capacity (FVC)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.lungs.m2.val",
      langCodes: { "zh-CN": "4200 mL", "en-US": "4200 mL" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.lungs.m3.label",
      langCodes: {
        "zh-CN": "气道阻力指数",
        "en-US": "Airway Resistance Index",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.lungs.m3.val",
      langCodes: { "zh-CN": "正常", "en-US": "Normal" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.lungs.sug",
      langCodes: {
        "zh-CN":
          "肺通气功能优秀。注意在雾霾天气佩戴防护口罩，定期进行腹式深呼吸训练。",
        "en-US":
          "Pulmonary ventilation is excellent. Wear masks in smoggy weather and practice deep breathing.",
      },
    },

    // Liver Data
    {
      application: "frontend",
      tKey: "personal.health.data.liver.status",
      langCodes: { "zh-CN": "轻度脂肪肝", "en-US": "Mild Fatty Liver" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.liver.effect",
      langCodes: {
        "zh-CN": "肝细胞代谢与解毒酶活力平稳 | 胆汁分泌正常",
        "en-US": "Hepatocyte metabolism stable | Bile secretion normal",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.liver.m1.label",
      langCodes: {
        "zh-CN": "谷丙转氨酶 (ALT)",
        "en-US": "Alanine Aminotransferase (ALT)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.liver.m1.val",
      langCodes: { "zh-CN": "28 U/L (正常)", "en-US": "28 U/L (Normal)" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.liver.m2.label",
      langCodes: {
        "zh-CN": "脂肪浸润程度",
        "en-US": "Fatty Infiltration Level",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.liver.m2.val",
      langCodes: { "zh-CN": "15% (轻度)", "en-US": "15% (Mild)" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.liver.m3.label",
      langCodes: {
        "zh-CN": "解毒与糖原储备",
        "en-US": "Detox & Glycogen Reserve",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.liver.m3.val",
      langCodes: { "zh-CN": "88分", "en-US": "88 pts" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.liver.sug",
      langCodes: {
        "zh-CN":
          "提示轻度脂肪肝。建议控制高热量糖分摄入，适当进行减脂运动，严禁过量饮酒。",
        "en-US":
          "Indicates mild fatty liver. Control sugar intake, exercise regularly, and avoid alcohol.",
      },
    },

    // Kidneys Data
    {
      application: "frontend",
      tKey: "personal.health.data.kidneys.status",
      langCodes: { "zh-CN": "滤过良好", "en-US": "Good Filtration" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.kidneys.effect",
      langCodes: {
        "zh-CN": "肾小球滤过率 (eGFR): 105 mL/min/1.73m² | 水电解质平衡",
        "en-US": "eGFR: 105 mL/min/1.73m² | Electrolyte balance normal",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.kidneys.m1.label",
      langCodes: {
        "zh-CN": "肾小球滤过率 (eGFR)",
        "en-US": "Glomerular Filtration Rate (eGFR)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.kidneys.m1.val",
      langCodes: { "zh-CN": "105 mL/min", "en-US": "105 mL/min" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.kidneys.m2.label",
      langCodes: { "zh-CN": "血肌酐 (Cr)", "en-US": "Serum Creatinine (Cr)" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.kidneys.m2.val",
      langCodes: { "zh-CN": "72 μmol/L", "en-US": "72 μmol/L" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.kidneys.m3.label",
      langCodes: {
        "zh-CN": "尿素氮 (BUN)",
        "en-US": "Blood Urea Nitrogen (BUN)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.kidneys.m3.val",
      langCodes: { "zh-CN": "4.8 mmol/L", "en-US": "4.8 mmol/L" },
    },
    {
      application: "frontend",
      tKey: "personal.health.data.kidneys.sug",
      langCodes: {
        "zh-CN":
          "肾脏排泄功能完好。每日保证摄入 1500~2000 mL 饮用水，避免滥用非甾体抗炎药物。",
        "en-US":
          "Renal excretion is intact. Drink 1500-2000 mL water daily and avoid NSAIDs overuse.",
      },
    },

    // MedicalRecordList
    {
      application: "frontend",
      tKey: "personal.health.record.title",
      langCodes: {
        "zh-CN": "个人医疗档案与诊疗记录",
        "en-US": "Medical Records & Diagnosis History",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.add",
      langCodes: {
        "zh-CN": "添加医疗记录",
        "en-US": "Add Medical Record",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.deleteConfirm",
      langCodes: {
        "zh-CN": "确定要删除此条医疗记录吗？",
        "en-US": "Are you sure you want to delete this medical record?",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.dialogAddTitle",
      langCodes: {
        "zh-CN": "新增医疗记录",
        "en-US": "New Medical Record",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.dialogEditTitle",
      langCodes: {
        "zh-CN": "编辑医疗记录",
        "en-US": "Edit Medical Record",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.colDate",
      langCodes: {
        "zh-CN": "就诊日期",
        "en-US": "Visit Date",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.colCategory",
      langCodes: {
        "zh-CN": "分类",
        "en-US": "Category",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.colTitle",
      langCodes: {
        "zh-CN": "标题/诊断项目",
        "en-US": "Title / Diagnostic Item",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.colHospital",
      langCodes: {
        "zh-CN": "医疗机构 / 医师",
        "en-US": "Hospital / Physician",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.colPrescription",
      langCodes: {
        "zh-CN": "处方/医嘱",
        "en-US": "Prescription / Doctor Order",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.colCost",
      langCodes: {
        "zh-CN": "费用(元)",
        "en-US": "Cost (CNY)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.empty",
      langCodes: {
        "zh-CN": "暂无相关医疗记录",
        "en-US": "No medical records found",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.tabAll",
      langCodes: {
        "zh-CN": "全部记录",
        "en-US": "All Records",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.tabOutpatient",
      langCodes: {
        "zh-CN": "门诊记录",
        "en-US": "Outpatient Records",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.tabHospitalization",
      langCodes: {
        "zh-CN": "住院记录",
        "en-US": "Hospitalization Records",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.tabExam",
      langCodes: {
        "zh-CN": "体检报告",
        "en-US": "Physical Exam Reports",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.tabPrescription",
      langCodes: {
        "zh-CN": "处方用药",
        "en-US": "Prescriptions",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.tabVaccination",
      langCodes: {
        "zh-CN": "疫苗接种",
        "en-US": "Vaccinations",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.formCategory",
      langCodes: {
        "zh-CN": "记录分类",
        "en-US": "Record Category",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.formTitle",
      langCodes: {
        "zh-CN": "记录标题 / 诊断名称",
        "en-US": "Record Title / Diagnosis",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.formHospital",
      langCodes: {
        "zh-CN": "医院/医疗机构",
        "en-US": "Hospital / Institution",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.formDoctor",
      langCodes: {
        "zh-CN": "主治医师",
        "en-US": "Attending Physician",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.formDiagnosis",
      langCodes: {
        "zh-CN": "诊断结论",
        "en-US": "Diagnosis Conclusion",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.formPrescription",
      langCodes: {
        "zh-CN": "处方 / 医嘱",
        "en-US": "Prescription / Orders",
      },
    },
    {
      application: "frontend",
      tKey: "personal.health.record.formCost",
      langCodes: {
        "zh-CN": "医疗费用 (元)",
        "en-US": "Medical Cost (CNY)",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "personal.health">,
  TranslationInputItem[]
>;
