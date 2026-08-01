const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const TIME_ZONE = "Asia/Shanghai";
const DATE_KEY_FORMAT = "YYYY-MM-DD HH:mm:ss";
const USER_ID_TIME_FORMAT = "YYYYMMDDHHmmss";

function formatDateKey(date) {
  return dayjs(date).tz(TIME_ZONE).format(DATE_KEY_FORMAT);
}

function formatUserIdTime(date) {
  return dayjs(date).tz(TIME_ZONE).format(USER_ID_TIME_FORMAT);
}

function formatDefaultNickname(createdAt) {
  return `SCY用户${formatDateKey(createdAt)}`;
}

module.exports = {
  DATE_KEY_FORMAT,
  TIME_ZONE,
  formatDateKey,
  formatDefaultNickname,
  formatUserIdTime,
};
