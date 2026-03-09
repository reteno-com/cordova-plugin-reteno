#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function log(message) {
  console.log(`cordova-plugin-reteno: ${message}`);
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

function ensureAppGroupInEntitlements(filePath, appGroup) {
  const current = readFileIfExists(filePath);
  if (!current) return false;
  if (current.includes(appGroup)) return false;

  const insertion = `\n  <key>com.apple.security.application-groups</key>\n  <array>\n    <string>${appGroup}</string>\n  </array>\n`;
  if (!current.includes('</dict>')) return false;

  const next = current.replace('</dict>', `${insertion}</dict>`);
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

function ensureExtensionPodTarget(podfilePath, appName, extensionName, retenoVersion, iosDeploymentTarget) {
  const current = readFileIfExists(podfilePath);
  if (!current) return false;

  const nestedBlock =
    `  target '${extensionName}' do\n` +
    `    inherit! :search_paths\n` +
    `    pod 'Reteno', '${retenoVersion}'\n` +
    `  end`;

  let next = current;

  // Keep Podfile iOS platform aligned with project deployment target.
  next = next.replace(
    /platform\s*:ios,\s*'[^']+'/,
    `platform :ios, '${iosDeploymentTarget}'`
  );

  // Align with Ionic setup: Swift pods are more stable as frameworks.
  if (!next.includes('use_frameworks!')) {
    next = next.replace(
      /(platform\s*:ios,\s*'[^']+'\n)/,
      `$1use_frameworks!\n`
    );
  }

  // Remove legacy top-level extension target if present.
  next = next.replace(
    new RegExp(`^target '${extensionName}' do\\n(?:^[ \\t].*\\n)*^end\\n?`, 'gm'),
    '\n'
  );

  // Repair truncated Podfile where app target closing `end` was accidentally removed.
  if (next.includes(`target '${appName}' do`) && !/\nend\s*$/.test(next.trimEnd())) {
    next = `${next.trimEnd()}\nend\n`;
  }

  // Insert nested extension target into the main app target.
  // Uses greedy match so NSE is always inserted before the outermost closing `end`,
  // never accidentally nested inside a pre-existing NCE block.
  if (next.includes(`target '${appName}' do`) && !next.includes(`target '${extensionName}' do`)) {
    const mainTargetRegex = new RegExp(`(target '${appName}' do[\\s\\S]*)(\\nend[\\s]*)$`);
    const match = next.match(mainTargetRegex);
    if (match) {
      next =
        next.slice(0, match.index) +
        match[1] +
        `\n${nestedBlock}` +
        match[2];
    }
  }

  if (next !== current) {
    fs.writeFileSync(podfilePath, next, 'utf8');
    return true;
  }

  return false;
}

/**
 * Adds `pod 'FirebaseMessaging'` to the main app target in the Podfile.
 * Idempotent — skips if already present.
 */
function ensureFirebaseMessagingPod(podfilePath, appName) {
  const current = readFileIfExists(podfilePath);
  if (!current) return false;

  const mainTargetRegex = new RegExp(`(target '${appName}' do\\n)([\\s\\S]*)(\\nend[\\s]*)$`);
  const match = current.match(mainTargetRegex);
  if (!match) return false;

  const targetHeader = match[1];
  const targetBody = match[2];
  const targetFooter = match[3];

  if (targetBody.includes("pod 'FirebaseMessaging'")) return false;

  const next =
    current.slice(0, match.index) +
    targetHeader +
    `  pod 'FirebaseMessaging'\n` +
    targetBody +
    targetFooter;
  if (next === current) return false;

  fs.writeFileSync(podfilePath, next, 'utf8');
  return true;
}

/**
 * Adds a pod target for the Notification Content Extension.
 * Uses a greedy match so it inserts BEFORE the outer closing `end` of the main
 * app target (not inside a previously-added nested NSE target block).
 */
