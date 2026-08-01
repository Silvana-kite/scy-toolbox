const assert = require("node:assert/strict");
const test = require("node:test");
const { createToolsService, INITIAL_TOOL, toPublicTool } = require("../services/tools-service");
const { createToolsRepository } = require("../repositories/tools-repository");
const { validatePagination, validateToolId } = require("../validators/tools-validator");

function createTool(toolId, overrides = {}) {
  return {
    ...INITIAL_TOOL,
    toolId,
    name: `工具 ${toolId}`,
    route: `/pages/${toolId}/${toolId}`,
    ...overrides,
  };
}

function createMemoryDatabase() {
  const records = new Map();
  const command = { in: (values) => ({ values }) };

  function collectionRecords(name) {
    if (!records.has(name)) {
      records.set(name, new Map());
    }
    return records.get(name);
  }

  function matches(record, filters) {
    return Object.entries(filters).every(([key, value]) => {
      if (value && Array.isArray(value.values)) {
        return value.values.includes(record[key]);
      }
      return record[key] === value;
    });
  }

  function collection(name) {
    const store = collectionRecords(name);
    const reference = {
      doc(id) {
        return {
          async get() {
            if (!store.has(id)) {
              throw new Error("not found");
            }
            return { data: { ...store.get(id) } };
          },
          async set({ data }) { store.set(id, { ...data, _id: id }); },
          async update({ data }) {
            if (!store.has(id)) {
              throw new Error("not found");
            }
            store.set(id, { ...store.get(id), ...data });
          },
        };
      },
      where(filters) {
        let sorters = [];
        let skipped = 0;
        let limited = Infinity;
        return {
          orderBy(field, direction) {
            sorters.push({ field, direction });
            return this;
          },
          skip(value) { skipped = value; return this; },
          limit(value) { limited = value; return this; },
          async get() {
            const data = Array.from(store.values()).filter((record) => matches(record, filters));
            data.sort((left, right) => {
              for (const sorter of sorters) {
                if (left[sorter.field] === right[sorter.field]) continue;
                const comparison = left[sorter.field] > right[sorter.field] ? 1 : -1;
                return sorter.direction === "desc" ? -comparison : comparison;
              }
              return 0;
            });
            return { data: data.slice(skipped, skipped + limited).map((record) => ({ ...record })) };
          },
        };
      },
    };
    return reference;
  }

  return {
    command,
    collection,
    async runTransaction(operation) { return operation({ collection }); },
    records,
  };
}

test("initializes image repair catalog record before public reads", async () => {
  const ensured = [];
  const repository = {
    async ensureTool(tool) { ensured.push(tool); },
    async listEnabledCatalog() { return [INITIAL_TOOL]; },
  };
  const service = createToolsService({
    repository,
    now: () => new Date("2026-08-01T00:00:00.000Z"),
  });

  const result = await service.listCatalog();

  assert.equal(ensured.length, 1);
  assert.equal(ensured[0].toolId, "image-repair");
  assert.equal(ensured[0].totalUseCount, 0);
  assert.deepEqual(result.tools, [toPublicTool(INITIAL_TOOL)]);
  assert.equal(Object.hasOwn(result.tools[0], "isEnabled"), false);
});

test("returns personal ranking before global ranking", async () => {
  const personalTool = createTool("photo-crop", { categoryId: "image" });
  let globalRead = false;
  const service = createToolsService({
    repository: {
      async ensureTool() {},
      async listPersonalRanked(openid, pagination) {
        assert.equal(openid, "openid-1");
        assert.deepEqual(pagination, { limit: 10, offset: 0 });
        return [personalTool];
      },
      async hasPersonalUsage() { return true; },
      async listGlobalRanked() { globalRead = true; return [INITIAL_TOOL]; },
    },
  });

  const result = await service.listHome("openid-1", { limit: 10, offset: 0 });

  assert.equal(result.source, "personal");
  assert.deepEqual(result.tools, [toPublicTool(personalTool)]);
  assert.equal(globalRead, false);
});

