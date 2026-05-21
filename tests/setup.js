/**
 * Jest global setup.
 *
 * The plugin code intentionally re-throws inside `.catch()` on a derived
 * promise chain (for callback-style callers). Those re-throws surface as
 * unhandled rejections in Node's strict mode. We only suppress rejections
 * whose reason is a *known* test-sentinel value; any other unhandled
 * rejection is re-thrown so real bugs are not hidden.
 */

/** Sentinel string values used in tests that trigger the plugin's re-throw path. */
const KNOWN_TEST_REJECTIONS = new Set(['bridge-error', 'init-fail', 'no-notification']);

/** Sentinel Error messages for tests where the plugin rejects with an Error object. */
const KNOWN_TEST_ERROR_MESSAGES = new Set([
  'iOS supports lifecycleTrackingOptions only during init(...) before SDK initialization.',
]);

process.on('unhandledRejection', (reason) => {
  // Swallow only the known re-throw patterns from the plugin's callback path.
  if (KNOWN_TEST_REJECTIONS.has(reason)) return;
  if (reason instanceof Error && KNOWN_TEST_ERROR_MESSAGES.has(reason.message)) return;
  // Surface unexpected rejections so they fail the test run.
  throw reason;
});
