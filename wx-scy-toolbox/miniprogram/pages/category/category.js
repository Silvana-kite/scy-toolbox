const { loadCatalog, recordToolUse } = require("../../services/tool-catalog");

const ALL_CATEGORY = { id: "all", name: "全部", symbol: "▦" };

function buildCategories(tools) {
  const categoriesById = new Map();
  tools.forEach((tool) => {
    if (!tool.categoryId || categoriesById.has(tool.categoryId)) {
      return;
    }
    categoriesById.set(tool.categoryId, {
      id: tool.categoryId,
      name: tool.categoryName || "未分类",
      symbol: tool.categorySymbol || "•",
      order: Number(tool.categoryOrder) || 0,
    });
  });
  return [ALL_CATEGORY].concat(
    Array.from(categoriesById.values()).sort((left, right) => left.order - right.order)
  );
}

Page({
  data: {
    categories: [ALL_CATEGORY],
    currentCategory: "all",
    currentCategoryName: "全部工具",
    toolColumns: [],
    toolCount: 0,
    isLoadingTools: true,
    toolsLoadError: false,
    isOfflineTools: false,
  },

  onLoad() {
    this.loadTools();
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      tabBar.setSelected(1);
    }
  },

  onCategoryTap(event) {
    this.setData({ currentCategory: event.currentTarget.dataset.id });
    this.updateTools();
  },

  onToolTap(event) {
    const { toolId, route } = event.currentTarget.dataset;
    if (!route) {
      return;
    }
    recordToolUse(toolId).catch(() => {});
    wx.navigateTo({ url: route });
  },

  onSearchTap() {
    wx.showToast({ title: "搜索功能开发中", icon: "none" });
  },

  onPromoTap(event) {
    wx.showToast({ title: event.currentTarget.dataset.name, icon: "none" });
  },

  async loadTools() {
    this.setData({ isLoadingTools: true, toolsLoadError: false, isOfflineTools: false });
    try {
      const result = await loadCatalog();
      this.catalogTools = result.tools || [];
      const categories = buildCategories(this.catalogTools);
      const currentCategory = categories.some((category) => category.id === this.data.currentCategory)
        ? this.data.currentCategory
        : "all";
      this.setData({
        categories,
        currentCategory,
        isOfflineTools: result.fromCache === true,
        isLoadingTools: false,
      });
      this.updateTools();
    } catch (error) {
      this.catalogTools = [];
      this.setData({
        toolColumns: [],
        toolCount: 0,
        toolsLoadError: true,
        isLoadingTools: false,
      });
    }
  },

  onRetryTools() {
    this.loadTools();
  },

  updateTools() {
    const currentCategory = this.data.currentCategory;
    const catalogTools = this.catalogTools || [];
    const filteredTools = catalogTools.filter(
      (tool) => currentCategory === "all" || tool.categoryId === currentCategory
    );
    const toolColumns = [[], []];

    filteredTools.forEach((tool, index) => {
      toolColumns[index % 2].push(tool);
    });

    this.setData({
      currentCategoryName:
        currentCategory === "all"
          ? "全部工具"
          : this.data.categories.find((category) => category.id === currentCategory).name,
      toolColumns,
      toolCount: filteredTools.length,
    });
  },
});
