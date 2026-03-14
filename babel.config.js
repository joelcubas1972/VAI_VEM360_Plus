module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // OTROS PLUGINS SI LOS TIENES...
      'react-native-worklets/plugin',
    ],
  };
};