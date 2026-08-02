const { callCloudFunction } = require("../../services/cloud");
const { errorMessage, flushPendingUses, getOverview } = require("../../services/personal-tools");

const defaultProfile = { avatarFileId: "", nickname: "访客", userId: "", isGuest: true };

function cacheSize() {
  try { const size = Number(wx.getStorageInfoSync().currentSize) || 0; return size >= 1024 ? `${(size / 1024).toFixed(2)}MB` : `${size}KB`; } catch { return "--"; }
}

Page({
  data: { avatarUrl: "", nickname: "访客", userId: "", isGuest: true, favoriteCount: 0, usageCount: 0, topTool: "暂无使用", overviewError: "", cacheSize: "0KB" },

  async onLoad() { this.savedProfile = { ...defaultProfile }; await this.loadProfile(); await this.loadOverview(); },
  onShow() { const tabBar = this.getTabBar && this.getTabBar(); if (tabBar) tabBar.setSelected(2); flushPendingUses().finally(() => this.loadOverview()); },

  async loadProfile() {
    const app = getApp(); const user = await (app.globalData.userReady || Promise.resolve(defaultProfile));
    this.savedProfile = { avatarFileId: user.avatarFileId || "", nickname: user.nickname || "访客", userId: user.userId || "", isGuest: Boolean(user.isGuest) };
    this.setData({ avatarUrl: this.savedProfile.avatarFileId, nickname: this.savedProfile.nickname, userId: this.savedProfile.userId, isGuest: this.savedProfile.isGuest, cacheSize: cacheSize() });
  },

  async loadOverview() {
    if (this.data.isGuest || !this.data.userId) { this.setData({ favoriteCount: 0, usageCount: 0, topTool: "暂无使用" }); return; }
    try { const data = await getOverview(); this.setData({ favoriteCount: data.favoriteCount || 0, usageCount: data.usageCount || 0, topTool: data.topTool ? data.topTool.name : "暂无使用", overviewError: "" }); }
    catch (error) { this.setData({ overviewError: errorMessage(error) }); }
  },

  onChooseAvatar(event) {
    const filePath = event.detail.avatarUrl;
    if (!filePath || this.data.isGuest) return wx.showToast({ title: "联网后可修改资料", icon: "none" });
    wx.cloud.uploadFile({ cloudPath: `avatars/${this.data.userId}/avatar.png`, filePath }).then((upload) => callCloudFunction("users", { action: "updateProfile", profile: { avatarFileId: upload.fileID } })).then((result) => { this.savedProfile.avatarFileId = result.data.user.avatarFileId; this.setData({ avatarUrl: result.data.user.avatarFileId }); }).catch(() => wx.showToast({ title: "头像更新失败", icon: "none" }));
  },
  onNicknameInput(event) { this.setData({ nickname: String(event.detail.value || "") }); },
  async onNicknameCommit(event) {
    const nickname = String(event.detail.value || this.data.nickname || "").trim();
    if (!nickname || nickname === this.savedProfile.nickname) return this.setData({ nickname: this.savedProfile.nickname });
    if (this.data.isGuest) return this.setData({ nickname: this.savedProfile.nickname });
    try { const result = await callCloudFunction("users", { action: "updateProfile", profile: { nickname } }); this.savedProfile.nickname = result.data.user.nickname; this.setData({ nickname: result.data.user.nickname }); } catch { this.setData({ nickname: this.savedProfile.nickname }); }
  },
  onOpenFavorites() { wx.navigateTo({ url: "/pages/favorites/favorites" }); },
  onOpenHistory() { wx.navigateTo({ url: "/pages/history/history" }); },
  onOpenAbout() { wx.showModal({ title: "关于 SCY 百宝箱", content: "SCY 百宝箱是一款轻量实用工具集合。", showCancel: false }); },
  onClearCache() { wx.clearStorageSync(); this.setData({ cacheSize: cacheSize() }); wx.showToast({ title: "本地缓存已清除", icon: "none" }); },
});
