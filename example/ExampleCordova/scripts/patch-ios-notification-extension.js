#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function ensureApsEnvironmentInEntitlements(filePath, environment) {
  const current = readFileIfExists(filePath);
  if (!current) return false;

  const apsRegex = /<key>aps-environment<\/key>\s*<string>[^<]*<\/string>/;
  const replacement = `<key>aps-environment</key>\n  <string>${environment}</string>`;
  let next = current;

  if (apsRegex.test(next)) {
    next = next.replace(apsRegex, replacement);
  } else {
    const insertion = `\n  <key>aps-environment</key>\n  <string>${environment}</string>\n`;
    if (!next.includes('</dict>')) return false;
    next = next.replace('</dict>', `${insertion}</dict>`);
  }

  if (next === current) return false;
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

function ensureRemoteNotificationBackgroundMode(infoPlistPath) {
  const current = readFileIfExists(infoPlistPath);
  if (!current) return false;
  if (current.includes('<string>remote-notification</string>')) return false;

  let next = current;
  const backgroundModesRegex = /<key>UIBackgroundModes<\/key>\s*<array>([\s\S]*?)<\/array>/;

  if (backgroundModesRegex.test(next)) {
    next = next.replace(backgroundModesRegex, (full, items) => {
      return `<key>UIBackgroundModes</key>\n\t<array>${items}\n\t\t<string>remote-notification</string>\n\t</array>`;
    });
  } else {
    const insertion =
      `\t<key>UIBackgroundModes</key>\n` +
      `\t<array>\n` +
      `\t\t<string>remote-notification</string>\n` +
      `\t</array>\n`;
    // Replace the LAST </dict> (root-level), not the first nested one.
    const lastDictIdx = next.lastIndexOf('</dict>');
    if (lastDictIdx === -1) return false;
    next = next.slice(0, lastDictIdx) + insertion + next.slice(lastDictIdx);
  }

  if (next === current) return false;
  fs.writeFileSync(infoPlistPath, next, 'utf8');
  return true;
}

function ensureTargetSystemCapabilities(project, targetUuid, capabilityKeys) {
  const pbxProjects = project.pbxProjectSection();
  const projectKey = nonCommentKeys(pbxProjects)[0];
  if (!projectKey) return false;
  const pbxProject = pbxProjects[projectKey];
  if (!pbxProject) return false;

  pbxProject.attributes = pbxProject.attributes || {};
  pbxProject.attributes.TargetAttributes = pbxProject.attributes.TargetAttributes || {};
  pbxProject.attributes.TargetAttributes[targetUuid] = pbxProject.attributes.TargetAttributes[targetUuid] || {};

  const targetAttributes = pbxProject.attributes.TargetAttributes[targetUuid];
  targetAttributes.SystemCapabilities = targetAttributes.SystemCapabilities || {};

  let changed = false;
  capabilityKeys.forEach((capabilityKey) => {
    const existing = targetAttributes.SystemCapabilities[capabilityKey];
    if (!existing || Number(existing.enabled) !== 1) {
      targetAttributes.SystemCapabilities[capabilityKey] = { enabled: 1 };
      changed = true;
    }
  });

  return changed;
}

