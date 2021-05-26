'use strict';
const semver = require('semver');
const colors = require('colors/safe');
const log = require('@freedom-dev-cli/log');

// 定义允许最低版本node
const LOWEST_NODE_VERSION = '12.0.0';

class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error('Command constructor 参数不能为空!')
    }
    if (!Array.isArray(argv)) {
      throw new Error('Command constructor 参数不是一个数组!')
    }
    if (!argv.length) {
      throw new Error('Command constructor 参数数组为空!')
    }
    this._argv = argv;
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve(true);
      chain = chain.then(() => this.checkNodeVersion());
      chain = chain.then(() => this.initArgs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());
      chain.catch((err) => {
        log.error('', err.message);
      });
    });
  }

  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, this._argv.length - 1);
  }

  /**
   * 检查Node版本
   */
  checkNodeVersion() {
    // 第一步, 获取当前Node版本
    const currentVersion = process.version.slice(1);
    // 第二步, 对比最低版本
    if (!semver.gte(currentVersion, LOWEST_NODE_VERSION)) {
      throw new Error(colors.red(`freedom-dev-cli 需要安装${LOWEST_NODE_VERSION}以上版本 NodeJs`))
    }
  }

  init() {
    throw new Error('必须重写基类的 init')
  }

  exec() {
    throw new Error('必须重写基类的 exec')
  }
}

module.exports = Command;
