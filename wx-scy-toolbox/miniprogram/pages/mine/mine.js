const PROFILE_STORAGE_KEY = "scy-mine-profile";
const FAVORITES_STORAGE_KEY = "scy-tool-favorites";
const HISTORY_STORAGE_KEY = "scy-tool-history";
const USAGE_STORAGE_KEY = "scy-tool-usage-count";

const toolNames = {
  calculator: "计算器",
  unit: "单位换算",
  mortgage: "房贷计算",
  percentage: "百分比计算",
  compress: "图片压缩",
  qrcode: "二维码生成",
  crop: "图片裁剪",
  "word-count": "字数统计",
  "text-format": "文本格式化",
  countdown: "日期倒计时",
  "date-difference": "日期间隔",
  ruler: "手机尺子",
  "color-picker": "颜色取值",
  random: "随机决定",
};

const defaultProfile = {
  avatarUrl: "",
  nickname: "SCY 用户",
};

function getStoredArray(key) {
  const value = wx.getStorageSync(key);
  return Array.isArray(value) ? value : [];
}

function getStoredCount() {
  const value = Number(wx.getStorageSync(USAGE_STORAGE_KEY));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getCacheSize() {
  try {
    const size = Number(wx.getStorageInfoSync().currentSize) || 0;
    return size >= 1024 ? `${(size / 1024).toFixed(2)}MB` : `${size}KB`;
  } catch (error) {
    return "--";
  }
}

function getToolName(toolId, fallback) {
  return toolNames[toolId] || fallback || "未知工具";
}

Page({
  data: {
    avatarUrl: "",
    nickname: defaultProfile.nickname,
    favoriteCount: 0,
    usageCount: 0,
    topTool: "暂无使用",
    cacheSize: "0KB",
    favoriteNames: [],
    historyRecords: [],
  },

  onLoad() {
    this.loadProfile();
    this.refreshStats();
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      tabBar.setSelected(2);
    }
    this.refreshStats();
  },

  onChooseAvatar(event) {
    this.setData({ avatarUrl: event.detail.avatarUrl || "" });
    this.saveProfile();
  },

  onNicknameBlur(event) {
    const nickname = String(event.detail.value || "").trim() || defaultProfile.nickname;
    this.setData({ nickname });
    this.saveProfile();
  },

  onOpenFavorites() {
    const content = this.data.favoriteNames.length
      ? this.data.favoriteNames.join("\n")
      : "暂未收藏工具";
    wx.showModal({ title: "我的收藏", content, showCancel: false });
  },

  onOpenHistory() {
    const content = this.data.historyRecords.length
      ? this.data.historyRecords.slice(0, 6).map((item) => `${item.toolName}：${item.result}`).join("\n")
      : "暂未使用工具";
    wx.showModal({ title: "使用历史", content, showCancel: false });
  },

  onOpenAbout() {
    wx.showModal({
      title: "关于 SCY百宝箱",
      content: "SCY百宝箱是一款轻量实用工具集合，遵循 MIT 开源协议发布。",
      showCancel: false,
    });
  },

  onClearCache() {
    wx.showModal({
      title: "清除缓存",
      content: "将清除头像、昵称、收藏与使用历史，是否继续？",
      success: (response) => {
        if (!response.confirm) {
          return;
        }
        [PROFILE_STORAGE_KEY, FAVORITES_STORAGE_KEY, HISTORY_STORAGE_KEY, USAGE_STORAGE_KEY].forEach((key) => {
          wx.removeStorageSync(key);
        });
        this.setData({
          avatarUrl: defaultProfile.avatarUrl,
          nickname: defaultProfile.nickname,
        });
        this.refreshStats();
        wx.showToast({ title: "缓存已清除", icon: "none" });
      },
    });
  },

  loadProfile() {
    const storedProfile = wx.getStorageSync(PROFILE_STORAGE_KEY);
    const profile = storedProfile && typeof storedProfile === "object"
      ? { ...defaultProfile, ...storedProfile }
      : defaultProfile;
    this.setData(profile);
  },

  saveProfile() {
    wx.setStorageSync(PROFILE_STORAGE_KEY, {
      avatarUrl: this.data.avatarUrl,
      nickname: this.data.nickname,
    });
  },

  refreshStats() {
    const favoriteIds = getStoredArray(FAVORITES_STORAGE_KEY);
    const history = getStoredArray(HISTORY_STORAGE_KEY);
    const frequency = history.reduce((counts, item) => {
      counts[item.toolId] = (counts[item.toolId] || 0) + 1;
      return counts;
    }, {});
    const topToolId = Object.keys(frequency).sort((first, second) => frequency[second] - frequency[first])[0];
    const historyRecords = history.map((item) => ({
      ...item,
      toolName: getToolName(item.toolId, item.toolName),
    }));

    this.setData({
      favoriteCount: favoriteIds.length,
      usageCount: getStoredCount() || history.length,
      topTool: topToolId ? getToolName(topToolId) : "暂无使用",
      cacheSize: getCacheSize(),
      favoriteNames: favoriteIds.map((toolId) => getToolName(toolId)),
      historyRecords,
    });
  },
});
