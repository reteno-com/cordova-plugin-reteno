#!/usr/bin/env node
/**
 * Ensures the NotificationContentExtension (Images Carousel) target exists in the
 * ExampleIonic Xcode project and that the Podfile includes the Reteno pod for it.
 *
 * Run once after `npx cap sync ios`:
 *   node scripts/patch-ios-content-extension.js
 *
 * The script is idempotent — running it multiple times is safe.
 */

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.join(__dirname, '..');
const IOS_ROOT = path.join(APP_ROOT, 'ios', 'App');
const PROJECT_PATH = path.join(IOS_ROOT, 'App.xcodeproj', 'project.pbxproj');
const PODFILE_PATH = path.join(IOS_ROOT, 'Podfile');
const APP_NAME = 'App';
const APP_DIR = path.join(IOS_ROOT, APP_NAME);
const EXTENSION_NAME = 'NotificationContentExtension';
const RETENO_VERSION = (() => {
  try {
    const content = fs.readFileSync(PODFILE_PATH, 'utf8');
    const match = content.match(/pod\s+'Reteno',\s+'([^']+)'/);
    if (match) return match[1];
  } catch (e) {}
  return '2.6.2';
})();
const IOS_BUNDLE_ID = 'com.reteno.example-app';
const NCE_BUNDLE_ID = `${IOS_BUNDLE_ID}.${EXTENSION_NAME}`;
const DEPLOYMENT_TARGET = '15.0';

function log(msg) {
  console.log(`patch-ios-content-extension: ${msg}`);
}

function readFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureFile(filePath, content) {
  const current = readFileIfExists(filePath);
  if (current === content) return false;
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function unquote(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/^"(.*)"$/, '$1');
}

function nonCommentKeys(section) {
  return Object.keys(section || {}).filter((key) => !key.endsWith('_comment'));
}

function findTargetsByName(project, targetName) {
  const targets = project.pbxNativeTargetSection();
  const normalizedName = unquote(targetName);
  return nonCommentKeys(targets)
    .map((uuid) => ({ uuid, target: targets[uuid] }))
    .filter(({ target }) => unquote(target && target.name) === normalizedName);
}

function findTargetByName(project, targetName) {
  return findTargetsByName(project, targetName)[0] || null;
}

function ensureMainAppInfoPlistRef(project) {
  const groups = project.hash.project.objects.PBXGroup || {};
  const appGroupKey = Object.keys(groups).find((k) => {
    if (k.endsWith('_comment')) return false;
    const g = groups[k];
    if (!g) return false;
    const groupName = unquote(g.name || '');
    const groupPath = unquote(g.path || '');
    return groupPath === APP_NAME || groupName === APP_NAME;
  });
  if (!appGroupKey) return false;

  const appGroup = groups[appGroupKey];
  if (!Array.isArray(appGroup.children)) return false;

  const infoChild = appGroup.children.find((c) => String(c.comment || '') === 'Info.plist');
  if (!infoChild || !infoChild.value) return false;

  const refs = project.pbxFileReferenceSection();
  const ref = refs[infoChild.value];
  if (!ref) return false;

  let changed = false;
  if (unquote(ref.path) !== 'Info.plist') {
    ref.path = 'Info.plist';
    changed = true;
  }
  if (ref.sourceTree !== '"<group>"') {
    ref.sourceTree = '"<group>"';
    changed = true;
  }
  if (ref.name) {
    delete ref.name;
    changed = true;
  }
  return changed;
}

function setTargetBuildSettings(project, targetUuid, settings) {
  const nativeTargets = project.pbxNativeTargetSection();
  const configListId = nativeTargets[targetUuid] && nativeTargets[targetUuid].buildConfigurationList;
  if (!configListId) return;

  const configLists = project.pbxXCConfigurationList();
  const configList = configLists[configListId];
  if (!configList || !Array.isArray(configList.buildConfigurations)) return;

  const buildConfigs = project.pbxXCBuildConfigurationSection();
  configList.buildConfigurations.forEach((cfgRef) => {
    const cfg = buildConfigs[cfgRef.value];
    if (!cfg || !cfg.buildSettings) return;
    Object.keys(settings).forEach((key) => {
      cfg.buildSettings[key] = settings[key];
    });
  });
}

