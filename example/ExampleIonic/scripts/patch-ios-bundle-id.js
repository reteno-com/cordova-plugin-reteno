const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

const projectPath = path.join(__dirname, '..', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const appDirPath = path.join(__dirname, '..', 'ios', 'App', 'App');
const infoPlistPath = path.join(__dirname, '..', 'ios', 'App', 'App', 'Info.plist');
const googleServiceInfoRootPath = path.join(__dirname, '..', 'GoogleService-Info.plist');
const googleServiceInfoAppPath = path.join(appDirPath, 'GoogleService-Info.plist');
const appEntitlementsPath = path.join(__dirname, '..', 'ios', 'App', 'App', 'App.entitlements');
const appDebugEntitlementsPath = path.join(__dirname, '..', 'ios', 'App', 'App', 'App-Debug.entitlements');
const appReleaseEntitlementsPath = path.join(__dirname, '..', 'ios', 'App', 'App', 'App-Release.entitlements');
const extEntitlementsPath = path.join(
  __dirname,
  '..',
  'ios',
  'App',
  'App',
  'NotificationServiceExtension',
  'NotificationServiceExtension.entitlements'
);

const IOS_BUNDLE_ID = 'com.reteno.example-app';
const EXT_BUNDLE_ID = `${IOS_BUNDLE_ID}.NotificationServiceExtension`;
const NCE_BUNDLE_ID = `${IOS_BUNDLE_ID}.NotificationContentExtension`;
const APP_GROUP = `group.${IOS_BUNDLE_ID}.reteno-local-storage`;

function patchFile(filePath, patchFn) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const before = fs.readFileSync(filePath, 'utf8');
  const after = patchFn(before);
  if (after !== before) {
    fs.writeFileSync(filePath, after, 'utf8');
  }
}

function readFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function ensureFile(filePath, content) {
  const current = readFileIfExists(filePath);
  if (current === content) return false;
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function replaceAll(content, from, to) {
  return content.split(from).join(to);
}

function unquote(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/^"(.*)"$/, '$1');
}

function nonCommentKeys(section) {
  return Object.keys(section || {}).filter((key) => !key.endsWith('_comment'));
}

function findTargetByName(project, targetName) {
  const targets = project.pbxNativeTargetSection();
  const normalizedName = unquote(targetName);
  return nonCommentKeys(targets)
    .map((uuid) => ({ uuid, target: targets[uuid] }))
    .find(({ target }) => unquote(target && target.name) === normalizedName) || null;
}

function setTargetBuildSettingsForConfig(project, targetUuid, configName, settings) {
  const nativeTargets = project.pbxNativeTargetSection();
  const configListId = nativeTargets[targetUuid] && nativeTargets[targetUuid].buildConfigurationList;
  if (!configListId) return;

  const configLists = project.pbxXCConfigurationList();
  const configList = configLists[configListId];
  if (!configList || !Array.isArray(configList.buildConfigurations)) return;

  const buildConfigs = project.pbxXCBuildConfigurationSection();
  configList.buildConfigurations.forEach((cfgRef) => {
    const cfg = buildConfigs[cfgRef.value];
    if (!cfg || !cfg.buildSettings || cfg.name !== configName) return;
    Object.keys(settings).forEach((key) => {
      cfg.buildSettings[key] = settings[key];
    });
  });
}

function ensureTargetSystemCapabilities(project, targetUuid, capabilityKeys) {
  const pbxProjects = project.pbxProjectSection();
  const projectKey = nonCommentKeys(pbxProjects)[0];
  if (!projectKey) return;

  const pbxProject = pbxProjects[projectKey];
  pbxProject.attributes = pbxProject.attributes || {};
  pbxProject.attributes.TargetAttributes = pbxProject.attributes.TargetAttributes || {};
  pbxProject.attributes.TargetAttributes[targetUuid] = pbxProject.attributes.TargetAttributes[targetUuid] || {};

  const targetAttributes = pbxProject.attributes.TargetAttributes[targetUuid];
  targetAttributes.SystemCapabilities = targetAttributes.SystemCapabilities || {};

  capabilityKeys.forEach((capabilityKey) => {
    const existing = targetAttributes.SystemCapabilities[capabilityKey];
    if (!existing || Number(existing.enabled) !== 1) {
      targetAttributes.SystemCapabilities[capabilityKey] = { enabled: 1 };
    }
  });
}

function ensureRemoteNotificationBackgroundMode(filePath) {
  patchFile(filePath, (content) => {
    if (content.includes('<string>remote-notification</string>')) return content;

    const keyRegex = /<key>UIBackgroundModes<\/key>\s*<array>([\s\S]*?)<\/array>/;
    if (keyRegex.test(content)) {
      return content.replace(keyRegex, (full, items) => {
        return `<key>UIBackgroundModes</key>\n\t<array>${items}\n\t\t<string>remote-notification</string>\n\t</array>`;
      });
    }

    const insertion =
      `\n\t<key>UIBackgroundModes</key>\n` +
      `\t<array>\n` +
      `\t\t<string>remote-notification</string>\n` +
      `\t</array>\n`;
    return content.includes('</dict>') ? content.replace('</dict>', `${insertion}</dict>`) : content;
  });
}

function buildAppEntitlements(appGroup, apsEnvironment) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>aps-environment</key>
  <string>${apsEnvironment}</string>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${appGroup}</string>
  </array>
