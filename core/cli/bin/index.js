#! /usr/bin/env node

const importLocal = require('import-local');

if (importLocal(__filename)) {
  require('npmlog').info('cli:log ->', '正在使用 freedom-dev-cli 本地版本')
} else {
  require('../lib')(process.argv.slice(2));
}