function ensureContentExtensionPodTarget(podfilePath, appName, contentExtensionName, retenoVersion) {
  const current = readFileIfExists(podfilePath);
  if (!current) return false;
  if (current.includes(`target '${contentExtensionName}' do`)) return false;

  const nestedBlock =
    `\n  target '${contentExtensionName}' do\n` +
    `    inherit! :search_paths\n` +
    `    pod 'Reteno', '${retenoVersion}'\n` +
    `  end`;

  // Greedy match: $1 captures everything inside the main app target (including any nested
  // NSE block) and $2 captures the final outer `end` so NCE is always at the outermost level.
  const mainTargetRegex = new RegExp(`(target '${appName}' do[\\s\\S]*)(\\nend[\\s]*)$`);
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

/**
 * Ensures Podfile has a post_install hook that disables ObjC Swift header
 * generation for Reteno pod target. This avoids simulator dependency scanner
 * failures when modulemap points to a missing Reteno-Swift.h.
 */
function ensureRetenoSwiftHeaderSetting(podfilePath) {
  const current = readFileIfExists(podfilePath);
  if (!current) return false;

  // Already configured.
  if (current.includes("target.name == 'Reteno'") && current.includes('SWIFT_INSTALL_OBJC_HEADER')) {
    return false;
  }

  const snippet =
`post_install do |installer|
  installer.pods_project.targets.each do |target|
    next unless target.name == 'Reteno'
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_INSTALL_OBJC_HEADER'] = 'NO'
    end
  end
end
`;

  let next = current;

  // If post_install exists, inject only Reteno block into it.
  if (/post_install\s+do\s+\|installer\|/.test(current)) {
    next = current.replace(
      /(post_install\s+do\s+\|installer\|\n)/,
      `$1  installer.pods_project.targets.each do |target|\n` +
      `    next unless target.name == 'Reteno'\n` +
      `    target.build_configurations.each do |config|\n` +
      `      config.build_settings['SWIFT_INSTALL_OBJC_HEADER'] = 'NO'\n` +
      `    end\n` +
      `  end\n`
    );
  } else {
    // No post_install: append one.
    next = `${current.trimEnd()}\n\n${snippet}`;
  }

  if (next === current) return false;
  fs.writeFileSync(podfilePath, next, 'utf8');
  return true;
}

function nonCommentKeys(section) {
  return Object.keys(section || {}).filter((key) => !key.endsWith('_comment'));
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

function normalizeExtensionFileRefs(project, extensionName) {
  const fileRefs = project.pbxFileReferenceSection();
  const remap = {
    [`${extensionName}/NotificationService.swift`]: 'NotificationService.swift',
    [`${extensionName}/Info.plist`]: 'Info.plist',
    [`${extensionName}/NotificationServiceExtension.entitlements`]: 'NotificationServiceExtension.entitlements'
  };

  nonCommentKeys(fileRefs).forEach((key) => {
    const ref = fileRefs[key];
    if (!ref || typeof ref.path !== 'string') return;
    const rawPath = unquote(ref.path);
    const fixedPath = remap[rawPath];
    if (!fixedPath) return;
    ref.path = `"${fixedPath}"`;
    ref.name = `"${fixedPath}"`;
  });
}

function ensureExtensionGroupPath(project, extensionGroupKey, appName, extensionName) {
  const groups = project.hash.project.objects.PBXGroup || {};
  const group = groups[extensionGroupKey];
  if (!group) return;

  const expected = `${appName}/${extensionName}`;
  if (group.path !== expected) {
    group.path = expected;
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

function findTargetByName(project, targetName) {
  const targets = project.pbxNativeTargetSection();
  const normalizedName = unquote(targetName);

  return nonCommentKeys(targets).map((uuid) => ({ uuid, target: targets[uuid] })).find(({ target }) => {
    return unquote(target && target.name) === normalizedName;
  }) || null;
}

function findTargetsByName(project, targetName) {
  const targets = project.pbxNativeTargetSection();
  const normalizedName = unquote(targetName);

  return nonCommentKeys(targets)
    .map((uuid) => ({ uuid, target: targets[uuid] }))
    .filter(({ target }) => unquote(target && target.name) === normalizedName);
}

function ensureBuildPhase(project, targetUuid, buildPhaseType, comment, optionsOrFolderType, subfolderPath) {
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
    project.addBuildPhase([], buildPhaseType, comment, targetUuid, optionsOrFolderType, subfolderPath);
  }
}

function unquote(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/^"(.*)"$/, '$1');
}

function getConfigXmlPreference(appRoot, name) {
  const configPath = path.join(appRoot, 'config.xml');
  const content = readFileIfExists(configPath);
  if (!content) return null;
  const regex = new RegExp(`<preference\\s+name=["']${name}["']\\s+value=["']([^"']+)["']`, 'i');
  const match = content.match(regex);
  return match ? match[1] : null;
}

function main() {
  const cordovaPlatforms = (process.env.CORDOVA_PLATFORMS || '')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const cmdline = (process.env.CORDOVA_CMDLINE || '').toLowerCase();
  const argv = process.argv.map((arg) => String(arg).toLowerCase()).join(' ');
  const iosRequested = cordovaPlatforms.includes('ios') || cmdline.includes(' ios') || argv.includes(' ios');
  const runningInsideCordova = Boolean(process.env.CORDOVA_PLATFORMS || process.env.CORDOVA_CMDLINE);

  if (runningInsideCordova && !iosRequested) {
    return;
  }

  const appRoot = process.cwd();
  const iosRoot = path.join(appRoot, 'platforms', 'ios');
  if (!fs.existsSync(iosRoot)) {
    log('iOS platform not found, skipping NotificationServiceExtension patch.');
    return;
  }

  const xcodeprojDir = fs.readdirSync(iosRoot).find((name) => (
    name.endsWith('.xcodeproj') &&
    name !== 'CordovaLib.xcodeproj' &&
    !name.startsWith('Pods')
  ));

  if (!xcodeprojDir) {
    log('No app xcodeproj found under platforms/ios, skipping NotificationServiceExtension patch.');
    return;
  }

  const appName = path.basename(xcodeprojDir, '.xcodeproj');
  const projectPath = path.join(iosRoot, xcodeprojDir, 'project.pbxproj');
  const podfilePath = path.join(iosRoot, 'Podfile');
  const appDir = path.join(iosRoot, appName);
  const extensionName = 'NotificationServiceExtension';
  const extensionRelDir = `${appName}/${extensionName}`;
  const extensionDir = path.join(appDir, extensionName);

  // Use local xcode package from the demo app.
  const xcode = require(path.join(appRoot, 'node_modules', 'xcode'));
  const project = xcode.project(projectPath);
  project.parseSync();

  const appBundleId = unquote(project.getBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', 'Release', appName)) || 'com.reteno.example-app';
  const pluginXmlContent = readFileIfExists(path.join(appRoot, 'plugins', 'cordova-plugin-reteno', 'plugin.xml'));
  const pluginXmlMatch = pluginXmlContent && pluginXmlContent.match(/<pod\s+name="Reteno"\s+spec="([^"]+)"/);
  const retenoVersion = (pluginXmlMatch && pluginXmlMatch[1]) || '2.6.1';
  const iosDeploymentTarget = unquote(project.getBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', 'Release', appName)) || '15.0';
  const extensionBundleId = `${appBundleId}.${extensionName}`;
  const appGroup = `group.${appBundleId}.reteno-local-storage`;

  const existingTargets = findTargetsByName(project, extensionName);
  if (existingTargets.length > 1) {
    throw new Error(
      `Detected ${existingTargets.length} '${extensionName}' targets in iOS project. ` +
      'This usually comes from older generated platform state. ' +
      'Please run: npx cordova platform rm ios && npx cordova platform add ios && npx cordova prepare ios'
    );
  }
  ensureDir(extensionDir);

  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>${extensionName}</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>XPC!</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleVersion</key>
  <string>413</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.usernotifications.service</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).NotificationService</string>
  </dict>
</dict>
</plist>
`;

  const extensionEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${appGroup}</string>
  </array>
</dict>
</plist>
`;

  const notificationServiceSwift = `import UserNotifications
import Reteno

class NotificationService: RetenoNotificationServiceExtension {}
`;

  ensureFile(path.join(extensionDir, 'Info.plist'), infoPlist);
  ensureFile(path.join(extensionDir, 'NotificationServiceExtension.entitlements'), extensionEntitlements);
  ensureFile(path.join(extensionDir, 'NotificationService.swift'), notificationServiceSwift);

  // Main app entitlements must include the same app group.
  ensureAppGroupInEntitlements(path.join(appDir, 'Entitlements-Debug.plist'), appGroup);
  ensureAppGroupInEntitlements(path.join(appDir, 'Entitlements-Release.plist'), appGroup);

  const existingTarget = findTargetByName(project, extensionName);
  let targetUuid;
  if (existingTarget) {
    targetUuid = existingTarget.uuid;
  } else {
    const newTarget = project.addTarget(extensionName, 'app_extension', extensionRelDir, extensionBundleId);
    targetUuid = newTarget.uuid;
  }

  ensureBuildPhase(project, targetUuid, 'PBXSourcesBuildPhase', 'Sources');
  ensureBuildPhase(project, targetUuid, 'PBXFrameworksBuildPhase', 'Frameworks');
  ensureBuildPhase(project, targetUuid, 'PBXResourcesBuildPhase', 'Resources');

  let extensionGroupKey = project.findPBXGroupKey({ name: extensionName });
  if (!extensionGroupKey) {
    extensionGroupKey = project.pbxCreateGroup(extensionName, `${appName}/${extensionName}`);
    const rootGroupKey = project.findPBXGroupKey({ name: 'CustomTemplate' });
    if (rootGroupKey) {
      project.addToPbxGroup(extensionGroupKey, rootGroupKey);
    }
  }

  ensureExtensionGroupPath(project, extensionGroupKey, appName, extensionName);
  normalizeExtensionFileRefs(project, extensionName);

  if (!hasFilePath(project, `${extensionName}/NotificationService.swift`) && !hasFilePath(project, 'NotificationService.swift')) {
    project.addSourceFile(
      'NotificationService.swift',
      { target: targetUuid },
      extensionGroupKey
    );
  }

  if (!hasFilePath(project, `${extensionName}/Info.plist`) && !hasFilePath(project, 'Info.plist')) {
    project.addFile('Info.plist', extensionGroupKey);
  }

  if (
    !hasFilePath(project, `${extensionName}/NotificationServiceExtension.entitlements`) &&
    !hasFilePath(project, 'NotificationServiceExtension.entitlements')
  ) {
    project.addFile('NotificationServiceExtension.entitlements', extensionGroupKey);
  }

  setTargetBuildSettings(project, targetUuid, {
    PRODUCT_BUNDLE_IDENTIFIER: `"${extensionBundleId}"`,
    INFOPLIST_FILE: `"${extensionRelDir}/Info.plist"`,
    CODE_SIGN_ENTITLEMENTS: `"${extensionRelDir}/NotificationServiceExtension.entitlements"`,
    SWIFT_OBJC_BRIDGING_HEADER: '""',
    SWIFT_VERSION: '5.0',
    IPHONEOS_DEPLOYMENT_TARGET: '15.0',
    DEVELOPMENT_TEAM: '"X9JJR3XKX7"',
    CODE_SIGN_STYLE: 'Automatic',
    TARGETED_DEVICE_FAMILY: '"1,2"'
  });

  // Main app target also compiles Swift sources from plugins.
  const appTarget = findTargetByName(project, appName);
  if (appTarget) {
    setTargetBuildSettings(project, appTarget.uuid, {
      SWIFT_VERSION: '5.0'
    });
  }

  // ─── Notification Content Extension (Images Carousel) ────────────────────────
  const contentExtensionName = 'NotificationContentExtension';
  const contentExtensionBundleId = `${appBundleId}.${contentExtensionName}`;
  const contentExtensionRelDir = `${appName}/${contentExtensionName}`;
  const contentExtensionDir = path.join(appDir, contentExtensionName);

  ensureDir(contentExtensionDir);

  const nceInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>${contentExtensionName}</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>XPC!</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleVersion</key>
  <string>413</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionAttributes</key>
    <dict>
      <key>UNNotificationExtensionCategory</key>
      <string>ImageCarousel</string>
      <key>UNNotificationExtensionInitialContentSizeRatio</key>
      <real>0.5</real>
      <key>UNNotificationExtensionUserInteractionEnabled</key>
      <true/>
    </dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.usernotifications.content-extension</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).NotificationViewController</string>
  </dict>
</dict>
</plist>
`;

  const notificationViewControllerSwift = `import Reteno

final class NotificationViewController: RetenoCarouselNotificationViewController {}
`;

  ensureFile(path.join(contentExtensionDir, 'Info.plist'), nceInfoPlist);
  ensureFile(path.join(contentExtensionDir, 'NotificationViewController.swift'), notificationViewControllerSwift);

  // Reuse the same project object — no re-parse needed.
  const projectAfterNse = project;

  const existingNceTargets = findTargetsByName(projectAfterNse, contentExtensionName);
  if (existingNceTargets.length > 1) {
    throw new Error(
      `Detected ${existingNceTargets.length} '${contentExtensionName}' targets in iOS project. ` +
      'Please run: npx cordova platform rm ios && npx cordova platform add ios && npx cordova prepare ios'
    );
  }

  let nceTargetUuid;
  if (existingNceTargets.length === 1) {
    nceTargetUuid = existingNceTargets[0].uuid;
  } else {
    const newNceTarget = projectAfterNse.addTarget(
      contentExtensionName,
      'app_extension',
      contentExtensionRelDir,
      contentExtensionBundleId
    );
    nceTargetUuid = newNceTarget.uuid;
  }

  ensureBuildPhase(projectAfterNse, nceTargetUuid, 'PBXSourcesBuildPhase', 'Sources');
  ensureBuildPhase(projectAfterNse, nceTargetUuid, 'PBXFrameworksBuildPhase', 'Frameworks');
  ensureBuildPhase(projectAfterNse, nceTargetUuid, 'PBXResourcesBuildPhase', 'Resources');

  let nceGroupKey = projectAfterNse.findPBXGroupKey({ name: contentExtensionName });
  if (!nceGroupKey) {
    nceGroupKey = projectAfterNse.pbxCreateGroup(contentExtensionName, `${appName}/${contentExtensionName}`);
    const rootGroupKey = projectAfterNse.findPBXGroupKey({ name: 'CustomTemplate' });
    if (rootGroupKey) {
      projectAfterNse.addToPbxGroup(nceGroupKey, rootGroupKey);
    }
  }

  ensureExtensionGroupPath(projectAfterNse, nceGroupKey, appName, contentExtensionName);

  const nceFileRefs = projectAfterNse.pbxFileReferenceSection();
  const nceFileRemap = {
    [`${contentExtensionName}/NotificationViewController.swift`]: 'NotificationViewController.swift',
    [`${contentExtensionName}/Info.plist`]: 'Info.plist',
  };
  nonCommentKeys(nceFileRefs).forEach((key) => {
    const ref = nceFileRefs[key];
    if (!ref || typeof ref.path !== 'string') return;
    const rawPath = unquote(ref.path);
    const fixedPath = nceFileRemap[rawPath];
    if (!fixedPath) return;
    ref.path = `"${fixedPath}"`;
    ref.name = `"${fixedPath}"`;
  });

  if (
    !hasFilePath(projectAfterNse, `${contentExtensionName}/NotificationViewController.swift`) &&
    !hasFilePath(projectAfterNse, 'NotificationViewController.swift')
  ) {
    projectAfterNse.addSourceFile(
      'NotificationViewController.swift',
      { target: nceTargetUuid },
      nceGroupKey
    );
  }

  if (
    !hasFilePath(projectAfterNse, `${contentExtensionName}/Info.plist`) &&
    !hasFilePath(projectAfterNse, 'Info.plist')
  ) {
    projectAfterNse.addFile('Info.plist', nceGroupKey);
  }

  setTargetBuildSettings(projectAfterNse, nceTargetUuid, {
    PRODUCT_BUNDLE_IDENTIFIER: `"${contentExtensionBundleId}"`,
    INFOPLIST_FILE: `"${contentExtensionRelDir}/Info.plist"`,
    SWIFT_OBJC_BRIDGING_HEADER: '""',
    SWIFT_VERSION: '5.0',
    IPHONEOS_DEPLOYMENT_TARGET: iosDeploymentTarget,
    DEVELOPMENT_TEAM: '"X9JJR3XKX7"',
    CODE_SIGN_STYLE: 'Automatic',
    TARGETED_DEVICE_FAMILY: '"1,2"'
  });

  disableEmbedCopyOnlyWhenInstalling(project);

  // Single write for all changes (NSE + NCE applied to same project object).
  fs.writeFileSync(projectPath, project.writeSync(), 'utf8');

  ensureExtensionPodTarget(podfilePath, appName, extensionName, retenoVersion, iosDeploymentTarget);
  ensureContentExtensionPodTarget(podfilePath, appName, contentExtensionName, retenoVersion);
  const tokenMode = getConfigXmlPreference(appRoot, 'IOS_DEVICE_TOKEN_HANDLING_MODE');
  if (tokenMode === 'manual') {
    ensureFirebaseMessagingPod(podfilePath, appName);
  }
  ensureRetenoSwiftHeaderSetting(podfilePath);
  // ─────────────────────────────────────────────────────────────────────────────

  log(`iOS NotificationServiceExtension ensured for ${appName}.`);
  log(`iOS NotificationContentExtension (Images Carousel) ensured for ${appName}.`);
}

main();
