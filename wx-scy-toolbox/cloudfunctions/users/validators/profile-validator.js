const MAX_NICKNAME_LENGTH = 30;

function validateNickname(value) {
  if (typeof value !== "string") {
    throw new Error("Nickname must be text");
  }

  const nickname = value.trim();
  if (!nickname || nickname.length > MAX_NICKNAME_LENGTH) {
    throw new Error(`Nickname must be 1-${MAX_NICKNAME_LENGTH} characters`);
  }
  return nickname;
}

function validateAvatarFileId(fileId, userId) {
  if (typeof fileId !== "string" || !fileId.startsWith("cloud://")) {
    throw new Error("Avatar must be a CloudBase file ID");
  }

  const expectedPath = `/avatars/${userId}/avatar.png`;
  if (!fileId.endsWith(expectedPath)) {
    throw new Error("Avatar path does not belong to the current user");
  }
  return fileId;
}

function validateProfileUpdate(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new Error("Profile update is required");
  }

  const validated = {};
  if (Object.prototype.hasOwnProperty.call(profile, "nickname")) {
    validated.nickname = validateNickname(profile.nickname);
  }
  if (Object.prototype.hasOwnProperty.call(profile, "avatarFileId")) {
    if (typeof profile.avatarFileId !== "string") {
      throw new Error("Avatar must be a CloudBase file ID");
    }
    validated.avatarFileId = profile.avatarFileId;
  }
  if (!Object.keys(validated).length) {
    throw new Error("No supported profile fields were supplied");
  }

  return validated;
}

module.exports = {
  MAX_NICKNAME_LENGTH,
  validateAvatarFileId,
  validateNickname,
  validateProfileUpdate,
};