function ensureTargetDependency(project, hostTargetUuid, childTargetUuid) {
  if (!hostTargetUuid || !childTargetUuid) return false;

  const objects = project.hash && project.hash.project && project.hash.project.objects;
  if (!objects) return false;

  const nativeTargets = project.pbxNativeTargetSection();
  const hostTarget = nativeTargets[hostTargetUuid];
  const childTarget = nativeTargets[childTargetUuid];
  if (!hostTarget || !childTarget) return false;

  if (!objects.PBXContainerItemProxy) {
    objects.PBXContainerItemProxy = {};
  }
  if (!objects.PBXTargetDependency) {
    objects.PBXTargetDependency = {};
  }

  const targetDependencies = objects.PBXTargetDependency;
  const hostDependencies = Array.isArray(hostTarget.dependencies) ? hostTarget.dependencies : [];

  const alreadyLinked = hostDependencies.some((depRef) => {
    if (!depRef || !depRef.value) return false;
    const dep = targetDependencies[depRef.value];
    return dep && dep.target === childTargetUuid;
  });
  if (alreadyLinked) {
    return false;
  }

  const targetDependencyUuid = project.generateUuid();
  const targetDependencyCommentKey = `${targetDependencyUuid}_comment`;
  const itemProxyUuid = project.generateUuid();
  const itemProxyCommentKey = `${itemProxyUuid}_comment`;
  const rootObject = project.hash.project.rootObject;
  const rootObjectComment = project.hash.project.rootObject_comment;

  objects.PBXContainerItemProxy[itemProxyUuid] = {
    isa: 'PBXContainerItemProxy',
    containerPortal: rootObject,
    containerPortal_comment: rootObjectComment,
    proxyType: 1,
    remoteGlobalIDString: childTargetUuid,
    remoteInfo: childTarget.name
  };
  objects.PBXContainerItemProxy[itemProxyCommentKey] = 'PBXContainerItemProxy';

  targetDependencies[targetDependencyUuid] = {
    isa: 'PBXTargetDependency',
    target: childTargetUuid,
    target_comment: childTarget.name,
    targetProxy: itemProxyUuid,
    targetProxy_comment: 'PBXContainerItemProxy'
  };
  targetDependencies[targetDependencyCommentKey] = 'PBXTargetDependency';

  hostDependencies.push({
    value: targetDependencyUuid,
    comment: 'PBXTargetDependency'
  });
  hostTarget.dependencies = hostDependencies;

  return true;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findTargetBlocks(content, targetName) {
  const lines = content.split('\n');
  const lineOffsets = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i += 1) {
    lineOffsets.push(offset);
    offset += lines[i].length + 1;
  }

  const targetRegex = new RegExp(`^(\\s*)target\\s+'${escapeRegExp(targetName)}'\\s+do\\s*$`);
  const anyTargetRegex = /^\s*target\s+'[^']+'\s+do\s*$/;
  const endRegex = /^\s*end\s*$/;
  const blocks = [];

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(targetRegex);
    if (!match) continue;

    let depth = 1;
    let endLine = -1;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (anyTargetRegex.test(lines[j])) {
        depth += 1;
      } else if (endRegex.test(lines[j])) {
        depth -= 1;
        if (depth === 0) {
          endLine = j;
          break;
        }
      }
    }

    if (endLine === -1) continue;

    blocks.push({
      startLine: i,
      endLine,
      indent: match[1] || '',
      startOffset: lineOffsets[i],
      endOffset: lineOffsets[endLine] + lines[endLine].length + 1
    });

    i = endLine;
  }

  return blocks;
}

function getHostTargetName(content, preferredHostTarget, excludedTargets) {
  const preferredBlocks = findTargetBlocks(content, preferredHostTarget);
  if (preferredBlocks.length > 0) return preferredHostTarget;

  const topLevelTargetRegex = /^target\s+'([^']+)'\s+do\s*$/gm;
  let match = topLevelTargetRegex.exec(content);
  while (match) {
    const targetName = match[1];
    if (!excludedTargets.includes(targetName)) return targetName;
    match = topLevelTargetRegex.exec(content);
  }

  return preferredHostTarget;
}

function removeTargetBlocks(content, targetName) {
  const blocks = findTargetBlocks(content, targetName);
  if (blocks.length === 0) return content;

  const chunks = [];
  let cursor = 0;
  for (const block of blocks) {
    chunks.push(content.slice(cursor, block.startOffset));
    cursor = block.endOffset;
  }
  chunks.push(content.slice(cursor));
  return chunks.join('');
}

function insertNestedTarget(content, hostTargetName, childTargetName, nestedBlockLines) {
  const hostBlocks = findTargetBlocks(content, hostTargetName);
  if (hostBlocks.length === 0) return content;

  const hostBlock = hostBlocks[0];
  const hostBody = content.slice(hostBlock.startOffset, hostBlock.endOffset);
  if (hostBody.includes(`target '${childTargetName}' do`)) return content;

  const lines = content.split('\n');
  lines.splice(hostBlock.endLine, 0, ...nestedBlockLines);
  return lines.join('\n');
}

