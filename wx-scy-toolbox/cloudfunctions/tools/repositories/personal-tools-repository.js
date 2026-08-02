const crypto = require("node:crypto");

const FAVORITES = "tool_favorites";
const HISTORY = "tool_usage_history";
const STATS = "user_tool_stats";
const DEDUP = "tool_request_dedup";
const TOOLS = "tools";
const USAGES = "tool_usages";
const MAX_FAVORITES = 200;
const DEDUPE_WINDOW_MS = 5000;
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000;

function ownerId(owner) { return `${owner.ownerType}_${owner.ownerUserId}`; }
function statsId(owner) { return `stats_${ownerId(owner)}`; }
function favoriteId(owner, toolId) { return `favorite_${ownerId(owner)}_${toolId}`; }
function usageId(owner, toolId) { return `usage_${ownerId(owner)}_${toolId}`; }
function dedupId(owner, toolId, requestId) { return `dedup_${crypto.createHash("sha256").update(`${owner.ownerKey}:${toolId}:${requestId}`).digest("hex")}`; }
function historyId(now) { return `history_${now.toISOString().replace(/[-:.TZ]/g, "")}_${crypto.randomBytes(12).toString("hex")}`; }
function isDedupActive(record, now) { return record && new Date(record.expiresAt).getTime() > now.getTime(); }

function getOrNull(reference) {
  return reference.get().then((result) => result.data || null).catch((error) => {
    if (/not found|does not exist/i.test(error && error.message ? error.message : "")) return null;
    throw error;
  });
}

function toPublicTool(tool, toolId) {
  if (!tool) return { toolId, name: "工具已下线", description: "", icon: "tool", symbol: "工", route: "", available: false };
  return { toolId: tool.toolId, name: tool.name, description: tool.description || "", icon: tool.icon || "tool", symbol: tool.symbol || "工", route: tool.isEnabled ? tool.route : "", available: tool.isEnabled === true };
}

