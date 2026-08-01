const { loadHome, recordToolUse } = require("../../services/tool-catalog");

const categories = [{ id: "common", name: "常用" }];
const CONSENT_STORAGE_KEY = "scy-image-repair-consent";
const CONSENT_VERSION = "2026-08-02";

Page({
  data: {
    categories,
    tools: [],
    currentCategory: "common",
    keyword: "",
    filteredTools: [],
    showConsentModal: false,
    consentAccepted: false,
    consentSubmitting: false,
    isLoadingTools: true,
    toolsLoadError: false,
    isOfflineTools: false,
  },

  onLoad() {
    this.syncConsentModal();
    this.loadTools();
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      tabBar.setSelected(0);
    }
    this.syncConsentModal();
  },

  syncConsentModal() {
    const consent = wx.getStorageSync(CONSENT_STORAGE_KEY);
    const hasAccepted =
      consent &&
      consent.version === CONSENT_VERSION &&
      consent.imageRightsConfirmed === true;
    this.setData({
      showConsentModal: !hasAccepted,
      consentAccepted: false,
      consentSubmitting: false,
    });
  },

  onConsentCheckChange(event) {
    this.setData({ consentAccepted: event.detail.value.includes("image-rights") });
  },

  noop() {},

  onConsentReject() {
    wx.showModal({
      title: "暂不能使用",
      content: "使用图片去水印工具前，需要确认您拥有图片处理权。",
      confirmText: "退出小程序",
      showCancel: false,
      success: () => {
        wx.exitMiniProgram({
          fail: () => wx.showToast({ title: "已取消使用", icon: "none" }),
        });
      },
    });
  },

  async onConsentAccept() {
    if (!this.data.consentAccepted || this.data.consentSubmitting) {
      if (!this.data.consentAccepted) {
        wx.showToast({ title: "请先勾选图片处理权承诺", icon: "none" });
      }
      return;
    }

    const consent = { version: CONSENT_VERSION, imageRightsConfirmed: true };
    wx.setStorageSync(CONSENT_STORAGE_KEY, consent);
    this.setData({ consentSubmitting: true });
    wx.showLoading({ title: "正在初始化" });
    try {
      await getApp().initializeUser(consent);
      this.setData({ showConsentModal: false });
    } catch (error) {
      this.setData({ showConsentModal: false });
      wx.showToast({ title: "用户资料将在网络恢复后初始化", icon: "none" });
    } finally {
      wx.hideLoading();
      this.setData({ consentSubmitting: false });
    }
  },

  onCategoryTap(event) {
    this.setData({ currentCategory: event.currentTarget.dataset.id });
    this.applyFilters();
  },

  onSearchInput(event) {
    this.setData({ keyword: event.detail.value });
    this.applyFilters();
  },

  onClearSearch() {
    this.setData({ keyword: "" });
    this.applyFilters();
  },

  onToolTap(event) {
    const { toolId, route } = event.currentTarget.dataset;
    if (!route) {
      return;
    }
    recordToolUse(toolId).catch(() => {});
    wx.navigateTo({ url: route });
  },

  async loadTools() {
    this.setData({ isLoadingTools: true, toolsLoadError: false, isOfflineTools: false });
    try {
      const result = await loadHome();
      this.setData({
        tools: result.tools || [],
        isOfflineTools: result.fromCache === true,
        isLoadingTools: false,
      });
      this.applyFilters();
    } catch (error) {
      this.setData({
        tools: [],
        filteredTools: [],
        toolsLoadError: true,
        isLoadingTools: false,
      });
    }
  },

  onRetryTools() {
    this.loadTools();
  },

  applyFilters() {
    const keyword = this.data.keyword.trim();
    const filteredTools = this.data.tools.filter((tool) => {
      const matchesCategory =
        this.data.currentCategory === "common" || tool.categoryId === this.data.currentCategory;
      const matchesKeyword = tool.name.indexOf(keyword) !== -1;
      return matchesCategory && matchesKeyword;
    });

    this.setData({ filteredTools });
  },
});
