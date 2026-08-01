const tabItems = [
  { pagePath: "pages/index/index", text: "首页", image: "/images/navIcons/home-inactive.svg" },
  { pagePath: "pages/category/category", text: "工具大全", image: "/images/navIcons/category-inactive.svg" },
  { pagePath: "pages/mine/mine", text: "我的", image: "/images/navIcons/mine-inactive.svg" },
];

Component({
  data: {
    selected: 0,
    tabItems,
  },

  methods: {
    setSelected(selected) {
      this.setData({ selected });
    },

    onTabTap(event) {
      const selected = Number(event.currentTarget.dataset.index);
      if (selected === this.data.selected) return;
      wx.switchTab({ url: `/${tabItems[selected].pagePath}` });
    },
  },
});
