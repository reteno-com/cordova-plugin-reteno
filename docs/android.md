## Installation

1. Run next command from root of your project:

```sh
cordova plugin add cordova-plugin-reteno
```

2. Also you may need to increase `minSdkVersion` in project level `build.gradle` to `26`, since `Reteno` uses this version as minimal;

## Setting up SDK

1. Follow `Step 1` described in Android SDK setup guide: [link](https://docs.reteno.com/reference/android-sdk-setup#step-1-make-sure-to-enable-androidx-in-your-gradleproperties-file);

2. Add Reteno dependency in application level build.gradle:
```groovy

dependencies {
    implementation 'com.reteno:fcm:(latest_version_here)'
    ...
```

3. Follow `Step 3` described in Android SDK setup guide: [link](https://docs.reteno.com/reference/android-sdk-setup#step-3-edit-your-custom-application-class-and-provider-api-access-key-at-sdk-initialization);

4. Follow `Step 5` described in Android SDK setup guide: [link](https://docs.reteno.com/reference/android-sdk-setup#step-5-make-sure-to-set-up-your-firebase-application-for-firebase-cloud-messaging);
 

5. Install Firebase Plugin:

```sh
cordova plugin add cordova-plugin-reteno-firebase
```

and follow instructions [link] (https://github.com/reteno-com/reteno-cordova/tree/main/cordova-plugin-reteno-firebase?activeTab=readme) how to use it from application;
