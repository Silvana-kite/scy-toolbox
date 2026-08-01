const COLLECTION = "users";

function createUsersRepository(database) {
  const collection = database.collection(COLLECTION);

  return {
    async findByOpenid(openid) {
      const result = await collection.where({ openid }).limit(1).get();
      return result.data[0] || null;
    },

    async add(user) {
      return collection.add({ data: user });
    },

    async updateActivity(id, timestamp, timestampKey, consent) {
      return collection.doc(id).update({
        data: {
          loginCount: database.command.inc(1),
          lastActiveAt: timestamp,
          lastActiveAtKey: timestampKey,
          updatedAt: timestamp,
          updatedAtKey: timestampKey,
          ...(consent
            ? {
              consentVersion: consent.version,
              imageRightsConfirmed: true,
              consentedAt: timestamp,
              consentedAtKey: timestampKey,
            }
            : {}),
        },
      });
    },

    async updateProfile(id, profile, timestamp, timestampKey) {
      return collection.doc(id).update({
        data: {
          ...profile,
          updatedAt: timestamp,
          updatedAtKey: timestampKey,
        },
      });
    },
  };
}

module.exports = { COLLECTION, createUsersRepository };
