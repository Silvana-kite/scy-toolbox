const { callCloudFunction } = require("./cloud");

const PENDING_KEY = "scy-pending-tool-uses-v1";
const PENDING_LIMIT = 20;
const PENDING_AGE_MS = 20 * 60 * 60 * 1000;

function requestId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

function errorMessage(error) {
  const message = error && error.message ? error.message : "个人数据服务暂不可用";
  if (/Unsupported tools action|集合|collection|Current user is unavailable/i.test(message)) return "个人数据服务尚未部署或用户未初始化，请更新 tools 云函数和数据库集合";
  if (/Tool is unavailable/i.test(message)) return "工具已下线，无法继续收藏或记录使用";
  return message;
}

async function currentUser() {
  const app = getApp();
  const user = await (app.globalData.userReady || Promise.resolve(app.globalData.user));
  if (!user || user.isGuest || !user.userId) throw new Error("用户身份尚未初始化，请联网后重试");
  return user;
}

async function call(action, data = {}) {
  await currentUser();
  return callCloudFunction("tools", { action, ...data }).then((result) => result.data);
}

function readPending() {
  const value = wx.getStorageSync(PENDING_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item.toolId === "string" && typeof item.requestId === "string" && Date.now() - Number(item.createdAt) < PENDING_AGE_MS).slice(-PENDING_LIMIT);
}

function writePending(items) {
  wx.setStorageSync(PENDING_KEY, items.slice(-PENDING_LIMIT));
}

async function flushPendingUses() {
  try { await currentUser(); } catch (error) { return { synced: 0, error: errorMessage(error) }; }
  const pending = readPending();
  const remaining = [];
  let synced = 0;
  let latestError = "";
  for (const item of pending) {
    try { await call("recordUse", { toolId: item.toolId, requestId: item.requestId }); synced += 1; } catch (error) { remaining.push(item); latestError = errorMessage(error); }
  }
  writePending(remaining);
  return { synced, error: latestError };
}

async function recordSuccessfulUse(toolId) {
  await currentUser();
  const item = { toolId, requestId: requestId(), createdAt: Date.now() };
  writePending([...readPending(), item]);
  const result = await flushPendingUses();
  const stillPending = readPending().some((entry) => entry.requestId === item.requestId);
  if (stillPending) throw new Error(result.error || "使用记录未同步，将在网络恢复后重试");
  return { synced: true };
}

function getOverview() { return call("getOverview"); }
function getFavoriteStatus(toolId) { return call("getFavoriteStatus", { toolId }); }
function listFavorites(limit = 50, offset = 0) { return call("listFavorites", { limit, offset }); }
function addFavorite(toolId) { return call("addFavorite", { toolId }); }
function removeFavorite(toolId) { return call("removeFavorite", { toolId }); }
function listHistory(limit = 50, offset = 0) { return call("listHistory", { limit, offset }); }
function clearHistory() { return call("clearHistory"); }

module.exports = { addFavorite, clearHistory, errorMessage, flushPendingUses, getFavoriteStatus, getOverview, listFavorites, listHistory, recordSuccessfulUse, removeFavorite };