function ensureExtensionPodTarget(podfilePath, appName, extensionName, retenoVersion, iosDeploymentTarget) {
  const current = readFileIfExists(podfilePath);
  if (!current) return false;

  const nestedBlockLines = [
    `  target '${extensionName}' do`,
    '    inherit! :search_paths',
    `    pod 'Reteno', '${retenoVersion}'`,
    '  end',
  ];

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

  const hostTargetName = getHostTargetName(next, appName, [extensionName, 'NotificationContentExtension']);
  next = removeTargetBlocks(next, extensionName);
  next = insertNestedTarget(next, hostTargetName, extensionName, nestedBlockLines);

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

  const hostTargetName = getHostTargetName(current, appName, [
    'NotificationServiceExtension',
    'NotificationContentExtension'
  ]);
  const hostBlocks = findTargetBlocks(current, hostTargetName);
  if (hostBlocks.length === 0) return false;

  const hostBlock = hostBlocks[0];
  const hostLines = current.split('\n').slice(hostBlock.startLine, hostBlock.endLine + 1).join('\n');
  if (hostLines.includes("pod 'FirebaseMessaging'")) return false;

  const lines = current.split('\n');
  lines.splice(hostBlock.startLine + 1, 0, `  pod 'FirebaseMessaging'`);
  const next = lines.join('\n');
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
  const nestedBlockLines = [
    `  target '${contentExtensionName}' do`,
    '    inherit! :search_paths',
    `    pod 'Reteno', '${retenoVersion}'`,
    '  end',
  ];

  const hostTargetName = getHostTargetName(current, appName, [contentExtensionName, 'NotificationServiceExtension']);
  let next = removeTargetBlocks(current, contentExtensionName);
  next = insertNestedTarget(next, hostTargetName, contentExtensionName, nestedBlockLines);

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

  const markerStart = '  # RETENO_POST_INSTALL_START';
  const markerEnd = '  # RETENO_POST_INSTALL_END';
  const retenoBlock =
`${markerStart}
  installer.pods_project.targets.each do |target|
    next unless target.name == 'Reteno'
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_INSTALL_OBJC_HEADER'] = 'NO'
    end
  end
${markerEnd}
`;

  // Remove legacy injected Reteno block without markers (older script versions).
  const legacyBlockRegex =
    /  installer\.pods_project\.targets\.each do \|target\|\n    next unless target\.name == 'Reteno'\n    target\.build_configurations\.each do \|config\|\n      config\.build_settings\['SWIFT_INSTALL_OBJC_HEADER'\] = 'NO'\n    end\n  end\n/g;
  let next = current.replace(legacyBlockRegex, '');

  if (/post_install\s+do\s+\|installer\|/.test(next)) {
    const hasMarkers = next.includes(markerStart) && next.includes(markerEnd);

    if (hasMarkers) {
      // Update our previously injected block in place.
      const markedBlockRegex = new RegExp(
        `${markerStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${markerEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        'm'
      );
      next = next.replace(markedBlockRegex, retenoBlock.trimEnd());
    } else {
      // Inject Reteno block right after post_install header, preserving user code.
      next = next.replace(
        /(post_install\s+do\s+\|installer\|\n)/,
        `$1${retenoBlock}`
      );
    }
  } else {
    // No post_install exists: create one with just Reteno block.
    next = `${next.trimEnd()}\n\npost_install do |installer|\n${retenoBlock}end\n`;
  }

  if (next === current) return false;
  fs.writeFileSync(podfilePath, next, 'utf8');
  return true;
}

/**
 * Ensures Podfile post_install hook links UserNotificationsUI.framework in
 * the NotificationContentExtension aggregate pod target. Without it the
 * extension crashes at launch with "Unable to find NSExtensionContextClass".
 */
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

function hasExtensionPodTargets(iosRoot) {
  const supportFilesDir = path.join(iosRoot, 'Pods', 'Target Support Files');
  const nseDir = path.join(supportFilesDir, 'Pods-NotificationServiceExtension');
  const nceDir = path.join(supportFilesDir, 'Pods-NotificationContentExtension');
  return fs.existsSync(nseDir) && fs.existsSync(nceDir);
}

function resolvePodContext(iosRoot, appName) {
  const candidates = [
    iosRoot,
    path.join(iosRoot, appName),
  ];

  for (const dir of candidates) {
    const podfilePath = path.join(dir, 'Podfile');
    if (fs.existsSync(podfilePath)) {
      return { podfilePath, podInstallCwd: dir };
    }
  }

  return null;
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

function ensureEmbedAppExtensionsPhase(project, appTargetUuid) {
  let existing = findFirstEmbedAppExtensionsPhase(project);
  if (existing) {
    existing.phase.dstSubfolderSpec = 13;
    existing.phase.dstPath = existing.phase.dstPath || '""';
    return existing;
  }
  if (!appTargetUuid) return null;

  project.addBuildPhase([], 'PBXCopyFilesBuildPhase', 'Embed App Extensions', appTargetUuid, 'plugins');
  existing = findFirstEmbedAppExtensionsPhase(project);
  if (existing) {
    existing.phase.dstSubfolderSpec = 13;
    existing.phase.dstPath = existing.phase.dstPath || '""';
  }
  return existing;
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

function ensureAppexInEmbedAppExtensions(project, appexName, appTargetUuid) {
  const embed = ensureEmbedAppExtensionsPhase(project, appTargetUuid);
  if (!embed) return false;

  const { phase } = embed;
  if (!Array.isArray(phase.files)) {
    phase.files = [];
  }

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
    if (!cloned.settings) {
      cloned.settings = { ATTRIBUTES: ['RemoveHeadersOnCopy'] };
    }
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

    if (phase.files.length === 0 && appTarget && Array.isArray(appTarget.buildPhases)) {
      appTarget.buildPhases = appTarget.buildPhases.filter((bp) => bp.value !== phaseKey);
      delete phases[phaseKey];
      delete phases[commentKey];
      changed = true;
    }
  });

  return changed;
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

function copyGoogleServiceInfoToAppFolder(appRoot, appDir) {
  const sourcePath = path.join(appRoot, 'GoogleService-Info.plist');
  const targetPath = path.join(appDir, 'GoogleService-Info.plist');
  const source = readFileIfExists(sourcePath);
  if (!source) return false;

  const current = readFileIfExists(targetPath);
  if (current === source) return true;
  fs.writeFileSync(targetPath, source, 'utf8');
  return true;
}

function ensureGoogleServiceInfoInAppTarget(project, targetUuid, appGroupKey) {
  if (isGoogleServiceInfoInResources(project, targetUuid)) return true;
  if (!appGroupKey) return false;

  ensureResourcesGroup(project);
  project.addResourceFile(
    'GoogleService-Info.plist',
    { target: targetUuid },
    appGroupKey
  );

  return isGoogleServiceInfoInResources(project, targetUuid);
}

function normalizeGoogleServiceInfoFileReference(project, appName) {
  const fileRefs = project.pbxFileReferenceSection();
  const expectedPath = `${appName}/GoogleService-Info.plist`;

  nonCommentKeys(fileRefs).forEach((key) => {
    const ref = fileRefs[key];
    if (!ref || typeof ref.path !== 'string') return;
    const candidate = normalizePbxPath(ref.path);
    if (candidate !== 'GoogleService-Info.plist' && !candidate.endsWith('/GoogleService-Info.plist')) return;
    ref.path = `"${expectedPath}"`;
    ref.sourceTree = 'SOURCE_ROOT';
  });
}

function ensureGoogleServiceInfoFileReferencePath(projectPath, appName) {
  const current = readFileIfExists(projectPath);
  if (!current) return false;

  const expectedPath = `${appName}/GoogleService-Info.plist`;
  const pattern = /(\/\* GoogleService-Info\.plist \*\/ = \{isa = PBXFileReference;[^}]*?)path = "([^"]*GoogleService-Info\.plist)"; sourceTree = [^;]+;/g;
  const next = current.replace(pattern, (full, prefix) => {
    return `${prefix}path = "${expectedPath}"; sourceTree = SOURCE_ROOT;`;
  });

  if (next === current) return false;
  fs.writeFileSync(projectPath, next, 'utf8');
  return true;
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
  const podContext = resolvePodContext(iosRoot, appName);
  if (!podContext) {
    log('Podfile not found under platforms/ios, skipping Podfile patch and pod install rerun.');
    log('Run `cordova prepare ios` first, then retry the build/install step.');
    return;
  }
  const { podfilePath, podInstallCwd } = podContext;
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
  const hasGoogleServiceInfo = copyGoogleServiceInfoToAppFolder(appRoot, appDir);

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
  const debugEntitlementsPath = path.join(appDir, 'Entitlements-Debug.plist');
  const releaseEntitlementsPath = path.join(appDir, 'Entitlements-Release.plist');
  ensureAppGroupInEntitlements(debugEntitlementsPath, appGroup);
  ensureAppGroupInEntitlements(releaseEntitlementsPath, appGroup);
  ensureApsEnvironmentInEntitlements(debugEntitlementsPath, 'development');
  ensureApsEnvironmentInEntitlements(releaseEntitlementsPath, 'production');
  ensureRemoteNotificationBackgroundMode(path.join(appDir, `${appName}-Info.plist`));

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
    SWIFT_ENABLE_EXPLICIT_MODULES: 'NO',
    IPHONEOS_DEPLOYMENT_TARGET: '15.0',
    DEVELOPMENT_TEAM: '"X9JJR3XKX7"',
    CODE_SIGN_STYLE: 'Automatic',
    TARGETED_DEVICE_FAMILY: '"1,2"'
  });

  // Main app target also compiles Swift sources from plugins.
  const appTarget = findTargetByName(project, appName);
  if (appTarget) {
    ensureTargetSystemCapabilities(project, appTarget.uuid, [
      'com.apple.Push',
      'com.apple.BackgroundModes'
    ]);
    setTargetBuildSettings(project, appTarget.uuid, {
      SWIFT_VERSION: '5.0'
    });
    const appGroupKey = project.findPBXGroupKey({ path: appName }) || project.findPBXGroupKey({ name: appName });
    if (hasGoogleServiceInfo) {
      ensureGoogleServiceInfoInAppTarget(project, appTarget.uuid, appGroupKey);
      normalizeGoogleServiceInfoFileReference(project, appName);
    } else {
      log('GoogleService-Info.plist not found in app root; skipping iOS app target resource patch.');
    }
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
      <array>
      <string>ImageCarousel</string>
        <string>ImageGif</string>
      </array>
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
    SWIFT_ENABLE_EXPLICIT_MODULES: 'NO',
    IPHONEOS_DEPLOYMENT_TARGET: iosDeploymentTarget,
    DEVELOPMENT_TEAM: '"X9JJR3XKX7"',
    CODE_SIGN_STYLE: 'Automatic',
    TARGETED_DEVICE_FAMILY: '"1,2"'
  });

  // CocoaPods requires explicit host-target dependencies for app extensions.
  if (appTarget) {
    ensureTargetDependency(projectAfterNse, appTarget.uuid, targetUuid);
    ensureTargetDependency(projectAfterNse, appTarget.uuid, nceTargetUuid);
    const nseEmbedded = ensureAppexInEmbedAppExtensions(projectAfterNse, 'NotificationServiceExtension.appex', appTarget.uuid);
    const nceEmbedded = ensureAppexInEmbedAppExtensions(projectAfterNse, 'NotificationContentExtension.appex', appTarget.uuid);
    if (nseEmbedded) {
      removeAppexFromCopyFilesPhases(projectAfterNse, 'NotificationServiceExtension.appex', appTarget.uuid);
    }
    if (nceEmbedded) {
      removeAppexFromCopyFilesPhases(projectAfterNse, 'NotificationContentExtension.appex', appTarget.uuid);
    }
  }

  disableEmbedCopyOnlyWhenInstalling(project);

  // Single write for all changes (NSE + NCE applied to same project object).
  fs.writeFileSync(projectPath, project.writeSync(), 'utf8');
  ensureGoogleServiceInfoFileReferencePath(projectPath, appName);

  let podfileChanged = false;
  podfileChanged = ensureExtensionPodTarget(podfilePath, appName, extensionName, retenoVersion, iosDeploymentTarget) || podfileChanged;
  podfileChanged = ensureContentExtensionPodTarget(podfilePath, appName, contentExtensionName, retenoVersion) || podfileChanged;
  const tokenMode = getConfigXmlPreference(appRoot, 'IOS_DEVICE_TOKEN_HANDLING_MODE');
  if (tokenMode === 'manual') {
    podfileChanged = ensureFirebaseMessagingPod(podfilePath, appName) || podfileChanged;
  }
  podfileChanged = ensureRetenoSwiftHeaderSetting(podfilePath) || podfileChanged;
  podfileChanged = ensureNCEUserNotificationsUIFramework(podfilePath) || podfileChanged;

  // During `cordova build ios`, Cordova runs `pod install` before this after_prepare hook.
  // If we modified Podfile here (or extension aggregate pod targets are missing), rerun pod install.
  if (podfileChanged || !hasExtensionPodTargets(podInstallCwd)) {
    log('Running pod install after extension Podfile patch...');
    execSync('pod install', { cwd: podInstallCwd, stdio: 'inherit' });
  }
  // ─────────────────────────────────────────────────────────────────────────────

  log(`iOS NotificationServiceExtension ensured for ${appName}.`);
  log(`iOS NotificationContentExtension (Images Carousel) ensured for ${appName}.`);
}

main();