</dict>
</plist>
`;
}

function ensureAppEntitlementsFiles() {
  ensureFile(appDebugEntitlementsPath, buildAppEntitlements(APP_GROUP, 'development'));
  ensureFile(appReleaseEntitlementsPath, buildAppEntitlements(APP_GROUP, 'production'));
  // Keep the default file for compatibility with tools that still reference App.entitlements directly.
  ensureFile(appEntitlementsPath, buildAppEntitlements(APP_GROUP, 'development'));
}

function normalizePbxPath(value) {
  return unquote(value || '').replace(/^\.?\//, '');
}

function ensureResourcesGroup(project) {
  if (project.pbxGroupByName('Resources')) return;
  const resourcesGroupKey = project.pbxCreateGroup('Resources', 'Resources');
  const firstProject = project.getFirstProject();
  const mainGroupKey = firstProject && firstProject.firstProject && firstProject.firstProject.mainGroup;
  if (resourcesGroupKey && mainGroupKey) {
    project.addToPbxGroup(resourcesGroupKey, mainGroupKey);
  }
}

function findResourcePhaseForTarget(project, targetUuid) {
  const targets = project.pbxNativeTargetSection();
  const target = targets[targetUuid];
  if (!target || !Array.isArray(target.buildPhases)) return null;
  const resourcePhases = project.hash.project.objects.PBXResourcesBuildPhase || {};

  for (const phaseRef of target.buildPhases) {
    if (!phaseRef || !phaseRef.value) continue;
    if (!resourcePhases[phaseRef.value]) continue;
    return resourcePhases[phaseRef.value];
  }
  return null;
}

function isGoogleServiceInfoInResources(project, targetUuid) {
  const phase = findResourcePhaseForTarget(project, targetUuid);
  if (!phase || !Array.isArray(phase.files)) return false;

  const buildFiles = project.pbxBuildFileSection();
  const fileRefs = project.pbxFileReferenceSection();
  return phase.files.some((fileRefEntry) => {
    const buildFile = buildFiles[fileRefEntry.value];
    if (!buildFile || !buildFile.fileRef) return false;
    const fileRef = fileRefs[buildFile.fileRef];
    if (!fileRef) return false;
    const candidate = normalizePbxPath(fileRef.path);
    return candidate === 'GoogleService-Info.plist' || candidate.endsWith('/GoogleService-Info.plist');
  });
}

function copyGoogleServiceInfoToAppFolder() {
  if (!fs.existsSync(googleServiceInfoRootPath)) return false;
  const source = fs.readFileSync(googleServiceInfoRootPath, 'utf8');
  const current = readFileIfExists(googleServiceInfoAppPath);
  if (current === source) return true;
  fs.writeFileSync(googleServiceInfoAppPath, source, 'utf8');
  return true;
}

function ensureGoogleServiceInfoInAppTarget(project, targetUuid) {
  if (!fs.existsSync(googleServiceInfoAppPath)) return false;
  if (isGoogleServiceInfoInResources(project, targetUuid)) return true;

  ensureResourcesGroup(project);
  const appGroupKey = project.findPBXGroupKey({ path: 'App' }) || project.findPBXGroupKey({ name: 'App' });
  project.addResourceFile(
    'GoogleService-Info.plist',
    { target: targetUuid },
    appGroupKey
  );

  return isGoogleServiceInfoInResources(project, targetUuid);
}

// Safety-net regex patch for bundle ids that may be generated by `cap sync`.
patchFile(projectPath, (content) => {
  content = content.replace(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*com\.reteno\.sample\.NotificationServiceExtension;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${EXT_BUNDLE_ID};`);
  content = content.replace(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*com\.reteno\.sample\.NotificationContentExtension;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${NCE_BUNDLE_ID};`);
  content = content.replace(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*com\.reteno\.sample;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${IOS_BUNDLE_ID};`);
  // Also fix extension ids derived from the correct app id but with wrong suffix format.
  content = content.replace(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*com\.reteno\.example-app\.NotificationServiceExtension;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${EXT_BUNDLE_ID};`);
  content = content.replace(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*com\.reteno\.example-app\.NotificationContentExtension;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${NCE_BUNDLE_ID};`);
  return content;
});

for (const entitlementsPath of [appEntitlementsPath, extEntitlementsPath]) {
  patchFile(entitlementsPath, (content) => {
    return replaceAll(content, 'group.com.reteno.sample.reteno-local-storage', APP_GROUP);
  });
}

ensureAppEntitlementsFiles();
ensureRemoteNotificationBackgroundMode(infoPlistPath);
copyGoogleServiceInfoToAppFolder();

if (fs.existsSync(projectPath)) {
  const project = xcode.project(projectPath);
  project.parseSync();

  const appTarget = findTargetByName(project, 'App');
  if (appTarget) {
    ensureTargetSystemCapabilities(project, appTarget.uuid, [
      'com.apple.Push',
      'com.apple.BackgroundModes'
    ]);
    setTargetBuildSettingsForConfig(project, appTarget.uuid, 'Debug', {
      CODE_SIGN_ENTITLEMENTS: 'App/App-Debug.entitlements',
      PRODUCT_BUNDLE_IDENTIFIER: `"${IOS_BUNDLE_ID}"`,
    });
    setTargetBuildSettingsForConfig(project, appTarget.uuid, 'Release', {
      CODE_SIGN_ENTITLEMENTS: 'App/App-Release.entitlements',
      PRODUCT_BUNDLE_IDENTIFIER: `"${IOS_BUNDLE_ID}"`,
    });
    ensureGoogleServiceInfoInAppTarget(project, appTarget.uuid);
  }

  fs.writeFileSync(projectPath, project.writeSync(), 'utf8');
}

console.log(`iOS bundle id and push capabilities patched for ${IOS_BUNDLE_ID}`);
