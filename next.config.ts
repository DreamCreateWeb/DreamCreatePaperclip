import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
};

export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
