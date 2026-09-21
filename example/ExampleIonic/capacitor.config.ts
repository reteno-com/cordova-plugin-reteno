import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reteno.example-app',
  appName: 'ExampleIonic',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  ios: {
    // Reteno must remain UNUserNotificationCenter.delegate to capture the push
    // response that cold-launched the app. Capacitor's default notification
    // router would otherwise replace it when the bridge is created.
    handleApplicationNotifications: false,
  },
  cordova: {
    preferences: {
      RETENO_ACCESS_KEY: '630A66AF-C1D3-4F2A-ACC1-0D51C38D2B05',
      IOS_DEVICE_TOKEN_HANDLING_MODE: 'manual',
    }
  }
};

export default config;
