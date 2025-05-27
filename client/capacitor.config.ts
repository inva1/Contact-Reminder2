import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.contactreminder.app',
  appName: 'Contact Reminder App',
  webDir: 'dist/public', // Relative to the client/ directory
  bundledWebRuntime: false, // Default, can be omitted
  // server: {
  //   androidScheme: 'https', // Optional: for live reload, not part of initial setup
  // },
};

export default config;
