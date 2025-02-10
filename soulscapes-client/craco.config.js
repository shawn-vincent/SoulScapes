// craco.config.js
const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Filter out ModuleScopePlugin so that imports from outside src/ are allowed.
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ModuleScopePlugin'
      );

      // Optionally, if you want to allow only specific external directories,
      // you could instead modify the ModuleScopePlugin instance rather than removing it entirely.

      return webpackConfig;
    }
  }
};
