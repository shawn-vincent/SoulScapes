// craco.config.js
const path = require('path');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const webpack = require('webpack'); // Import webpack


module.exports = {
    webpack: {
	configure: (webpackConfig, { env, paths }) => {
	    // Remove the ModuleScopePlugin so that imports outside of src/ are allowed.
	    webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
		(plugin) => plugin.constructor.name !== 'ModuleScopePlugin'
	    );
	    
	    // Add fallbacks for Node.js core modules that are not polyfilled in Webpack 5.
	    webpackConfig.resolve.fallback = {
		fs: false,       // 'fs' is not available in the browser.
		http: false,     // 'http' is not available in the browser.
		https: false,    // 'https' is not available in the browser.
		url: false,      // 'url' is not available; set to false or provide a polyfill if needed.
		path: require.resolve('path-browserify') // Polyfill for 'path'
	    };

	    // Disable the default error overlay in development mode:
	    if (webpackConfig.devServer) {
		webpackConfig.devServer.client = {
		    overlay: { errors: false, warnings: false },
		};
	    }

	       // Add ProvidePlugin
            webpackConfig.plugins.push(
                new webpack.ProvidePlugin({
                    PIXI: 'pixi.js', // Automatically import pixi.js and make it available as PIXI
                })
            );


	    return webpackConfig;
	}
    }
};
