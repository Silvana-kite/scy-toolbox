const {
  clearHistory,
  errorMessage,
  flushPendingUses,
  listHistory,
} = require("../../services/personal-tools");

Page({
  data: { history: [], loading: true, error: "", emptyText: "暂无使用历史" },
  onShow() {
    this.load();
  },
  async load() {
    this.setData({ loading: true, error: "" });
    await flushPendingUses();
    try {
      const result = await listHistory();
      this.setData({
        history: result.history || [],
        emptyText: "暂无使用历史",
      });
    } catch (error) {
      this.setData({ history: [], error: errorMessage(error) });
    } finally {
      this.setData({ loading: false });
    }
  },
  onRetry() {
    this.load();
  },
  onOpen(event) {
    const tool = event.currentTarget.dataset.tool;
    if (tool && tool.route) wx.navigateTo({ url: tool.route });
  },
  onClear() {
    wx.showModal({
      title: "清除使用历史",
      content: "不会影响累计使用次数和常用工具。",
      success: async (result) => {
        if (!result.confirm) return;
        try {
          await clearHistory();
          this.load();
        } catch (error) {
          wx.showToast({ title: errorMessage(error), icon: "none" });
        }
      },
    });
  },
});
