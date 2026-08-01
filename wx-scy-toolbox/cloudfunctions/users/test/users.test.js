const assert = require("node:assert/strict");
const test = require("node:test");
const { createUserId } = require("../lib/identity");
const { retryWrite } = require("../lib/retry");
const { formatDateKey, formatDefaultNickname } = require("../lib/time");
const { createUsersService } = require("../services/users-service");
const {
  validateAvatarFileId,
  validateNickname,
  validateProfileUpdate,
} = require("../validators/profile-validator");

test("formats user dates in Asia/Shanghai", () => {
  const createdAt = new Date("2026-07-31T13:35:05.000Z");

  assert.equal(formatDateKey(createdAt), "2026-07-31 21:35:05");
  assert.equal(formatDefaultNickname(createdAt), "SCY用户2026-07-31 21:35:05");
});

test("creates a unique business user ID with a timestamp prefix", () => {
  const userId = createUserId(new Date("2026-07-31T13:35:05.000Z"));

  assert.match(userId, /^U20260731213505[0-9A-F]{8}$/);
});

test("validates profile input and avatar ownership", () => {
  assert.equal(validateNickname("  SCY  "), "SCY");
  assert.deepEqual(validateProfileUpdate({ nickname: "SCY" }), { nickname: "SCY" });
  assert.equal(
    validateAvatarFileId("cloud://env-id.123/avatars/U20260731213505ABC/avatar.png", "U20260731213505ABC"),
    "cloud://env-id.123/avatars/U20260731213505ABC/avatar.png"
  );
  assert.throws(() => validateNickname(""));
  assert.throws(() => validateProfileUpdate({ status: "active" }));
  assert.throws(() => validateAvatarFileId("cloud://env-id.123/avatars/another/avatar.png", "U20260731213505ABC"));
});

test("retries writes with 100ms, 200ms, and 400ms backoff", async () => {
  let attempts = 0;
  const delays = [];
  const value = await retryWrite(
    async () => {
      attempts += 1;
      if (attempts < 4) {
        throw new Error("temporary failure");
      }
      return "saved";
    },
    { sleep: async (delay) => delays.push(delay) }
  );

  assert.equal(value, "saved");
  assert.equal(attempts, 4);
  assert.deepEqual(delays, [100, 200, 400]);
});

test("bootstraps once and updates activity on later launches", async () => {
  const records = [];
  const repository = {
    async findByOpenid(openid) {
      return records.find((record) => record.openid === openid) || null;
    },
    async add(user) {
      const record = { ...user, _id: "user-record-1" };
      records.push(record);
      return { _id: record._id };
    },
    async updateActivity(id, timestamp, timestampKey) {
      const record = records.find((item) => item._id === id);
      record.loginCount += 1;
      record.lastActiveAt = timestamp;
      record.lastActiveAtKey = timestampKey;
      record.updatedAt = timestamp;
      record.updatedAtKey = timestampKey;
    },
    async updateProfile() {},
  };
  const dates = [
    new Date("2026-07-31T13:35:05.000Z"),
    new Date("2026-07-31T13:36:05.000Z"),
  ];
  const service = createUsersService({
    repository,
    now: () => dates.shift() || new Date("2026-07-31T13:36:05.000Z"),
    createId: () => "U20260731213505ABCDEF12",
    writeWithRetry: (operation) => operation(),
  });

  const first = await service.bootstrap("openid-1");
  const second = await service.bootstrap("openid-1");

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(records.length, 1);
  assert.equal(second.user.loginCount, 2);
  assert.equal(second.user.lastActiveAtKey, "2026-07-31 21:36:05");
  assert.equal(Object.hasOwn(second.user, "openid"), false);
});

test("updates only validated profile fields for the current user", async () => {
  const user = {
    _id: "user-record-1",
    openid: "openid-1",
    userId: "U20260731213505ABCDEF12",
    nickname: "旧昵称",
    avatarFileId: "",
    status: "active",
    loginCount: 1,
    createdAt: new Date("2026-07-31T13:35:05.000Z"),
    createdAtKey: "2026-07-31 21:35:05",
    updatedAt: new Date("2026-07-31T13:35:05.000Z"),
    updatedAtKey: "2026-07-31 21:35:05",
    lastActiveAt: new Date("2026-07-31T13:35:05.000Z"),
    lastActiveAtKey: "2026-07-31 21:35:05",
  };
  let savedProfile;
  const service = createUsersService({
    repository: {
      async findByOpenid() { return user; },
      async updateProfile(id, profile) {
        assert.equal(id, user._id);
        savedProfile = profile;
      },
    },
    now: () => new Date("2026-07-31T13:37:05.000Z"),
    writeWithRetry: (operation) => operation(),
  });

  const result = await service.updateProfile("openid-1", { nickname: "新昵称" });

  assert.deepEqual(savedProfile, { nickname: "新昵称" });
  assert.equal(result.user.nickname, "新昵称");
  assert.equal(result.user.updatedAtKey, "2026-07-31 21:37:05");
  assert.equal(Object.hasOwn(result.user, "openid"), false);
});
