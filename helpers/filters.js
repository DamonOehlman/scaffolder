var path = require('path');

exports.jsOnly = function(file) {
  return path.extname(file).toLowerCase() === '.js';
}