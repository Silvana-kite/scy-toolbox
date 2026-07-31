/**
 * Shared runtime configuration for the mini program.
 * Copy project.local.example.js to project.local.js and set the CloudBase env ID.
 */
const projectConfig = require("./project.local");

if (!projectConfig.envId || projectConfig.envId === "your-cloudbase-environment-id") {
  throw new Error(
    "Missing CloudBase envId. Copy config/project.local.example.js to config/project.local.js and configure it."
  );
}

module.exports = {
  envId: projectConfig.envId,
  environmentLabel: projectConfig.environmentLabel || projectConfig.envId,
};
