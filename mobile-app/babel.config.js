module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@redux': './src/redux',
            '@services': './src/services',
            '@utils': './src/utils',
            '@types': './src/types',
            '@styles': './src/styles',
            '@hooks': './src/hooks',
            '@assets': './src/assets'
          }
        }
      ],
      'react-native-reanimated/plugin'
    ]
  };
};
