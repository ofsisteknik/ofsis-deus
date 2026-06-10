const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Explicitly filter out 'mjs' to force Metro to resolve CommonJS (.js) versions of libraries (like Zustand)
// instead of their ESM (.mjs) versions which use browser-crashing 'import.meta' expressions.
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'mjs');

module.exports = config;
