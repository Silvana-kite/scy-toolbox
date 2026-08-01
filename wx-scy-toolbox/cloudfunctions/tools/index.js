const cloud = require("wx-server-sdk");
const { createToolsRepository } = require("./repositories/tools-repository");
const { createToolsService } = require("./services/tools-service");
const { validatePagination, validateToolId } = require("./validators/tools-validator");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const repository = createToolsRepository(cloud.database());
const toolsService = createToolsService({ repository });

exports.main = async (event = {}) => {
  try {
    const { OPENID: openid } = cloud.getWXContext();

    switch (event.action) {
      case "listCatalog":
        return { success: true, data: await toolsService.listCatalog() };
      case "listHome":
        if (!openid) {
          throw new Error("Unable to identify the current user");
        }
        return {
          success: true,
          data: await toolsService.listHome(openid, validatePagination(event)),
        };
      case "recordUse":
        if (!openid) {
          throw new Error("Unable to identify the current user");
        }
        return {
          success: true,
          data: await toolsService.recordUse(openid, validateToolId(event.toolId)),
        };
      default:
        return { success: false, message: "Unsupported tools action" };
    }
  } catch (error) {
    console.error("tools cloud function failed", error);
    return {
      success: false,
      message: error && error.message ? error.message : "Tools request failed",
    };
  }
};
