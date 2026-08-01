const projectConfig = require("./config/project");
const { callCloudFunction } = require("./services/cloud");

function createGuestUser() {
  return {
    userId: `temp_${Date.now().toString(36)}`,
    nickname: "访客",
    avatarFileId: "",
    isGuest: true,
  };
}

App({
  onLaunch: function () {
    this.globalData = {
      env: projectConfig.envId,
      user: null,
      userReady: null,
      isInitializingUser: false,
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
    this.initializeUser();
  },

  setCurrentUser: function (user) {
    this.globalData.user = user;
    return user;
  },

  initializeUser: function () {
    if (this.globalData.isInitializingUser) {
      return this.globalData.userReady;
    }

    this.globalData.isInitializingUser = true;
    const userRequest = !wx.cloud
      ? Promise.resolve(createGuestUser())
      : callCloudFunction("users", { action: "bootstrap" })
        .then((result) => result.data.user)
        .catch((error) => {
          console.warn("用户初始化失败，以访客身份继续", error);
          return createGuestUser();
        });

    this.globalData.userReady = userRequest
      .then((user) => {
        return this.setCurrentUser(user);
      })
      .finally(() => {
        this.globalData.isInitializingUser = false;
      });

    return this.globalData.userReady;
  },
});
