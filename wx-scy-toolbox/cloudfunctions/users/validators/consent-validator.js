const CONSENT_VERSION = "2026-08-02";

function validateConsent(consent) {
  if (!consent || typeof consent !== "object" || Array.isArray(consent)) {
    throw new Error("Consent is required before creating a user");
  }

  if (consent.version !== CONSENT_VERSION || consent.imageRightsConfirmed !== true) {
    throw new Error("Valid image-rights consent is required");
  }

  return {
    version: CONSENT_VERSION,
    imageRightsConfirmed: true,
  };
}

module.exports = { CONSENT_VERSION, validateConsent };