function createPersonalToolsRepository(database) {
  const favorites = database.collection(FAVORITES);
  const history = database.collection(HISTORY);
  const stats = database.collection(STATS);
  const dedup = database.collection(DEDUP);
  const tools = database.collection(TOOLS);
  const usages = database.collection(USAGES);

  async function getStats(owner, transaction) {
    const result = await (transaction || stats).where({ ownerKey: owner.ownerKey }).limit(1).get();
    return result.data[0] || null;
  }

  async function mapTools(toolIds) {
    if (!toolIds.length) return new Map();
    const result = await tools.where({ toolId: database.command.in(toolIds) }).get();
    return new Map(result.data.map((item) => [item.toolId, item]));
  }

  return {
    async getFavoriteStatus(owner, toolId) {
      const result = await favorites.where({ ownerKey: owner.ownerKey, toolId }).limit(1).get();
      return { favorite: Boolean(result.data[0]) };
    },

    async getOverview(owner) {
      const [stat, favoriteResult, historyResult] = await Promise.all([
        getStats(owner),
        favorites.where({ ownerKey: owner.ownerKey }).orderBy("createdAt", "desc").limit(6).get(),
        history.where({ ownerKey: owner.ownerKey }).orderBy("usedAt", "desc").orderBy("_id", "desc").limit(6).get(),
      ]);
      const ids = [...new Set([...favoriteResult.data, ...historyResult.data, stat && stat.topToolId].filter(Boolean).map((item) => typeof item === "string" ? item : item.toolId))];
      const byId = await mapTools(ids);
      return {
        favoriteCount: Number(stat && stat.favoriteCount) || 0,
        usageCount: Number(stat && stat.usageCount) || 0,
        topTool: stat && stat.topToolId ? toPublicTool(byId.get(stat.topToolId), stat.topToolId) : null,
        favoritePreview: favoriteResult.data.map((item) => toPublicTool(byId.get(item.toolId), item.toolId)),
        historyPreview: historyResult.data.map((item) => ({ id: item._id, tool: toPublicTool(byId.get(item.toolId), item.toolId), usedAt: item.usedAt })),
      };
    },

    async listFavorites(owner, pagination) {
      const result = await favorites.where({ ownerKey: owner.ownerKey }).orderBy("createdAt", "desc").skip(pagination.offset).limit(pagination.limit).get();
      const byId = await mapTools(result.data.map((item) => item.toolId));
      return result.data.map((item) => toPublicTool(byId.get(item.toolId), item.toolId));
    },

    async addFavorite(owner, toolId, now) {
      return database.runTransaction(async (transaction) => {
        const toolResult = await transaction.collection(TOOLS).where({ toolId, isEnabled: true }).limit(1).get();
        if (!toolResult.data[0]) throw new Error("工具已下线，无法继续收藏或记录使用");
        const existingResult = await transaction.collection(FAVORITES).where({ ownerKey: owner.ownerKey, toolId }).limit(1).get();
        if (existingResult.data[0]) return { favorite: true };
        const stat = await getStats(owner, transaction.collection(STATS));
        if ((Number(stat && stat.favoriteCount) || 0) >= MAX_FAVORITES) throw new Error("收藏数量已达上限");
        await transaction.collection(FAVORITES).doc(favoriteId(owner, toolId)).set({ data: { ...owner, toolId, createdAt: now } });
        const next = { ...owner, favoriteCount: (Number(stat && stat.favoriteCount) || 0) + 1, usageCount: Number(stat && stat.usageCount) || 0, topToolId: stat ? stat.topToolId || null : null, topToolUseCount: Number(stat && stat.topToolUseCount) || 0, topToolLastUsedAt: stat ? stat.topToolLastUsedAt || null : null, createdAt: stat ? stat.createdAt : now, updatedAt: now };
        if (stat) await transaction.collection(STATS).doc(stat._id).update({ data: next }); else await transaction.collection(STATS).doc(statsId(owner)).set({ data: next });
        return { favorite: true };
      });
    },

    async removeFavorite(owner, toolId, now) {
      return database.runTransaction(async (transaction) => {
        const found = await transaction.collection(FAVORITES).where({ ownerKey: owner.ownerKey, toolId }).limit(1).get();
        const favorite = found.data[0];
        if (!favorite) return { favorite: false };
        await transaction.collection(FAVORITES).doc(favorite._id).remove();
        const stat = await getStats(owner, transaction.collection(STATS));
        if (stat) await transaction.collection(STATS).doc(stat._id).update({ data: { favoriteCount: Math.max(0, (Number(stat.favoriteCount) || 0) - 1), updatedAt: now } });
        return { favorite: false };
      });
    },

    async listHistory(owner, pagination) {
      const result = await history.where({ ownerKey: owner.ownerKey }).orderBy("usedAt", "desc").orderBy("_id", "desc").skip(pagination.offset).limit(pagination.limit).get();
      const byId = await mapTools(result.data.map((item) => item.toolId));
      return result.data.map((item) => ({ id: item._id, tool: toPublicTool(byId.get(item.toolId), item.toolId), usedAt: item.usedAt }));
    },

    async clearHistory(owner) {
      await history.where({ ownerKey: owner.ownerKey }).remove();
    },

    async recordUse(owner, toolId, requestId, now) {
      return database.runTransaction(async (transaction) => {
        const existingDedup = await transaction.collection(DEDUP).where({ ownerKey: owner.ownerKey, toolId, requestId }).limit(1).get();
        if (existingDedup.data[0]) {
          const previous = existingDedup.data[0];
          if (isDedupActive(previous, now)) return { counted: Boolean(previous.counted), historyId: previous.historyId || null, totalUseCount: Number(previous.totalUseCount) || 0 };
          await transaction.collection(DEDUP).doc(previous._id || dedupId(owner, toolId, requestId)).remove();
        }
        const toolResult = await transaction.collection(TOOLS).where({ toolId, isEnabled: true }).limit(1).get();
        const tool = toolResult.data[0];
        if (!tool) throw new Error("工具已下线，无法继续收藏或记录使用");
        const usageResult = await transaction.collection(USAGES).where({ ownerKey: owner.ownerKey, toolId }).limit(1).get();
        const usage = usageResult.data[0];
        const last = usage && usage.lastCountedAt ? new Date(usage.lastCountedAt).getTime() : 0;
        const counted = !last || now.getTime() - last >= DEDUPE_WINDOW_MS;
        const total = Number(tool.totalUseCount) || 0;
        const nextTotal = counted ? total + 1 : total;
        const nextHistoryId = counted ? historyId(now) : null;
        await transaction.collection(DEDUP).doc(dedupId(owner, toolId, requestId)).set({ data: { ownerKey: owner.ownerKey, toolId, requestId, counted, historyId: nextHistoryId, totalUseCount: nextTotal, expiresAt: new Date(now.getTime() + DEDUP_TTL_MS), createdAt: now } });
        if (!counted) return { counted: false, historyId: null, totalUseCount: total };
        const nextCount = (Number(usage && usage.useCount) || 0) + 1;
        const usageData = { ...owner, toolId, useCount: nextCount, firstUsedAt: usage ? usage.firstUsedAt : now, lastUsedAt: now, lastCountedAt: now, createdAt: usage ? usage.createdAt : now, updatedAt: now };
        if (usage) await transaction.collection(USAGES).doc(usage._id).update({ data: usageData }); else await transaction.collection(USAGES).doc(usageId(owner, toolId)).set({ data: usageData });
        await transaction.collection(HISTORY).doc(nextHistoryId).set({ data: { ...owner, toolId, usedAt: now, createdAt: now } });
        await transaction.collection(TOOLS).doc(tool._id || tool.toolId).update({ data: { totalUseCount: nextTotal, lastUsedAt: now, updatedAt: now } });
        const stat = await getStats(owner, transaction.collection(STATS));
        const shouldTop = !stat || nextCount > (Number(stat.topToolUseCount) || 0) || (nextCount === (Number(stat.topToolUseCount) || 0) && now.getTime() >= new Date(stat.topToolLastUsedAt || 0).getTime());
        const statsData = { ...owner, favoriteCount: Number(stat && stat.favoriteCount) || 0, usageCount: (Number(stat && stat.usageCount) || 0) + 1, topToolId: shouldTop ? toolId : stat.topToolId || null, topToolUseCount: shouldTop ? nextCount : Number(stat.topToolUseCount) || 0, topToolLastUsedAt: shouldTop ? now : stat.topToolLastUsedAt || null, createdAt: stat ? stat.createdAt : now, updatedAt: now };
        if (stat) await transaction.collection(STATS).doc(stat._id).update({ data: statsData }); else await transaction.collection(STATS).doc(statsId(owner)).set({ data: statsData });
        return { counted: true, historyId: nextHistoryId, totalUseCount: nextTotal };
      });
    },
  };
}

module.exports = { DEDUPE_WINDOW_MS, MAX_FAVORITES, createPersonalToolsRepository };
