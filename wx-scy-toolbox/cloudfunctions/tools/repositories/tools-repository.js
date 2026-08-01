const TOOLS_COLLECTION = "tools";
const TOOL_USAGES_COLLECTION = "tool_usages";
const DEDUPE_WINDOW_MS = 5000;

function createUsageId(openid, toolId) {
  return `usage_${openid}_${toolId}`;
}

function getDocumentOrNull(reference) {
  return reference.get()
    .then((result) => result.data || null)
    .catch((error) => {
      const message = error && error.message ? error.message : "";
      if (/not found|does not exist/i.test(message)) {
        return null;
      }
      throw error;
    });
}

function createToolsRepository(database) {
  const tools = database.collection(TOOLS_COLLECTION);
  const usages = database.collection(TOOL_USAGES_COLLECTION);

  return {
    async ensureTool(tool) {
      const existing = await getDocumentOrNull(tools.doc(tool.toolId));
      if (!existing) {
        await tools.doc(tool.toolId).set({ data: { ...tool, _id: tool.toolId } });
      }
    },

    async listEnabledCatalog() {
      const result = await tools
        .where({ isEnabled: true })
        .orderBy("categoryOrder", "asc")
        .orderBy("sortOrder", "asc")
        .limit(100)
        .get();
      return result.data;
    },

    async listGlobalRanked({ limit, offset }) {
      const result = await tools
        .where({ isEnabled: true })
        .orderBy("totalUseCount", "desc")
        .orderBy("lastUsedAt", "desc")
        .skip(offset)
        .limit(limit)
        .get();
      return result.data;
    },

    async listPersonalRanked(openid, { limit, offset }) {
      const ranked = await usages
        .where({ openid })
        .orderBy("useCount", "desc")
        .orderBy("lastUsedAt", "desc")
        .skip(offset)
        .limit(limit)
        .get();
      const usageRecords = ranked.data;
      if (!usageRecords.length) {
        return [];
      }

      const toolIds = usageRecords.map((usage) => usage.toolId);
      const command = database.command;
      const catalogResult = await tools
        .where({ toolId: command.in(toolIds), isEnabled: true })
        .get();
      const toolsById = new Map(catalogResult.data.map((tool) => [tool.toolId, tool]));
      return toolIds.map((toolId) => toolsById.get(toolId)).filter(Boolean);
    },

    async hasPersonalUsage(openid) {
      const result = await usages.where({ openid }).limit(1).get();
      return result.data.length > 0;
    },

    async recordUse(openid, toolId, timestamp) {
      const usageId = createUsageId(openid, toolId);
      return database.runTransaction(async (transaction) => {
        const tool = await getDocumentOrNull(transaction.collection(TOOLS_COLLECTION).doc(toolId));
        if (!tool || tool.isEnabled !== true) {
          throw new Error("Tool is unavailable");
        }

        const usageReference = transaction.collection(TOOL_USAGES_COLLECTION).doc(usageId);
        const usage = await getDocumentOrNull(usageReference);
        const lastCountedAt = usage && usage.lastCountedAt ? new Date(usage.lastCountedAt).getTime() : 0;
        if (lastCountedAt && timestamp.getTime() - lastCountedAt < DEDUPE_WINDOW_MS) {
          return { counted: false, toolId, totalUseCount: Number(tool.totalUseCount) || 0 };
        }

        const totalUseCount = (Number(tool.totalUseCount) || 0) + 1;
        await transaction.collection(TOOLS_COLLECTION).doc(toolId).update({
          data: { totalUseCount, lastUsedAt: timestamp, updatedAt: timestamp },
        });

        if (usage) {
          await usageReference.update({
            data: {
              useCount: (Number(usage.useCount) || 0) + 1,
              lastUsedAt: timestamp,
              lastCountedAt: timestamp,
              updatedAt: timestamp,
            },
          });
        } else {
          await usageReference.set({
            data: {
              _id: usageId,
              openid,
              toolId,
              useCount: 1,
              firstUsedAt: timestamp,
              lastUsedAt: timestamp,
              lastCountedAt: timestamp,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          });
        }
        return { counted: true, toolId, totalUseCount };
      });
    },
  };
}

module.exports = {
  DEDUPE_WINDOW_MS,
  TOOL_USAGES_COLLECTION,
  TOOLS_COLLECTION,
  createToolsRepository,
  createUsageId,
};