function ensureBuildPhase(project, targetUuid, buildPhaseType, comment) {
  const targets = project.pbxNativeTargetSection();
  const target = targets[targetUuid];
  if (!target || !Array.isArray(target.buildPhases)) return;

  const phases = project.hash.project.objects[buildPhaseType] || {};
  const hasPhase = target.buildPhases.some((phaseRef) => {
    const phase = phases[phaseRef.value];
    if (!phase) return false;
    const commentKey = `${phaseRef.value}_comment`;
    return phases[commentKey] === comment;
  });

  if (!hasPhase) {
    project.addBuildPhase([], buildPhaseType, comment, targetUuid);
  }
}

function hasFilePath(project, filePath) {
  return Boolean(project.hasFile(filePath));
}

/**
 * Sets runOnlyForDeploymentPostprocessing = 0 on the "Embed App Extensions"
 * PBXCopyFilesBuildPhase so that extensions are always embedded, not only
 * when installing. This corresponds to unchecking "Copy only when installing"
 * in Xcode's Build Phases UI.
 */
function disableEmbedCopyOnlyWhenInstalling(project) {
  const phases = project.hash.project.objects.PBXCopyFilesBuildPhase || {};
  nonCommentKeys(phases).forEach((key) => {
    const phase = phases[key];
    if (!phase) return;
    const commentKey = `${key}_comment`;
    if (phases[commentKey] === 'Embed App Extensions' || phase.name === '"Embed App Extensions"') {
      phase.runOnlyForDeploymentPostprocessing = 0;
    }
  });
}

function findFirstEmbedAppExtensionsPhase(project) {
  const phases = project.hash.project.objects.PBXCopyFilesBuildPhase || {};
  for (const key of nonCommentKeys(phases)) {
    const phase = phases[key];
    if (!phase) continue;
    const commentKey = `${key}_comment`;
    if (phases[commentKey] === 'Embed App Extensions' || phase.name === '"Embed App Extensions"') {
      return { key, phase, phases };
    }
  }
  return null;
}

function findFileRefByName(project, fileName) {
  const refs = project.pbxFileReferenceSection();
  for (const key of nonCommentKeys(refs)) {
    const ref = refs[key];
    if (!ref) continue;
    const refName = unquote(ref.name);
    const refPath = unquote(ref.path);
    if (refName === fileName || refPath === fileName) {
      return key;
    }
  }
  return null;
}

function ensureAppexInEmbedAppExtensions(project, appexName) {
  const embed = findFirstEmbedAppExtensionsPhase(project);
  if (!embed) return false;

  const { phase } = embed;
  if (!Array.isArray(phase.files)) {
    phase.files = [];
  }

  // Already embedded.
  if (phase.files.some((f) => (f && String(f.comment || '').includes(`${appexName} in Embed App Extensions`)))) {
    return false;
  }

  const fileRefUuid = findFileRefByName(project, appexName);
  if (!fileRefUuid) return false;

  const buildFiles = project.pbxBuildFileSection();
  let template = null;
  for (const bfKey of nonCommentKeys(buildFiles)) {
    const entry = buildFiles[bfKey];
    if (!entry || !entry.fileRef) continue;
    if (String(entry.fileRef).includes('NotificationServiceExtension.appex')) {
      template = entry;
      break;
    }
  }

  const buildFileUuid = project.generateUuid();
  const buildFileComment = `${appexName} in Embed App Extensions`;
  const fileRefComment = `${appexName}`;

  if (template) {
    const cloned = JSON.parse(JSON.stringify(template));
    cloned.fileRef = `${fileRefUuid} /* ${fileRefComment} */`;
    buildFiles[buildFileUuid] = cloned;
  } else {
    buildFiles[buildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: `${fileRefUuid} /* ${fileRefComment} */`,
      settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
    };
  }
  buildFiles[`${buildFileUuid}_comment`] = buildFileComment;

  phase.files.push({
    value: buildFileUuid,
    comment: buildFileComment,
  });

  return true;
}

