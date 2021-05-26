'use strict';

const path = require('path');
const pkgDir = require('pkg-dir');
const pathExists = require('path-exists');
const fse = require('fs-extra');
const npmInstall = require('npminstall');
const formatPath = require('@freedom-dev-cli/format-path');
const { isObject } = require('@freedom-dev-cli/utils');
const { getNpmLatestVersion } = require('@freedom-dev-cli/get-npm-info');

class Package {
  constructor(options) {
    if (!options) {
      throw new Error('argument options in the constructor of Package is of empty');
    }
    if (!isObject(options)) {
      throw new Error('argument options in the constructor of Package is not Object');
    }
    // package的目标路径
    this.targetPath = options.targetPath;
    // 缓存package路径
    this.storeDir = options.storeDir;
    // package名称
    this.packageName = options.packageName;
    // package版本
    this.packageVersion = options.packageVersion;
    // package的缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace('/', '_');
  }

  get cacheFilePath() {
    // oksht-utils 1.0.1 转化为 ${this.storeDir}/_oksht-utils@1.0.1@oksht-utils
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
  }

  getSpecificCacheFilePath(latestPackageVersion) {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${latestPackageVersion}@${this.packageName}`)
  }

  async prepare() {
    if (this.storeDir && !await pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir);
    }
    if (this.packageVersion === 'latest') {
      // 获取最新的版本
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  // 判断当前 Package 是否存在
  async exists() {
    if (this.storeDir) {
      await this.prepare();
      return await pathExists(this.cacheFilePath);
    }
    return await pathExists(this.targetPath);
  }

  downLoad(version) {
    return npmInstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: 'https://registry.npmjs.org',
      pkgs: [
        { name: this.packageName, version },
      ],
    })
  }

  // 安装Package
  async install() {
    await this.prepare();
    return this.downLoad(this.packageVersion);
  }

  // 更新Package
  async update() {
    await this.prepare();
    // 获取最新npm模块版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    // 查询最新版本号对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    // 如果不是最新版本 则安装最新版本
    if (!await pathExists(latestFilePath)) {
      await this.downLoad(latestPackageVersion);
    }
    this.packageVersion = latestPackageVersion;
  }

  // 获取入口文件路径
  async getRootFilePath() {
    async function _getRootFilePath(paths) {
      // 获取package.json所在目录  pkg-dir
      const rootDir = await pkgDir(paths);
      if (rootDir) {
        // 读取package.json - require()
        const pkgFile = require(path.join(rootDir, 'package.json'));
        // main/lib
        if (pkgFile && pkgFile.main) {
          // 路径兼容 masOs windows
          return formatPath(path.resolve(rootDir, pkgFile.main));
        }
      }
      return null;
    }

    // 如果存在缓存路径
    if (this.storeDir) {
      return await _getRootFilePath(this.cacheFilePath);
    } else {
      return await _getRootFilePath(this.targetPath);
    }
  }
}

module.exports = Package;
