import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reteno.example-app',
  appName: 'ExampleIonic',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  cordova: {
    preferences: {
      SDK_ACCESS_KEY: '630A66AF-C1D3-4F2A-ACC1-0D51C38D2B05',
      IOS_DEVICE_TOKEN_HANDLING_MODE: 'manual',
    }
  }
};

export default config;
