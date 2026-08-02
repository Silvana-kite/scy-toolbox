const { errorMessage, flushPendingUses, listFavorites, removeFavorite } = require("../../services/personal-tools");

Page({
  data: { tools: [], loading: true, error: "", emptyText: "暂无收藏" },
  onShow() { this.load(); },
  async load() {
    this.setData({ loading: true, error: "" });
    await flushPendingUses();
    try { const result = await listFavorites(); this.setData({ tools: result.tools || [], emptyText: "暂无收藏" }); }
    catch (error) { this.setData({ tools: [], error: errorMessage(error) }); }
    finally { this.setData({ loading: false }); }
  },
  onRetry() { this.load(); },
  onOpen(event) { const tool = event.currentTarget.dataset.tool; if (tool && tool.route) wx.navigateTo({ url: tool.route }); },
  async onRemove(event) {
    try { await removeFavorite(event.currentTarget.dataset.toolId); await this.load(); }
    catch (error) { wx.showToast({ title: errorMessage(error), icon: "none" }); }
  },
});
