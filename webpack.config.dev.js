const path = require('path');

module.exports = {
  ...require('./webpack.config.js'),
  devtool: 'inline-source-map',
  mode: 'development',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dev')
  }
};