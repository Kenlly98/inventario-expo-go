module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        alias: {
          '@app': './app',
          '@api': './app/data/api',
          '@services': './app/services',
          '@store': './app/store',
          '@utils': './app/utils',
          '@screens': './screens',
        },
      }],
      'react-native-reanimated/plugin', // ¡siempre último!
    ],
  };
};
