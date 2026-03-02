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
  if (next.includes(`target '${appName}' do`) && !next.includes(`target '${extensionName}' do`)) {
    next = next.replace(
      new RegExp(`(target '${appName}' do[\\s\\S]*?)(\\nend\\n?)`),
      `$1\n${nestedBlock}$2`
    );
  }

  if (next !== current) {
    fs.writeFileSync(podfilePath, next, 'utf8');
    return true;
  }

  return false;
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
  const retenoVersion = process.env.IOS_RETENO_FCM_VERSION || '2.6.1';
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

  fs.writeFileSync(projectPath, project.writeSync(), 'utf8');

  ensureExtensionPodTarget(podfilePath, appName, extensionName, retenoVersion, iosDeploymentTarget);

  log(`iOS NotificationServiceExtension ensured for ${appName}.`);
}

main();
