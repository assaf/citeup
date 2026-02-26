import { format } from "node:util";

/**
 * Suppress expected browser warnings in tests - these don't affect functionality
 */
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = format(...args);
  if (
    // React hydration warnings from Playwright interactions
    message.includes("A tree hydrated but some attributes") ||
    message.includes("hydration mismatch") ||
    // Vite HMR manifest patch failures (dev server interruptions)
    message.includes("Failed to fetch manifest patches") ||
    message.includes("fetchAndApplyManifestPatches") ||
    // Vite optimize dep warnings (dev server interruptions)
    message.includes("status of 504 (Outdated Optimize Dep)")
  )
    return; // Suppress expected console.error messages
  originalConsoleError(...args);
};
