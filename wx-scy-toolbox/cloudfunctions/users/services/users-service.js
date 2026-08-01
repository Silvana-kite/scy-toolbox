const { createUserId } = require("../lib/identity");
const { retryWrite } = require("../lib/retry");
const { formatDateKey, formatDefaultNickname } = require("../lib/time");
const { validateAvatarFileId } = require("../validators/profile-validator");

function toPublicUser(user) {
  return {
    userId: user.userId,
    nickname: user.nickname,
    avatarFileId: user.avatarFileId,
    status: user.status,
    loginCount: user.loginCount,
    createdAt: user.createdAt,
    createdAtKey: user.createdAtKey,
    updatedAt: user.updatedAt,
    updatedAtKey: user.updatedAtKey,
    lastActiveAt: user.lastActiveAt,
    lastActiveAtKey: user.lastActiveAtKey,
    consentVersion: user.consentVersion,
    consentedAt: user.consentedAt,
    consentedAtKey: user.consentedAtKey,
  };
}

function createNewUser(openid, createdAt, createId, consent) {
  const timestampKey = formatDateKey(createdAt);
  return {
    openid,
    userId: createId(createdAt),
    nickname: formatDefaultNickname(createdAt),
    avatarFileId: "",
    status: "active",
    schemaVersion: 1,
    loginCount: 1,
    createdAt,
    createdAtKey: timestampKey,
    updatedAt: createdAt,
    updatedAtKey: timestampKey,
    lastActiveAt: createdAt,
    lastActiveAtKey: timestampKey,
    consentVersion: consent.version,
    imageRightsConfirmed: true,
    consentedAt: createdAt,
    consentedAtKey: timestampKey,
  };
}

function createUsersService({
  repository,
  now = () => new Date(),
  createId = createUserId,
  writeWithRetry = retryWrite,
}) {
  async function touchUser(user, consent) {
    const timestamp = now();
    const timestampKey = formatDateKey(timestamp);
    const loginCount = (Number(user.loginCount) || 0) + 1;
    const shouldRecordConsent =
      user.consentVersion !== consent.version || user.imageRightsConfirmed !== true;
    await writeWithRetry(() => repository.updateActivity(
      user._id,
      timestamp,
      timestampKey,
      shouldRecordConsent ? consent : null
    ));
    return {
      ...user,
      loginCount,
      lastActiveAt: timestamp,
      lastActiveAtKey: timestampKey,
      updatedAt: timestamp,
      updatedAtKey: timestampKey,
      ...(shouldRecordConsent
        ? {
          consentVersion: consent.version,
          imageRightsConfirmed: true,
          consentedAt: timestamp,
          consentedAtKey: timestampKey,
        }
        : {}),
    };
  }

  return {
    async bootstrap(openid, consent) {
      const existingUser = await repository.findByOpenid(openid);
      if (existingUser) {
        const user = await touchUser(existingUser, consent);
        return { user: toPublicUser(user), created: false };
      }

      const result = await writeWithRetry(async () => {
        const racedUser = await repository.findByOpenid(openid);
        if (racedUser) {
          return { user: racedUser, created: false };
        }

        const user = createNewUser(openid, now(), createId, consent);
        const writeResult = await repository.add(user);
        return { user: { ...user, _id: writeResult._id }, created: true };
      });

      const user = result.created ? result.user : await touchUser(result.user, consent);
      return { user: toPublicUser(user), created: result.created };
    },

    async updateProfile(openid, profile) {
      const user = await repository.findByOpenid(openid);
      if (!user) {
        throw new Error("User profile does not exist");
      }

      if (Object.prototype.hasOwnProperty.call(profile, "avatarFileId")) {
        profile.avatarFileId = validateAvatarFileId(profile.avatarFileId, user.userId);
      }

      const timestamp = now();
      const timestampKey = formatDateKey(timestamp);
      await writeWithRetry(() => repository.updateProfile(user._id, profile, timestamp, timestampKey));

      return {
        user: toPublicUser({
          ...user,
          ...profile,
          updatedAt: timestamp,
          updatedAtKey: timestampKey,
        }),
      };
    },
  };
}

module.exports = { createNewUser, createUsersService, toPublicUser };
