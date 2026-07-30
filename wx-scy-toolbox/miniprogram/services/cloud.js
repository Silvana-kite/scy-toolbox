/**
 * The only client entry point for future CloudBase function calls.
 * Keep database access inside cloud functions, never in page code.
 */
const callCloudFunction = async (name, data = {}) => {
  const response = await wx.cloud.callFunction({ name, data });
  const result = response.result;

  if (!result || result.success !== true) {
    throw new Error(result?.message || "Cloud function request failed");
  }

  return result;
};

module.exports = { callCloudFunction };
