const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: './src/index.js',
  plugins:[
    new CleanWebpackPlugin(),
    new CopyPlugin(
      [
        {
          from: path.resolve(__dirname, 'src/**/*.php'),
          to: path.resolve(__dirname, 'dist'),
          flatten: true
        },
      ],
      { copyUnmodified: true }
    ),
    new MiniCssExtractPlugin({
      filename: "style.css"
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", {
                "useBuiltIns": "usage",
                "corejs": "3"
              }]
            ]
          }
        }
      },
      {
        test: /\.(sa|sc|c*)ss$/, // match .sass, .scss, or .css
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            // This loader resolves url() and @imports inside CSS
            loader: "css-loader",
          },
          {
            // Then we apply postCSS fixes like autoprefixer and minifying
            loader: "postcss-loader",
            options: {
              ident: 'postcss',
              plugins: () => {
                return process.NODE_ENV === 'production' ? [
                  require('autoprefixer')(),
                  require('cssnano')({
                    preset: ['default', {discardComments: false}],
                  })
                ] : []
              }
            }
          },
          {
            // First we transform SASS to standard CSS
            loader: "sass-loader",
            options: {
              implementation: require("sass")
            }
          }
        ]
      },
      {
        // Now we apply rule for images
        test: /\.(png|jpe?g|gif|svg)$/,
        use: [
          {
            loader: "file-loader",
            options: {
              outputPath: 'images'
            }
          }
        ]
      },
      {
        // Apply rule for fonts files
        test: /\.(woff|woff2|ttf|otf|eot)$/,
        use: [
          {
            loader: "file-loader",
            options: {
              outputPath: 'fonts'
            }
          }
        ]
      }
    ]
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: process.NODE_ENV === 'production' ? 'production' : 'development'
};