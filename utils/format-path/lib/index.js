'use strict';

const path = require('path');

/**
 * 路径兼容 masOs windows
 * @param p
 * @returns {string}
 * D:\init\lib\index.js 替换成 D:/init/lib/index.js
 */
function formatPath(p) {
  if (p && typeof p === 'string' && path.sep === '\\') {
    return p.replace(/\\/g, '/')
  }
  return p;
}

module.exports = formatPath;
