'use strict';

const axios = require('axios').create();
const urlJoin = require('url-join');
const semver = require('semver');

function mySort(arr) {
  return arr.sort((a, b) => {
    if (semver.gt(a, b)) {
      return -1
    }
    return 1;
  })
}

function getNpmInfo(name, registry = 'https://registry.npmjs.org/') {
  if (!name) {
    return;
  }
  const npmInfoUrl = urlJoin(registry, name);
  return axios.get(npmInfoUrl).then((res) => {
    if (res.status === 200) {
      return res.data;
    }
    return null;
  }).catch((err) => Promise.reject(err))
}

/**
 * 获取版本数据
 * @param name
 * @param registry
 * @returns {Promise<void>}
 */
async function getNomVersion(name, registry) {
  const data = await getNpmInfo(name, registry);
  return data ? Object.keys(data.versions) : [];
}

/**
 * 获取大于当前版本号的 版本号数组
 * @param baseVersion 当前版本
 * @param versions 版本数组
 * @returns {*[]|*}
 */
function getNpmSemverVersions(baseVersion, versions) {
  if (Array.isArray(versions)) {
    return mySort(versions.filter((version) => semver.satisfies(version, `^${baseVersion}`)))
  }
  return [baseVersion];
}

async function getNpmSemverVersion(name, baseVersion, registry) {
  const versions = await getNomVersion(name, registry);
  return getNpmSemverVersions(baseVersion, versions)[0] || baseVersion;
}

async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNomVersion(npmName, registry);
  return mySort(versions)[0];
}

module.exports = {
  getNpmSemverVersion,
  getNpmLatestVersion,
};
