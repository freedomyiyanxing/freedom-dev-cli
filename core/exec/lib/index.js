'use strict';

const path = require('path');
const Package = require('@freedom-dev-cli/package');
const log = require('@freedom-dev-cli/log');
const { execSpawn } = require('@freedom-dev-cli/utils');

const SETTINGS = {
  'init': '@freedom-dev-cli/init',
};

const CACHE_DIR = 'dependencies';

async function exec() {
  let targetPath = process.env.CLI_TARGT_PATH;
  let pkg;
  log.verbose('targetPath', targetPath);

  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = 'latest';
  if (!targetPath) {
    const homePath = process.env.CLI_HOME_PATH;
    targetPath = path.resolve(homePath, CACHE_DIR);
    // 生产缓存目录
    const storeDir = path.resolve(targetPath, 'node_modules');
    log.verbose('homePath', homePath);
    log.verbose('targetPath', targetPath);
    log.verbose('storeDir', storeDir);
    log.verbose('packageName', packageName);
    log.verbose('packageVersion', packageVersion);

    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });

    if (await pkg.exists()) {
      // 更新 package
      await pkg.update();
    } else {
      // 安装 package
      await pkg.install();
    }

  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }
  const pkgFile = await pkg.getRootFilePath();
  log.verbose('pkgFile', pkgFile);
  if (pkgFile) {
    try {
      // 在当前进程中调用
      // require(pkgFile).call(null, Array.from(arguments));
      // 在子进程中调用
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];
      const o = Object.create(null);
      Object.keys(cmd).forEach((key) => {
        // 移除 cmd 原型链上的属性 过滤 _开头的key 过滤 key === parent
        if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
          o[key] = cmd[key];
        }
      });
      args[args.length - 1] = o;
      const code = `require('${pkgFile}').call(null, ${JSON.stringify(args)})`;
      const child = execSpawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit', // 通过相应的stdio流往返于父进程 (将子进程的流输出到父进程)
      });
      child.on('error', (e) => {
        log.error('', e.message);
        process.exit(1);
      });
      child.on('exit', (e) => {
        log.verbose('exit', '命令执行成功:' + e);
        process.exit(e);
      })
    } catch (e) {
      log.error('', e.message)
    }
  }
}

module.exports = exec;
