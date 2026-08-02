const cloud = require("wx-server-sdk");
const { createToolsRepository } = require("./repositories/tools-repository");
const { createPersonalToolsRepository } = require("./repositories/personal-tools-repository");
const { createToolsService } = require("./services/tools-service");
const { createPersonalToolsService } = require("./services/personal-tools-service");
const { validatePagination, validateToolId } = require("./validators/tools-validator");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const database = cloud.database();
const toolsService = createToolsService({ repository: createToolsRepository(database) });
const personalToolsService = createPersonalToolsService({ repository: createPersonalToolsRepository(database) });

async function currentOwner(openid) {
  const result = await database.collection("users").where({ openid }).limit(1).get();
  const user = result.data[0];
  if (!user || user.status !== "active" || !user.userId) throw new Error("当前用户尚未初始化，请先完成授权并重试");
  return { ownerKey: `wx:${user.userId}`, ownerType: "wx", ownerUserId: user.userId };
}

exports.main = async (event = {}) => {
  try {
    const { OPENID: openid } = cloud.getWXContext();
    const requiresOwner = new Set(["listHome", "getOverview", "getFavoriteStatus", "listFavorites", "addFavorite", "removeFavorite", "listHistory", "clearHistory", "recordUse"]);
    const owner = requiresOwner.has(event.action) ? await currentOwner(openid) : null;

    switch (event.action) {
      case "listCatalog":
        return { success: true, data: await toolsService.listCatalog() };
      case "listHome":
        return { success: true, data: await toolsService.listHome(owner.ownerKey, validatePagination(event)) };
      case "getOverview":
        return { success: true, data: await personalToolsService.getOverview(owner) };
      case "getFavoriteStatus":
        return { success: true, data: await personalToolsService.getFavoriteStatus(owner, validateToolId(event.toolId)) };
      case "listFavorites":
        return { success: true, data: { tools: await personalToolsService.listFavorites(owner, validatePagination(event)) } };
      case "addFavorite":
        return { success: true, data: await personalToolsService.addFavorite(owner, validateToolId(event.toolId)) };
      case "removeFavorite":
        return { success: true, data: await personalToolsService.removeFavorite(owner, validateToolId(event.toolId)) };
      case "listHistory":
        return { success: true, data: { history: await personalToolsService.listHistory(owner, validatePagination(event)) } };
      case "clearHistory":
        await personalToolsService.clearHistory(owner);
        return { success: true, data: { success: true } };
      case "recordUse":
        return { success: true, data: await personalToolsService.recordUse(owner, validateToolId(event.toolId), event.requestId) };
      default:
        return { success: false, message: "个人数据服务版本过旧，请重新部署 tools 云函数" };
    }
  } catch (error) {
    console.error("tools cloud function failed", error);
    return { success: false, message: error && error.message ? error.message : "个人数据请求失败，请稍后重试" };
  }
};
