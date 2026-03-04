const fs = require('fs');
const path = require('path');

const projectPath = path.join(__dirname, '..', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const appEntitlementsPath = path.join(__dirname, '..', 'ios', 'App', 'App', 'App.entitlements');
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

function replaceAll(content, from, to) {
  return content.split(from).join(to);
}

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

patchFile(projectPath, (content) => {
  // Replace bundle ids in build settings.
  content = content.replace(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*com\.reteno\.sample\.NotificationServiceExtension;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${EXT_BUNDLE_ID};`);
  content = content.replace(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*com\.reteno\.sample\.NotificationContentExtension;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${NCE_BUNDLE_ID};`);
  content = content.replace(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*com\.reteno\.sample;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${IOS_BUNDLE_ID};`);
  return content;
});

for (const entitlementsPath of [appEntitlementsPath, extEntitlementsPath]) {
  patchFile(entitlementsPath, (content) => {
    content = replaceAll(content, 'group.com.reteno.sample.reteno-local-storage', APP_GROUP);
    return content;
  });
}

console.log(`iOS bundle id patched to ${IOS_BUNDLE_ID}`);