test("falls back to global ranking only when a user has no usage records", async () => {
  const globalTool = createTool("photo-compress", { categoryId: "image" });
  const service = createToolsService({
    repository: {
      async ensureTool() {},
      async listPersonalRanked() { return []; },
      async hasPersonalUsage() { return false; },
      async listGlobalRanked(pagination) {
        assert.deepEqual(pagination, { limit: 10, offset: 0 });
        return [globalTool];
      },
    },
  });

  const result = await service.listHome("new-openid", { limit: 10, offset: 0 });

  assert.equal(result.source, "global");
  assert.deepEqual(result.tools, [toPublicTool(globalTool)]);
});

test("keeps personal ranking empty rather than switching to global after a later page", async () => {
  const service = createToolsService({
    repository: {
      async ensureTool() {},
      async listPersonalRanked() { return []; },
      async hasPersonalUsage() { return true; },
      async listGlobalRanked() { throw new Error("should not query global ranking"); },
    },
  });

  const result = await service.listHome("openid-1", { limit: 10, offset: 10 });

  assert.equal(result.source, "personal");
  assert.deepEqual(result.tools, []);
});

test("records a tool opening using only server supplied time", async () => {
  let recorded;
  const now = new Date("2026-08-01T00:00:00.000Z");
  const service = createToolsService({
    repository: {
      async ensureTool() {},
      async recordUse(openid, toolId, timestamp) {
        recorded = { openid, toolId, timestamp };
        return { counted: true, toolId, totalUseCount: 1 };
      },
    },
    now: () => now,
  });

  const result = await service.recordUse("openid-1", "image-repair");

  assert.deepEqual(result, { counted: true, toolId: "image-repair", totalUseCount: 1 });
  assert.deepEqual(recorded, { openid: "openid-1", toolId: "image-repair", timestamp: now });
});

test("validates bounded pagination and public tool IDs", () => {
  assert.deepEqual(validatePagination(), { limit: 10, offset: 0 });
  assert.deepEqual(validatePagination({ limit: 50, offset: 4 }), { limit: 50, offset: 4 });
  assert.equal(validateToolId("image-repair"), "image-repair");
  assert.throws(() => validatePagination({ limit: 51, offset: 0 }));
  assert.throws(() => validatePagination({ limit: 10, offset: -1 }));
  assert.throws(() => validateToolId("../../users"));
});

test("transactionally counts usage, deduplicates five seconds, and rejects disabled tools", async () => {
  const database = createMemoryDatabase();
  const repository = createToolsRepository(database);
  const tools = database.records.get("tools") || new Map();
  database.records.set("tools", tools);
  tools.set("image-repair", { ...INITIAL_TOOL, _id: "image-repair" });
  tools.set("disabled-tool", { ...createTool("disabled-tool"), _id: "disabled-tool", isEnabled: false });

  const startedAt = new Date("2026-08-01T00:00:00.000Z");
  const first = await repository.recordUse("openid-1", "image-repair", startedAt);
  const duplicate = await repository.recordUse(
    "openid-1",
    "image-repair",
    new Date("2026-08-01T00:00:04.999Z")
  );
  const second = await repository.recordUse(
    "openid-1",
    "image-repair",
    new Date("2026-08-01T00:00:05.000Z")
  );

  const usage = database.records.get("tool_usages").get("usage_openid-1_image-repair");
  assert.deepEqual(first, { counted: true, toolId: "image-repair", totalUseCount: 1 });
  assert.deepEqual(duplicate, { counted: false, toolId: "image-repair", totalUseCount: 1 });
  assert.deepEqual(second, { counted: true, toolId: "image-repair", totalUseCount: 2 });
  assert.equal(tools.get("image-repair").totalUseCount, 2);
  assert.equal(usage.useCount, 2);
  await assert.rejects(
    repository.recordUse("openid-1", "disabled-tool", new Date("2026-08-01T00:00:10.000Z")),
    /Tool is unavailable/
  );
});