function removeAppexFromCopyFilesPhases(project, appexName, appTargetUuid) {
  const phases = project.hash.project.objects.PBXCopyFilesBuildPhase || {};
  const buildFiles = project.pbxBuildFileSection();
  const targets = project.pbxNativeTargetSection();
  const appTarget = appTargetUuid ? targets[appTargetUuid] : null;
  let changed = false;

  nonCommentKeys(phases).forEach((phaseKey) => {
    const phase = phases[phaseKey];
    if (!phase || !Array.isArray(phase.files)) return;
    const commentKey = `${phaseKey}_comment`;
    const phaseName = phases[commentKey] || unquote(phase.name);
    if (phaseName !== 'Copy Files' && phaseName !== '"Copy Files"') return;

    const kept = [];
    const removedBuildFileUuids = [];

    phase.files.forEach((fileRef) => {
      const comment = String((fileRef && fileRef.comment) || '');
      if (comment.includes(appexName)) {
        removedBuildFileUuids.push(fileRef.value);
        changed = true;
      } else {
        kept.push(fileRef);
      }
    });

    phase.files = kept;

    removedBuildFileUuids.forEach((uuid) => {
      delete buildFiles[uuid];
      delete buildFiles[`${uuid}_comment`];
    });

    // Remove empty "Copy Files" phase from App target to avoid future duplicates.
    if (phase.files.length === 0 && appTarget && Array.isArray(appTarget.buildPhases)) {
      appTarget.buildPhases = appTarget.buildPhases.filter((bp) => bp.value !== phaseKey);
      delete phases[phaseKey];
      delete phases[commentKey];
      changed = true;
    }
  });

  return changed;
}

/**
 * Inserts the NCE pod target BEFORE the outer closing `end` of the main app target
 * using a greedy regex so it never ends up nested inside the NSE block.
 */
function ensureNcePodTarget(podfilePath, nceExtensionName, retenoVersion) {
  const current = readFileIfExists(podfilePath);
  if (!current) return false;
  if (current.includes(`target '${nceExtensionName}' do`)) return false;

  const nestedBlock =
    `\n  target '${nceExtensionName}' do\n` +
    `    inherit! :search_paths\n` +
    `    pod 'Reteno', '${retenoVersion}'\n` +
    `  end`;

  // Greedy: capture everything in the main App target block and insert NCE before
  // the final outer `end`.
  const mainTargetRegex = new RegExp(`(target '${APP_NAME}' do[\\s\\S]*)(\\nend[\\s]*)$`);
  const match = current.match(mainTargetRegex);
  if (!match) return false;

  const next =
    current.slice(0, match.index) +
    match[1] +
    nestedBlock +
    match[2];

  if (next !== current) {
    fs.writeFileSync(podfilePath, next, 'utf8');
    return true;
  }

  return false;
}

