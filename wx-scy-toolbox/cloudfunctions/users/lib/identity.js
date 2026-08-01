const crypto = require("crypto");
const { formatUserIdTime } = require("./time");

function createUserId(createdAt) {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `U${formatUserIdTime(createdAt)}${suffix}`;
}

module.exports = { createUserId };
