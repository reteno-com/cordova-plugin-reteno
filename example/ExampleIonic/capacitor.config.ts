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
      SDK_ACCESS_KEY: '630A66AF-C1D3-4F2A-ACC1-0D51C38D2B05',
      IOS_RETENO_FCM_VERSION: '2.6.1',
      ANDROID_RETENO_FCM_VERSION: '2.9.0',
      RETENO_DEBUG_MODE: 'true'
    }
  }
};

export default config;
