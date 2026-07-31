const categories = [
  { id: "all", name: "全部", symbol: "▦" },
];

const tools = [];

Page({
  data: {
    categories,
    currentCategory: "all",
    currentCategoryName: "全部工具",
    toolColumns: [],
    toolCount: tools.length,
  },

  onLoad() {
    this.updateTools();
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
    wx.navigateTo({
      url: `/pages/tool/tool?toolId=${event.currentTarget.dataset.id}`,
    });
  },

  onSearchTap() {
    wx.showToast({ title: "搜索功能开发中", icon: "none" });
  },

  onPromoTap(event) {
    wx.showToast({ title: event.currentTarget.dataset.name, icon: "none" });
  },

  updateTools() {
    const currentCategory = this.data.currentCategory;
    const filteredTools = tools.filter(
      (tool) => currentCategory === "all" || tool.category === currentCategory
    );
    const toolColumns = [[], []];

    filteredTools.forEach((tool, index) => {
      toolColumns[index % 2].push(tool);
    });

    this.setData({
      currentCategoryName:
        currentCategory === "all"
          ? "全部工具"
          : categories.find((category) => category.id === currentCategory).name,
      toolColumns,
      toolCount: filteredTools.length,
    });
  },
});
