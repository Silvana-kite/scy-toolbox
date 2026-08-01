const FAVORITES_STORAGE_KEY = "scy-tool-favorites";
const HISTORY_STORAGE_KEY = "scy-tool-history";
const USAGE_STORAGE_KEY = "scy-tool-usage-count";
const { callCloudFunction } = require("../../services/cloud");

const toolNames = {};

const defaultProfile = {
  avatarUrl: "",
  avatarFileId: "",
  nickname: "访客",
  userId: "",
  isGuest: false,
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
    userId: "",
    isGuest: false,
    favoriteCount: 0,
    usageCount: 0,
    topTool: "暂无使用",
    cacheSize: "0KB",
    favoriteNames: [],
    historyRecords: [],
  },

  async onLoad() {
    this.savedProfile = { ...defaultProfile };
    await this.loadCloudProfile();
    this.refreshStats();
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      tabBar.setSelected(2);
    }
    this.refreshStats();
  },

  async onChooseAvatar(event) {
    const filePath = event.detail.avatarUrl;
    if (!filePath || this.data.isGuest || !this.data.userId) {
      wx.showToast({ title: "联网后可修改资料", icon: "none" });
      return;
    }

    wx.showLoading({ title: "上传中" });
    try {
      if (this.savedProfile.avatarFileId) {
        await wx.cloud.deleteFile({ fileList: [this.savedProfile.avatarFileId] });
      }
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: `avatars/${this.data.userId}/avatar.png`,
        filePath,
      });
      const result = await callCloudFunction("users", {
        action: "updateProfile",
        profile: { avatarFileId: uploadResult.fileID },
      });
      this.applyProfile(result.data.user);
    } catch (error) {
      this.applyProfile(this.savedProfile);
      wx.showToast({ title: "头像更新失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  onNicknameInput(event) {
    this.setData({ nickname: String(event.detail.value || "") });
  },

  async onNicknameCommit(event) {
    if (this.isSavingNickname) {
      return;
    }

    const nickname = String(event.detail.value || this.data.nickname || "").trim();
    if (!nickname || nickname === this.savedProfile.nickname) {
      this.setData({ nickname: this.savedProfile.nickname });
      return;
    }
    if (this.data.isGuest) {
      this.setData({ nickname: this.savedProfile.nickname });
      wx.showToast({ title: "联网后可修改资料", icon: "none" });
      return;
    }

    this.isSavingNickname = true;
    try {
      const result = await callCloudFunction("users", {
        action: "updateProfile",
        profile: { nickname },
      });
      this.applyProfile(result.data.user);
    } catch (error) {
      this.setData({ nickname: this.savedProfile.nickname });
      wx.showToast({ title: "昵称更新失败", icon: "none" });
    } finally {
      this.isSavingNickname = false;
    }
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
      content: "将清除收藏、工具使用记录与其他本地缓存，是否继续？",
      success: (response) => {
        if (!response.confirm) {
          return;
        }
        [FAVORITES_STORAGE_KEY, HISTORY_STORAGE_KEY, USAGE_STORAGE_KEY].forEach((key) => {
          wx.removeStorageSync(key);
        });
        this.refreshStats();
        wx.showToast({ title: "缓存已清除", icon: "none" });
      },
    });
  },

  async loadCloudProfile() {
    const app = getApp();
    const user = await (app.globalData.userReady || Promise.resolve(defaultProfile));
    this.applyProfile(user);
  },

  applyProfile(user) {
    const app = getApp();
    if (user && typeof app.setCurrentUser === "function") {
      app.setCurrentUser(user);
    }
    const profile = {
      avatarUrl: user.avatarFileId || "",
      avatarFileId: user.avatarFileId || "",
      nickname: user.nickname || defaultProfile.nickname,
      userId: user.userId || "",
      isGuest: Boolean(user.isGuest),
    };
    this.savedProfile = profile;
    this.setData({
      avatarUrl: profile.avatarUrl,
      nickname: profile.nickname,
      userId: profile.userId,
      isGuest: profile.isGuest,
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
