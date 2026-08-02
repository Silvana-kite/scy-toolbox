const REQUEST_ID = /^[a-zA-Z0-9_-]{12,128}$/;

function validateRequestId(value) {
  if (typeof value !== "string" || !REQUEST_ID.test(value)) throw new Error("请求标识无效");
  return value;
}

function createPersonalToolsService({ repository, now = () => new Date() }) {
  return {
    getOverview(owner) { return repository.getOverview(owner); },
    getFavoriteStatus(owner, toolId) { return repository.getFavoriteStatus(owner, toolId); },
    listFavorites(owner, pagination) { return repository.listFavorites(owner, pagination); },
    addFavorite(owner, toolId) { return repository.addFavorite(owner, toolId, now()); },
    removeFavorite(owner, toolId) { return repository.removeFavorite(owner, toolId, now()); },
    listHistory(owner, pagination) { return repository.listHistory(owner, pagination); },
    clearHistory(owner) { return repository.clearHistory(owner); },
    recordUse(owner, toolId, requestId) { return repository.recordUse(owner, toolId, validateRequestId(requestId), now()); },
  };
}

module.exports = { createPersonalToolsService, validateRequestId };
