const FAVORITES_STORAGE_KEY = "scy-tool-favorites";
const HISTORY_STORAGE_KEY = "scy-tool-history";
const USAGE_STORAGE_KEY = "scy-tool-usage-count";

const toolConfigs = {
  calculator: {
    id: "calculator",
    name: "计算器",
    description: "输入两个数字，完成基础算术计算。",
    actionLabel: "开始计算",
    fields: [
      { key: "first", label: "第一个数字", type: "input", inputType: "digit", placeholder: "例如：12", default: "0" },
      { key: "second", label: "第二个数字", type: "input", inputType: "digit", placeholder: "例如：8", default: "0" },
      {
        key: "operator",
        label: "运算方式",
        type: "choice",
        default: "add",
        options: [
          { value: "add", label: "+" },
          { value: "subtract", label: "-" },
          { value: "multiply", label: "x" },
          { value: "divide", label: "/" },
        ],
      },
    ],
  },
  unit: {
    id: "unit",
    name: "单位换算",
    description: "常用长度、重量和温度换算。",
    actionLabel: "开始换算",
    fields: [
      { key: "value", label: "输入数值", type: "input", inputType: "digit", placeholder: "例如：1", default: "1" },
      {
        key: "conversion",
        label: "换算类型",
        type: "choice",
        default: "meter-foot",
        options: [
          { value: "meter-foot", label: "米 -> 英尺" },
          { value: "kilogram-pound", label: "千克 -> 磅" },
          { value: "celsius-fahrenheit", label: "摄氏 -> 华氏" },
        ],
      },
    ],
  },
  mortgage: {
    id: "mortgage",
    name: "房贷计算",
    description: "按等额本息估算每月还款金额。",
    actionLabel: "计算月供",
    fields: [
      { key: "amount", label: "贷款金额（万元）", type: "input", inputType: "digit", placeholder: "例如：100", default: "100" },
      { key: "years", label: "贷款年限", type: "input", inputType: "number", placeholder: "例如：30", default: "30" },
      { key: "rate", label: "年利率", type: "slider", min: 0, max: 10, step: 0.1, default: 3.5, suffix: "%" },
    ],
  },
  percentage: {
    id: "percentage",
    name: "百分比计算",
    description: "快速计算比例、折扣或税费。",
    actionLabel: "开始计算",
    fields: [
      { key: "amount", label: "原始数值", type: "input", inputType: "digit", placeholder: "例如：100", default: "100" },
      { key: "percent", label: "百分比", type: "slider", min: 0, max: 100, step: 1, default: 20, suffix: "%" },
    ],
  },
  compress: {
    id: "compress",
    name: "图片压缩",
    description: "选择图片，准备压缩任务参数。",
    actionLabel: "创建压缩任务",
    fields: [{ key: "image", label: "选择图片", type: "uploader", default: "" }],
  },
  qrcode: {
    id: "qrcode",
    name: "二维码生成",
    description: "输入文字或链接，准备二维码内容。",
    actionLabel: "生成内容",
    fields: [{ key: "content", label: "二维码内容", type: "textarea", placeholder: "输入文字或链接", default: "" }],
  },
  crop: {
    id: "crop",
    name: "图片裁剪",
    description: "选择图片与裁剪比例，准备裁剪任务。",
    actionLabel: "创建裁剪任务",
    fields: [
      { key: "image", label: "选择图片", type: "uploader", default: "" },
      {
        key: "ratio",
        label: "裁剪比例",
        type: "choice",
        default: "1:1",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "4:3", label: "4:3" },
          { value: "16:9", label: "16:9" },
        ],
      },
    ],
  },
  "word-count": {
    id: "word-count",
    name: "字数统计",
    description: "统计文本字数、字符和段落数量。",
    actionLabel: "统计字数",
    fields: [{ key: "content", label: "输入文本", type: "textarea", placeholder: "在这里粘贴或输入文本", default: "" }],
  },
  "text-format": {
    id: "text-format",
    name: "文本格式化",
    description: "清理空行与首尾空格，让文本更整洁。",
    actionLabel: "格式化文本",
    fields: [{ key: "content", label: "输入文本", type: "textarea", placeholder: "在这里粘贴或输入文本", default: "" }],
  },
  countdown: {
    id: "countdown",
    name: "日期倒计时",
    description: "计算距离目标日期的剩余天数。",
    actionLabel: "计算倒计时",
    fields: [{ key: "targetDate", label: "目标日期", type: "date", default: "" }],
  },
  "date-difference": {
    id: "date-difference",
    name: "日期间隔",
    description: "计算两个日期之间相差的天数。",
    actionLabel: "计算间隔",
    fields: [
      { key: "startDate", label: "开始日期", type: "date", default: "" },
      { key: "endDate", label: "结束日期", type: "date", default: "" },
    ],
  },
  ruler: {
    id: "ruler",
    name: "手机尺子",
    description: "设定参考长度，准备校准显示效果。",
    actionLabel: "开始校准",
    fields: [{ key: "length", label: "参考长度", type: "slider", min: 1, max: 30, step: 1, default: 5, suffix: " cm" }],
  },
  "color-picker": {
    id: "color-picker",
    name: "颜色取值",
    description: "选择图片，准备识别其中的颜色信息。",
    actionLabel: "开始识别",
    fields: [{ key: "image", label: "选择图片", type: "uploader", default: "" }],
  },
  random: {
    id: "random",
    name: "随机决定",
    description: "输入多个选项，让工具随机给出答案。",
    actionLabel: "帮我决定",
    fields: [{ key: "options", label: "候选选项", type: "textarea", placeholder: "每行一个选项", default: "选项 A\n选项 B" }],
  },
};