function ensureNCEUserNotificationsUIFramework(podfilePath) {
  const current = readFileIfExists(podfilePath);
  if (!current) return false;

  const markerStart = '  # RETENO_NCE_FRAMEWORKS_START';
  const markerEnd = '  # RETENO_NCE_FRAMEWORKS_END';
  const block =
`${markerStart}
  Dir.glob(File.join(installer.sandbox.root, 'Target Support Files', 'Pods-NotificationContentExtension', '*.xcconfig')).each do |path|
    content = File.read(path)
    next if content.include?('UserNotificationsUI')
    content = content.gsub(/^(OTHER_LDFLAGS\\s*=\\s*.*)$/) { |m| "#{m} -framework \\"UserNotificationsUI\\"" }
    File.write(path, content)
  end
${markerEnd}
`;

  let next = current;

  if (/post_install\s+do\s+\|installer\|/.test(next)) {
    const hasMarkers = next.includes(markerStart) && next.includes(markerEnd);
    if (hasMarkers) {
      const markedBlockRegex = new RegExp(
        `${markerStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${markerEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        'm'
      );
      next = next.replace(markedBlockRegex, block.trimEnd());
    } else {
      next = next.replace(
        /(post_install\s+do\s+\|installer\|\n)/,
        `$1${block}`
      );
    }
  } else {
    next = `${next.trimEnd()}\n\npost_install do |installer|\n${block}end\n`;
  }

  if (next === current) return false;
  fs.writeFileSync(podfilePath, next, 'utf8');
  return true;
}

function main() {
  if (!fs.existsSync(PROJECT_PATH)) {
    log(`Xcode project not found at ${PROJECT_PATH}. Run 'npx cap sync ios' first.`);
    process.exit(1);
  }

  const xcode = require('xcode');
  const project = xcode.project(PROJECT_PATH);
  project.parseSync();

  // ── Ensure NCE source files exist ────────────────────────────────────────────
  const nceDir = path.join(APP_DIR, EXTENSION_NAME);
  ensureDir(nceDir);

  const nceInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDevelopmentRegion</key>
\t<string>$(DEVELOPMENT_LANGUAGE)</string>
\t<key>CFBundleDisplayName</key>
\t<string>${EXTENSION_NAME}</string>
\t<key>CFBundleExecutable</key>
\t<string>$(EXECUTABLE_NAME)</string>
\t<key>CFBundleIdentifier</key>
\t<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
\t<key>CFBundleInfoDictionaryVersion</key>
\t<string>6.0</string>
\t<key>CFBundleName</key>
\t<string>$(PRODUCT_NAME)</string>
\t<key>CFBundlePackageType</key>
\t<string>XPC!</string>
\t<key>CFBundleShortVersionString</key>
\t<string>1.0.0</string>
\t<key>CFBundleVersion</key>
\t<string>413</string>
\t<key>NSExtension</key>
\t<dict>
\t\t<key>NSExtensionAttributes</key>
\t\t<dict>
\t\t\t<key>UNNotificationExtensionCategory</key>
\t\t\t<array>
\t\t\t\t<string>ImageCarousel</string>
\t\t\t\t<string>ImageGif</string>
\t\t\t</array>
\t\t\t<key>UNNotificationExtensionInitialContentSizeRatio</key>
\t\t\t<real>0.5</real>
\t\t\t<key>UNNotificationExtensionUserInteractionEnabled</key>
\t\t\t<true/>
\t\t</dict>
\t\t<key>NSExtensionPointIdentifier</key>
\t\t<string>com.apple.usernotifications.content-extension</string>
\t\t<key>NSExtensionPrincipalClass</key>
\t\t<string>$(PRODUCT_MODULE_NAME).NotificationViewController</string>
\t</dict>
</dict>
</plist>
`;

  const notificationVCSwift = `import Reteno

final class NotificationViewController: RetenoCarouselNotificationViewController {}
`;

  ensureFile(path.join(nceDir, 'Info.plist'), nceInfoPlist);
  ensureFile(path.join(nceDir, 'NotificationViewController.swift'), notificationVCSwift);

  // ── Ensure NCE Xcode target ───────────────────────────────────────────────────
  const existingTargets = findTargetsByName(project, EXTENSION_NAME);
  if (existingTargets.length > 1) {
    throw new Error(
      `Detected ${existingTargets.length} '${EXTENSION_NAME}' targets in the iOS project. ` +
      'Remove duplicates in Xcode and re-run this script.'
    );
  }

  const extensionRelDir = `${APP_NAME}/${EXTENSION_NAME}`;
  let nceTargetUuid;
  const appTarget = findTargetByName(project, APP_NAME);

  if (existingTargets.length === 1) {
    log(`'${EXTENSION_NAME}' target already exists — skipping target creation.`);
    nceTargetUuid = existingTargets[0].uuid;
  } else {
    const newTarget = project.addTarget(
      EXTENSION_NAME,
      'app_extension',
      extensionRelDir,
      NCE_BUNDLE_ID
    );
    nceTargetUuid = newTarget.uuid;
    log(`Added '${EXTENSION_NAME}' target to Xcode project.`);
  }

  ensureBuildPhase(project, nceTargetUuid, 'PBXSourcesBuildPhase', 'Sources');
  ensureBuildPhase(project, nceTargetUuid, 'PBXFrameworksBuildPhase', 'Frameworks');
  ensureBuildPhase(project, nceTargetUuid, 'PBXResourcesBuildPhase', 'Resources');

  // ── Group ─────────────────────────────────────────────────────────────────────
  let nceGroupKey = project.findPBXGroupKey({ name: EXTENSION_NAME });
  if (!nceGroupKey) {
    nceGroupKey = project.pbxCreateGroup(EXTENSION_NAME, `${APP_NAME}/${EXTENSION_NAME}`);
    // Attach to the root app group if present.
    const appGroupKey = project.findPBXGroupKey({ name: APP_NAME });
    if (appGroupKey) {
      project.addToPbxGroup(nceGroupKey, appGroupKey);
    }
  }

  // Normalize file refs so they always resolve from SOURCE_ROOT, not from an implicit group path.
  const nceVcPath = `${extensionRelDir}/NotificationViewController.swift`;
  const fileRefs = project.pbxFileReferenceSection();
  nonCommentKeys(fileRefs).forEach((key) => {
    const ref = fileRefs[key];
    if (!ref || typeof ref.path !== 'string') return;
    const raw = unquote(ref.path);
    if (
      raw === 'NotificationViewController.swift' ||
      raw === `${EXTENSION_NAME}/NotificationViewController.swift` ||
      raw === nceVcPath
    ) {
      ref.path = `"${nceVcPath}"`;
      ref.name = '"NotificationViewController.swift"';
      ref.sourceTree = 'SOURCE_ROOT';
    }
  });

  if (
    !hasFilePath(project, nceVcPath)
  ) {
    project.addSourceFile(
      nceVcPath,
      { target: nceTargetUuid },
      nceGroupKey
    );
  }

  if (
    !hasFilePath(project, `${EXTENSION_NAME}/Info.plist`) &&
    !hasFilePath(project, `${extensionRelDir}/Info.plist`)
  ) {
    project.addFile('Info.plist', nceGroupKey);
  }

  // ── Build settings ────────────────────────────────────────────────────────────
  setTargetBuildSettings(project, nceTargetUuid, {
    PRODUCT_BUNDLE_IDENTIFIER: `"${NCE_BUNDLE_ID}"`,
    INFOPLIST_FILE: `"${extensionRelDir}/Info.plist"`,
    SWIFT_OBJC_BRIDGING_HEADER: '""',
    SWIFT_VERSION: '5.0',
    IPHONEOS_DEPLOYMENT_TARGET: DEPLOYMENT_TARGET,
    CODE_SIGN_STYLE: 'Automatic',
    TARGETED_DEVICE_FAMILY: '"1,2"',
  });

  ensureMainAppInfoPlistRef(project);
  removeAppexFromCopyFilesPhases(project, `${EXTENSION_NAME}.appex`, appTarget && appTarget.uuid);
  disableEmbedCopyOnlyWhenInstalling(project);
  ensureAppexInEmbedAppExtensions(project, `${EXTENSION_NAME}.appex`);

  fs.writeFileSync(PROJECT_PATH, project.writeSync(), 'utf8');
  log('Xcode project updated.');

  // ── Podfile ───────────────────────────────────────────────────────────────────
  let podfileChanged = ensureNcePodTarget(PODFILE_PATH, EXTENSION_NAME, RETENO_VERSION);
  podfileChanged = ensureNCEUserNotificationsUIFramework(PODFILE_PATH) || podfileChanged;
  if (podfileChanged) {
    log('Podfile updated — run `pod install` inside ios/App/.');
  } else {
    log('Podfile already contains the NCE target.');
  }

  log(`iOS ${EXTENSION_NAME} (Images Carousel) ensured.`);
}

main();
