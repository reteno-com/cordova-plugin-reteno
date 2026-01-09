import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reteno.sample',
  appName: 'ExampleIonic',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  cordova: {
    preferences: {
      SDK_ACCESS_KEY: '8a1b2f46-ac32-46af-9194-d2575f8d5487',
      ANDROID_RETENO_FCM_VERSION: '2.8.9'
    }
  }
};

export default config;