function createFormValues(tool) {
  return tool.fields.reduce((values, field) => {
    values[field.key] = field.default !== undefined ? field.default : "";
    return values;
  }, {});
}

function getStoredArray(key) {
  const storedValue = wx.getStorageSync(key);
  return Array.isArray(storedValue) ? storedValue : [];
}

function getStoredCount(key) {
  const value = Number(wx.getStorageSync(key));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function requireNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`请输入有效的${label}`);
  }
  return number;
}

function requireText(value, label) {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error(`请先${label}`);
  }
  return text;
}

function parseDate(value, label) {
  const dateText = requireText(value, `选择${label}`);
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`请输入有效的${label}`);
  }
  return date;
}

function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDecimal(value) {
  return Number(value.toFixed(2)).toString();
}

function runTool(tool, values) {
  switch (tool.id) {
    case "calculator": {
      const first = requireNumber(values.first, "第一个数字");
      const second = requireNumber(values.second, "第二个数字");
      const operators = {
        add: { symbol: "+", calculate: () => first + second },
        subtract: { symbol: "-", calculate: () => first - second },
        multiply: { symbol: "x", calculate: () => first * second },
        divide: {
          symbol: "/",
          calculate: () => {
            if (second === 0) {
              throw new Error("除数不能为 0");
            }
            return first / second;
          },
        },
      };
      const operator = operators[values.operator];
      const answer = operator.calculate();
      return { title: "计算结果", text: `${first} ${operator.symbol} ${second} = ${formatDecimal(answer)}`, detail: "已完成基础算术计算" };
    }
    case "unit": {
      const value = requireNumber(values.value, "数值");
      const conversions = {
        "meter-foot": { label: "米", target: "英尺", result: value * 3.28084 },
        "kilogram-pound": { label: "千克", target: "磅", result: value * 2.20462 },
        "celsius-fahrenheit": { label: "摄氏度", target: "华氏度", result: value * 1.8 + 32 },
      };
      const conversion = conversions[values.conversion];
      return { title: "换算结果", text: `${value} ${conversion.label} = ${formatDecimal(conversion.result)} ${conversion.target}`, detail: "已按当前换算类型计算" };
    }
    case "mortgage": {
      const amount = requireNumber(values.amount, "贷款金额") * 10000;
      const years = requireNumber(values.years, "贷款年限");
      const annualRate = requireNumber(values.rate, "年利率") / 100;
      if (amount <= 0 || years <= 0) {
        throw new Error("贷款金额和年限必须大于 0");
      }
      const months = Math.round(years * 12);
      const monthlyRate = annualRate / 12;
      const monthlyPayment = monthlyRate === 0
        ? amount / months
        : (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
      return { title: "月供估算", text: `预计每月还款 ￥${formatDecimal(monthlyPayment)}`, detail: `贷款 ${formatDecimal(amount / 10000)} 万元，${months} 期，年利率 ${values.rate}%` };
    }
    case "percentage": {
      const amount = requireNumber(values.amount, "原始数值");
      const percent = requireNumber(values.percent, "百分比");
      const result = amount * percent / 100;
      return { title: "计算结果", text: `${amount} 的 ${percent}% = ${formatDecimal(result)}`, detail: "已按百分比计算" };
    }
    case "compress":
      requireText(values.image, "选择图片");
      return { title: "压缩任务已创建", text: "已接收本地图片，等待图像处理能力接入。", detail: "本次图片选择已记录在当前操作中" };
    case "qrcode": {
      const content = requireText(values.content, "输入二维码内容");
      return { title: "二维码内容已就绪", text: content, detail: "二维码图像渲染能力将在后续工具模块接入" };
    }
    case "crop":
      requireText(values.image, "选择图片");
      return { title: "裁剪任务已创建", text: `已选择 ${values.ratio} 裁剪比例`, detail: "等待图像裁剪能力接入" };
    case "word-count": {
      const content = requireText(values.content, "输入文本");
      const characters = content.replace(/\s/g, "").length;
      const paragraphs = content.split(/\n+/).filter((line) => line.trim()).length;
      return { title: "统计结果", text: `共 ${characters} 个非空白字符`, detail: `文本长度 ${content.length}，共 ${paragraphs} 个段落` };
    }
    case "text-format": {
      const lines = requireText(values.content, "输入文本").split(/\n+/).map((line) => line.trim()).filter(Boolean);
      return { title: "格式化结果", text: lines.join("\n"), detail: `已整理为 ${lines.length} 个有效段落` };
    }
    case "countdown": {
      const target = parseDate(values.targetDate, "目标日期");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days = Math.ceil((target.getTime() - today.getTime()) / 86400000);
      return { title: "倒计时结果", text: days >= 0 ? `距离目标日还有 ${days} 天` : `目标日已过去 ${Math.abs(days)} 天`, detail: `目标日期：${values.targetDate}` };
    }
    case "date-difference": {
      const start = parseDate(values.startDate, "开始日期");
      const end = parseDate(values.endDate, "结束日期");
      const days = Math.abs(Math.round((end.getTime() - start.getTime()) / 86400000));
      return { title: "日期间隔", text: `两个日期相差 ${days} 天`, detail: `${values.startDate} 至 ${values.endDate}` };
    }
    case "ruler":
      return { title: "校准参数已保存", text: `参考长度为 ${values.length} cm`, detail: "尺子显示能力将在后续模块接入" };
    case "color-picker":
      requireText(values.image, "选择图片");
      return { title: "颜色识别任务已创建", text: "已接收本地图片，等待颜色识别能力接入。", detail: "本次图片选择已记录在当前操作中" };
    case "random": {
      const options = requireText(values.options, "输入候选选项").split(/[\n,，]+/).map((option) => option.trim()).filter(Boolean);
      if (options.length < 2) {
        throw new Error("请至少输入两个候选选项");
      }
      const choice = options[Math.floor(Math.random() * options.length)];
      return { title: "随机决定", text: `这次选：${choice}`, detail: `已从 ${options.length} 个选项中随机选出` };
    }
    default:
      throw new Error("暂不支持该工具");
  }
}

Page({
  data: {
    tool: toolConfigs.calculator,
    formValues: createFormValues(toolConfigs.calculator),
    isFavorite: false,
    result: { visible: false, status: "success", title: "", text: "", detail: "" },
    history: [],
  },

  onLoad(options) {
    const tool = toolConfigs[options.toolId] || toolConfigs.calculator;
    const favorites = getStoredArray(FAVORITES_STORAGE_KEY);
    this.setData({
      tool,
      formValues: createFormValues(tool),
      isFavorite: favorites.includes(tool.id),
      result: { visible: false, status: "success", title: "", text: "", detail: "" },
      history: this.getToolHistory(tool.id),
    });
    wx.setNavigationBarTitle({ title: tool.name });
  },

  onFieldInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`formValues.${key}`]: event.detail.value });
  },

  onSliderChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`formValues.${key}`]: event.detail.value });
  },

  onDateChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`formValues.${key}`]: event.detail.value });
  },

  onChoiceTap(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`formValues.${key}`]: event.currentTarget.dataset.value });
  },

  onChooseImage(event) {
    const key = event.currentTarget.dataset.key;
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (response) => {
        this.setData({ [`formValues.${key}`]: response.tempFilePaths[0] });
      },
    });
  },

  onFavoriteTap() {
    const favorites = getStoredArray(FAVORITES_STORAGE_KEY);
    const hasFavorite = favorites.includes(this.data.tool.id);
    const nextFavorites = hasFavorite
      ? favorites.filter((toolId) => toolId !== this.data.tool.id)
      : [...favorites, this.data.tool.id];
    wx.setStorageSync(FAVORITES_STORAGE_KEY, nextFavorites);
    this.setData({ isFavorite: !hasFavorite });
    wx.showToast({ title: hasFavorite ? "已取消收藏" : "已收藏", icon: "none" });
  },

  onExecute() {
    try {
      const output = runTool(this.data.tool, this.data.formValues);
      const result = { visible: true, status: "success", ...output };
      this.setData({ result });
      this.saveHistory(result);
    } catch (error) {
      this.setData({
        result: {
          visible: true,
          status: "error",
          title: "无法执行",
          text: error.message || "请检查输入内容",
          detail: "修正参数后再试一次",
        },
      });
    }
  },

  onCopyResult() {
    wx.setClipboardData({
      data: this.data.result.text,
      success: () => wx.showToast({ title: "结果已复制", icon: "none" }),
    });
  },

  onClearHistory() {
    const nextHistory = getStoredArray(HISTORY_STORAGE_KEY).filter(
      (item) => item.toolId !== this.data.tool.id
    );
    wx.setStorageSync(HISTORY_STORAGE_KEY, nextHistory);
    this.setData({ history: [] });
  },

  getToolHistory(toolId) {
    return getStoredArray(HISTORY_STORAGE_KEY).filter((item) => item.toolId === toolId);
  },

  saveHistory(result) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      toolId: this.data.tool.id,
      toolName: this.data.tool.name,
      result: result.text,
      createdAt: formatDateTime(new Date()),
    };
    const history = [entry, ...getStoredArray(HISTORY_STORAGE_KEY)].slice(0, 50);
    wx.setStorageSync(HISTORY_STORAGE_KEY, history);
    wx.setStorageSync(USAGE_STORAGE_KEY, getStoredCount(USAGE_STORAGE_KEY) + 1);
    this.setData({ history: history.filter((item) => item.toolId === this.data.tool.id) });
  },
});
