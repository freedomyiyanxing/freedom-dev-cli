'use strict';

module.exports = core;

const { homedir } = require('os');
const path = require('path');
const pathExists = require('path-exists').sync;
const colors = require('colors/safe');
const semver = require('semver');
const { Command } = require('commander');
const log = require('@freedom-dev-cli/log');
const exec = require('@freedom-dev-cli/exec');
const { getNpmSemverVersion } = require('@freedom-dev-cli/get-npm-info');
const pkg = require('../package');
const { DEFAULT_CLI_HOME } = require('./const');

const userHome = homedir();
const program = new Command();

async function core() {
  try {
    await prepare();
    registerCommand();
  } catch (e) {
    log.error('错误对象', e.message);
    if (process.env.LOG_LEVEL === 'verbose') {
      console.log(e);
    }
  }
}

/**
 * 命令注册
 */
function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调式模式', true)
    .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '');


  program
    .command('init [projectName]')
    .option('-f --force', '是否强制初始化项目')
    .action(exec);

  // 监听debug
  program.on('option:debug', () => {
    const options = program.opts();
    if (options.debug) {
      process.env.LOG_LEVEL = 'verbose';
    } else {
      process.env.LOG_LEVEL = 'info';
    }
    log.level = process.env.LOG_LEVEL;
  });

  // 监听targetPath
  program.on('option:targetPath', () => {
    const options = program.opts();
    if (options.targetPath) {
      process.env.CLI_TARGT_PATH = options.targetPath;
    }
  });

  // 对未知命令监听
  program.on('command:*', (arr) => {
    // 查询可用命令
    const availableCommands = program.commands.map((cmd => cmd.name()));
    console.log(colors.red('未知命令: ' + arr[0]));
    if (availableCommands.length) {
      console.log(colors.red('可用命令:' + availableCommands.join('、')));
    }
    process.exitCode = 1;
  });

  program.parse(process.argv);

  // 判断用户是否有输入参数  如果没有则输出帮助文档
  if (Array.isArray(program.args) && !program.args.length) {
    // program.outputHelp();
  }
}

async function prepare() {
  checkPkgVersion();
  checkRoot();
  checkUserHome();
  checkEnv();
  // await checkGlobalUpdate();
}

/**
 * 检查版本更新
 * @returns {Promise<void>}
 */
async function checkGlobalUpdate() {
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  const lastVersion = await getNpmSemverVersion(npmName, currentVersion);
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn('警告', colors.yellow(`请手动更新${npmName}, 当前版本：${currentVersion}, 最新版本：${lastVersion}  更新命令：npm install -g ${npmName}`));
  }
}

/**
 * 读取 C/user/freedom.yi/.env 文件配置
 */
function checkEnv() {
  const dotenv = require('dotenv');
  const dotenvPath = path.resolve(userHome, '.env');
  if (pathExists(dotenvPath)) {
    // 把 .env 的数据 注入到 环境变量中
    dotenv.config({
      path: dotenvPath,
    });
  }
  createDefaultConfig();
}

/**
 * 跟目录
 */
function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig['cliHome'] = path.join(userHome, DEFAULT_CLI_HOME);
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

/**
 * 检查用户主目录
 */
function checkUserHome() {
  const userUrl = userHome;
  if (!userUrl || !pathExists(userUrl)) {
    throw new Error(colors.red('当前登录用户主目录不存在'));
  }
}

/**
 * 对root权限进行优雅降级
 */
function checkRoot() {
  require('root-check')();
}

/**
 * 检查cli版本
 */
function checkPkgVersion() {
  log.info('脚手架启动中...', pkg.version);
}
