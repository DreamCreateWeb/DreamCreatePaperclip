// Lighthouse CI configuration.
// LHCI_BASE_URL: full origin of the target deployment (default: localhost:3000).
// LHCI_CLINIC_SLUG: clinic slug to audit (default: smile-bright-rogers for local dev).
const baseUrl = process.env.LHCI_BASE_URL || "http://localhost:3000";
const slug = process.env.LHCI_CLINIC_SLUG || "smile-bright-rogers";

/** @type {import('@lhci/cli').LighthouseRcConfig} */
module.exports = {
  ci: {
    collect: {
      url: [
        `${baseUrl}/sites/${slug}`,
        `${baseUrl}/sites/${slug}/services`,
        `${baseUrl}/sites/${slug}/contact`,
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
