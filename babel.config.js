module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated/plugin removed: only RN built-in Animated API is used.
    // If Reanimated is adopted in future, re-add the plugin and install the package.
    plugins: [],
  };
};
