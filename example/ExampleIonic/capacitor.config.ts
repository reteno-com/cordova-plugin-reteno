import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reteno.sample',
  appName: 'ExampleIonic',
  webDir: 'src',
  server: {
    androidScheme: 'https'
  },
  cordova: {
    preferences: {
      SDK_ACCESS_KEY: '8a1b2f46-ac32-46af-9194-d2575f8d5487'
    }
  }
};

export default config;
