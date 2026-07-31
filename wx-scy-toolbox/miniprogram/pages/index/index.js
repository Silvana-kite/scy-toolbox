const categories = [
  { id: "推荐", name: "推荐" },
];

const tools = [];

Page({
  data: {
    categories,
    tools,
    currentCategory: "推荐",
    keyword: "",
    filteredTools: tools,
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      tabBar.setSelected(0);
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
    wx.showToast({
      title: `${event.currentTarget.dataset.name}功能开发中`,
      icon: "none",
    });
  },

  applyFilters() {
    const keyword = this.data.keyword.trim();
    const filteredTools = this.data.tools.filter((tool) => {
      const matchesCategory =
        this.data.currentCategory === "推荐" || tool.category === this.data.currentCategory;
      const matchesKeyword = tool.name.indexOf(keyword) !== -1;
      return matchesCategory && matchesKeyword;
    });

    this.setData({ filteredTools });
  },
});
