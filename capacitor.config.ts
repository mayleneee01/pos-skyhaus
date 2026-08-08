import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skyhaus.pos',
  appName: 'SKY HAUS POS',
  webDir: 'out',
  // Gunakan URL server lokal — ganti IP sesuai jaringan Anda
  server: {
    url: 'http://192.168.1.118:3000',
    cleartext: true,
  },
  android: {
    backgroundColor: '#FDFBF7',
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#C41E3A',
      showSpinner: false,
    },
  },
};

export default config;
