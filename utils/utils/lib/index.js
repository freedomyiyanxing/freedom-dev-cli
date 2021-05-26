'use strict';

function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

// 下载的loading组件
function spinner(msg = 'loading', spinnerString = '|/-\\') {
  const Spinner = require('cli-spinner').Spinner;
  const spinner = new Spinner(msg + ' %s');
  spinner.setSpinnerString(spinnerString);
  spinner.start();
  return spinner;
}

// 让当前进程暂停
function sleep(time = 1) {
  return new Promise(resolve => setTimeout(resolve, time * 1000));
}

// 转换不合法的包名
function transformPkgName(name) {
  return name.replace('/', '_');
}

// 兼容windows
function execSpawn(command, args, options) {
  const win32 = process.platform === 'win32';
  const cmd = win32 ? 'cmd' : command;
  const cmdArgs = win32 ? ['/c', command, ...args] : args;
  return require('child_process').spawn(cmd, cmdArgs, options || Object.create(null));
}

function execSpawnAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = execSpawn(command, args, options);
    p.on('error', e => {
      reject(e);
    });
    p.on('exit', c => {
      resolve(c);
    });
  })
}

// 判断项目名称是否合法
function isValidName(name) {
  // 首字符必须为英文, 中间可以是字符数字—_  尾字符必须为英文和数字
  return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(name)
}

module.exports = {
  isObject,
  spinner,
  sleep,
  execSpawn,
  execSpawnAsync,
  transformPkgName,
  isValidName,
};
