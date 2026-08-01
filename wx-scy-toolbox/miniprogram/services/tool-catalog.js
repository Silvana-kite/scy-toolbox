const { callCloudFunction } = require("./cloud");

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CATALOG_CACHE_KEY = "scy-tools-catalog-cache";
const HOME_CACHE_KEY = "scy-tools-home-cache";

function readFreshCache(key) {
  const cache = wx.getStorageSync(key);
  if (!cache || !cache.savedAt || !cache.data) {
    return null;
  }
  if (Date.now() - cache.savedAt > CACHE_MAX_AGE_MS) {
    return null;
  }
  return cache.data;
}

function writeCache(key, data) {
  try {
    wx.setStorageSync(key, { savedAt: Date.now(), data });
  } catch (error) {
    console.warn("工具目录缓存写入失败", error);
  }
}

async function loadWithCache({ action, data, cacheKey }) {
  try {
    const result = await callCloudFunction("tools", { action, ...data });
    writeCache(cacheKey, result.data);
    return { ...result.data, fromCache: false };
  } catch (error) {
    const cached = readFreshCache(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }
    throw error;
  }
}

function loadCatalog() {
  return loadWithCache({
    action: "listCatalog",
    data: {},
    cacheKey: CATALOG_CACHE_KEY,
  });
}

function loadHome() {
  return loadWithCache({
    action: "listHome",
    data: { limit: 10, offset: 0 },
    cacheKey: HOME_CACHE_KEY,
  });
}

function recordToolUse(toolId) {
  return callCloudFunction("tools", { action: "recordUse", toolId });
}

module.exports = {
  CACHE_MAX_AGE_MS,
  loadCatalog,
  loadHome,
  readFreshCache,
  recordToolUse,
};
