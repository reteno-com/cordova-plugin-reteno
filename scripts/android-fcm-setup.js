/*
 * Cordova hook: ensure Firebase/FCM prerequisites for Reteno on Android.
 *
 * What it does (idempotent):
 * - Copies google-services.json into platforms/android/app/ if found in common locations
 * - Ensures Google Services Gradle plugin is applied (classpath + apply plugin)
 */

const fs = require('fs');
const path = require('path');

function exists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (_) {
    return false;
  }
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, text) {
  fs.writeFileSync(filePath, text, 'utf8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function upsertLineOnce(text, needle, insertAfterRe, lineToInsert) {
  if (text.includes(needle)) return { text, changed: false };

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (insertAfterRe.test(lines[i])) {
      lines.splice(i + 1, 0, lineToInsert);
      return { text: lines.join('\n'), changed: true };
    }
  }

  // If we can't find the insertion point, append at end (best-effort).
  return { text: `${text.replace(/\s*$/, '')}\n${lineToInsert}\n`, changed: true };
}

function ensureGoogleServicesClasspath(platformsAndroidBuildGradlePath, googleServicesVersion) {
  if (!exists(platformsAndroidBuildGradlePath)) return false;

  const hasClasspath = (text) =>
    /classpath\s+['"]com\.google\.gms:google-services:/.test(text);

  const original = readText(platformsAndroidBuildGradlePath);
  if (hasClasspath(original)) return false;

  // Try to insert into buildscript { dependencies { ... } }
  // Common Cordova pattern: buildscript { repositories { ... } dependencies { ... } }
  const classpathLine = `        classpath 'com.google.gms:google-services:${googleServicesVersion}'`;

  // Prefer inserting after the line that opens the buildscript dependencies block.
  const result = upsertLineOnce(
    original,
    classpathLine,
    /^\s*dependencies\s*\{\s*$/,
    classpathLine
  );

  if (result.changed) {
    writeText(platformsAndroidBuildGradlePath, result.text);
    return true;
  }

  return false;
}

function ensureGoogleServicesApplied(platformsAndroidAppBuildGradlePath) {
  if (!exists(platformsAndroidAppBuildGradlePath)) return false;

  const guardNeedle = "plugins.hasPlugin('com.google.gms.google-services')";
  const original = readText(platformsAndroidAppBuildGradlePath);
  if (original.includes(guardNeedle)) return false;

  // Cordova's template may already contain a conditional apply based on cordovaConfig.
  // Add our own guard so the plugin is applied whenever google-services.json exists.
  const appended = `${original.replace(/\s*$/, '')}\n\nif (!project.plugins.hasPlugin('com.google.gms.google-services')) {\n    apply plugin: 'com.google.gms.google-services'\n}\n`;
  writeText(platformsAndroidAppBuildGradlePath, appended);
  return true;
}

function findGoogleServicesJson(projectRoot) {
  const candidates = [
    path.join(projectRoot, 'google-services.json'),
    path.join(projectRoot, 'resources', 'google-services.json'),
    path.join(projectRoot, 'resources', 'android', 'google-services.json'),
  ];

  for (const candidate of candidates) {
    if (exists(candidate)) return candidate;
  }

  return null;
}

function copyGoogleServicesJson(projectRoot, platformsAndroidAppDir) {
  const src = findGoogleServicesJson(projectRoot);
  if (!src) return { copied: false, reason: 'not-found' };

  const dest = path.join(platformsAndroidAppDir, 'google-services.json');
  ensureDir(platformsAndroidAppDir);

  const srcText = readText(src);
  if (exists(dest)) {
    const destText = readText(dest);
    if (destText === srcText) return { copied: false, reason: 'already-same' };
  }

  fs.copyFileSync(src, dest);
  return { copied: true, reason: 'copied' };
}

module.exports = function (context) {
  const projectRoot =
    (context && context.opts && context.opts.projectRoot) ||
    (context && context.opts && context.opts.cordova && context.opts.cordova.project && context.opts.cordova.project.root) ||
    null;

  if (!projectRoot) return;

  const androidPlatformDir = path.join(projectRoot, 'platforms', 'android');
  const androidAppDir = path.join(androidPlatformDir, 'app');
  const platformsAndroidBuildGradlePath = path.join(androidPlatformDir, 'build.gradle');
  const platformsAndroidAppBuildGradlePath = path.join(androidAppDir, 'build.gradle');

  if (!exists(androidPlatformDir)) return;

  // Default Google Services Gradle plugin version.
  // We only add it if the project doesn't already have it.
  const googleServicesVersion = '4.3.15';

  // Only patch Gradle if google-services.json is available.
  // This matches the common Cordova approach used by push SDKs (e.g. OneSignal):
  // if Firebase isn't configured, do not modify build files.
  const googleServicesSrc = findGoogleServicesJson(projectRoot);

  if (!googleServicesSrc) {
    // eslint-disable-next-line no-console
    console.log(
      'cordova-plugin-reteno: Android FCM setup: google-services.json=not-found (skipping google-services Gradle plugin).'
    );
    return;
  }

  const copyResult = copyGoogleServicesJson(projectRoot, androidAppDir);
  const classpathChangedRoot = ensureGoogleServicesClasspath(
    platformsAndroidBuildGradlePath,
    googleServicesVersion
  );
  const classpathChangedApp = ensureGoogleServicesClasspath(
    platformsAndroidAppBuildGradlePath,
    googleServicesVersion
  );
  const applyChanged = ensureGoogleServicesApplied(platformsAndroidAppBuildGradlePath);

  // eslint-disable-next-line no-console
  console.log(
    [
      'cordova-plugin-reteno: Android FCM setup:',
      `google-services.json=${copyResult.reason}`,
      `google-services-classpath=${classpathChangedRoot || classpathChangedApp ? 'added' : 'ok'}`,
      `google-services-apply=${applyChanged ? 'added' : 'ok'}`,
    ].join(' ')
  );
};
