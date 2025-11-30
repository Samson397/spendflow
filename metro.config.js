const { getDefaultConfig } = require('expo/metro-config');

// Set EXPO_NO_DOTENV=1 to avoid dotenv issues
process.env.EXPO_NO_DOTENV = '1';

const config = getDefaultConfig(__dirname);

// Add support for web-specific files
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'web.js',
  'web.jsx',
  'web.ts',
  'web.tsx',
];

// Configure resolver for web
config.resolver.alias = {
  'react-native-svg': 'react-native-svg-web',
};

// Disable transformer cache to avoid issues
config.transformer.minifyConfig = false;

module.exports = config;
