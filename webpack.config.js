const path = require('path');
const fs = require('fs');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const APP_DIR = fs.realpathSync(process.cwd());

const resolveAppPath = relativePath => path.resolve(APP_DIR, relativePath);

// get the linkvite version from package.json
// the the file name should be
// recogito.<version>.min.js
const packageJson = fs.readFileSync(resolveAppPath('package.json'));
const packageData = JSON.parse(packageJson);
const version = packageData.linkviteVersion;

module.exports = {
    entry: resolveAppPath('src'),
    output: {
        filename: `recogito.${version}.min.js`,
        library: 'Recogito',
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    devtool: 'source-map',
    performance: {
        hints: false
    },
    optimization: {
        minimize: true,
    },
    resolve: {
        extensions: ['.js', '.jsx'],
        alias: {
            'react': 'preact/compat',
            'react-dom': 'preact/compat',
            'preact/compat': path.resolve(__dirname, 'node_modules', 'preact', 'compat'),
            'preact/hooks': path.resolve(__dirname, 'node_modules', 'preact', 'hooks'),
        }
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        "presets": [
                            "@babel/preset-env",
                            "@babel/preset-react"
                        ],
                        "plugins": [
                            [
                                "@babel/plugin-proposal-class-properties"
                            ]
                        ]
                    }
                }
            },
            { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
            { test: /\.scss$/, use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'] },
            {
                test: /\.svg$/i,
                issuer: /\.[jt]sx?$/,
                use: ['@svgr/webpack'],
            },
        ]
    },
    devServer: {
        compress: true,
        hot: true,
        allowedHosts: "all",
        port: 3000,
        static: {
            directory: resolveAppPath('public'),
            publicPath: '/'
        }
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: 'head',
            template: resolveAppPath('public/index.html')
        }),
        new MiniCssExtractPlugin({
            filename: `recogito.${version}.min.css`
        })
    ]
}