const cloud = require("wx-server-sdk");
const { createUsersRepository } = require("./repositories/users-repository");
const { createUsersService } = require("./services/users-service");
const { validateProfileUpdate } = require("./validators/profile-validator");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const repository = createUsersRepository(cloud.database());
const usersService = createUsersService({ repository });

exports.main = async (event = {}) => {
  try {
    const { OPENID: openid } = cloud.getWXContext();
    if (!openid) {
      throw new Error("Unable to identify the current user");
    }

    switch (event.action) {
      case "bootstrap":
        return {
          success: true,
          data: await usersService.bootstrap(openid),
        };
      case "updateProfile":
        return {
          success: true,
          data: await usersService.updateProfile(
            openid,
            validateProfileUpdate(event.profile)
          ),
        };
      default:
        return {
          success: false,
          message: "Unsupported users action",
        };
    }
  } catch (error) {
    console.error("users cloud function failed", error);
    return {
      success: false,
      message: error && error.message ? error.message : "User request failed",
    };
  }
};
