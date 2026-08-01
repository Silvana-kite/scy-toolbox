const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function validateToolId(toolId) {
  if (typeof toolId !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(toolId)) {
    throw new Error("Invalid tool ID");
  }
  return toolId;
}

function parseInteger(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("Pagination parameters must be integers");
  }
  return value;
}

function validatePagination({ limit, offset } = {}) {
  const safeLimit = parseInteger(limit, DEFAULT_LIMIT);
  const safeOffset = parseInteger(offset, 0);
  if (safeLimit < 1 || safeLimit > MAX_LIMIT || safeOffset < 0) {
    throw new Error("Pagination parameters are out of range");
  }
  return { limit: safeLimit, offset: safeOffset };
}

module.exports = { DEFAULT_LIMIT, MAX_LIMIT, validatePagination, validateToolId };
