const INITIAL_TOOL = {
  toolId: "image-repair",
  name: "图片去水印",
  description: "本地手动标记并修复图片局部区域",
  icon: "image-repair",
  symbol: "修",
  route: "/pages/image-repair/image-repair",
  isEnabled: true,
  sortOrder: 10,
  totalUseCount: 0,
  lastUsedAt: null,
  categoryId: "image",
  categoryName: "图片处理",
  categorySymbol: "图",
  categoryOrder: 10,
};

function toPublicTool(tool) {
  return {
    toolId: tool.toolId,
    name: tool.name,
    description: tool.description,
    icon: tool.icon,
    symbol: tool.symbol,
    route: tool.route,
    categoryId: tool.categoryId,
    categoryName: tool.categoryName,
    categorySymbol: tool.categorySymbol,
    categoryOrder: tool.categoryOrder,
  };
}

function createToolsService({ repository, now = () => new Date() }) {
  async function ensureCatalog() {
    await repository.ensureTool({ ...INITIAL_TOOL, createdAt: now(), updatedAt: now() });
  }

  return {
    async listCatalog() {
      await ensureCatalog();
      const tools = await repository.listEnabledCatalog();
      return { tools: tools.map(toPublicTool) };
    },

    async listHome(openid, pagination) {
      await ensureCatalog();
      const personalTools = await repository.listPersonalRanked(openid, pagination);
      const hasPersonalUsage = personalTools.length || await repository.hasPersonalUsage(openid);
      const source = hasPersonalUsage ? "personal" : "global";
      const tools = hasPersonalUsage ? personalTools : await repository.listGlobalRanked(pagination);
      return { tools: tools.map(toPublicTool), source };
    },

    async recordUse(openid, toolId) {
      await ensureCatalog();
      return repository.recordUse(openid, toolId, now());
    },
  };
}

module.exports = { INITIAL_TOOL, createToolsService, toPublicTool };
