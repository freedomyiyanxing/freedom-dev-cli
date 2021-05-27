'use strict';

const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const inquirer = require('inquirer');
const fse = require('fs-extra');
const semver = require('semver');
const ejs = require('ejs');
const glob = require('glob');
const kebabCase = require('kebab-case');
const Command = require('@freedom-dev-cli/command');
const Package = require('@freedom-dev-cli/package');
const log = require('@freedom-dev-cli/log');
const { spinner, execSpawnAsync, isValidName } = require('@freedom-dev-cli/utils');
const getProjectTemplate = require('./getProjectTemplate');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';

const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';

const WHITE_COMMAND = ['npm', 'cnpm', 'yarn'];

// 获取用户主目录
const userHome = homedir();

class InitCommand extends Command {
  constructor(arg) {
    super(arg);
    this.template = null;
    this.templateInfo = null;
    this.projectInfo = null;
  }

  init() {
    this.projectName = this._argv[0] || '';
    this.force = !!this._argv[1].force;
    log.verbose(this.projectName, this.force);
  }

  async exec() {
    try {
      // 初始化项目信息
      this.projectInfo = await this.prepare();
      if (this.projectInfo) {
        log.verbose('project info: ', this.projectInfo);
        // 下载模板
        await this.downloadTemplate();
        // 安装模板
        await this.installTemplate();
      }
    } catch (e) {
      log.error('', e.message);
    }
  }

  // 安装模板
  async installTemplate() {
    if (!this.templateInfo) {
      throw new Error('项目模板信息不存在');
    }
    // 如果没有项目安装类型  或 无法识别的类型  全部走标准安装
    if ((!this.templateInfo.type) || this.templateInfo.type !== TEMPLATE_TYPE_NORMAL || this.templateInfo.type !== TEMPLATE_TYPE_CUSTOM) {
      this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
    }

    // 标准安装
    if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
      await this.installNormalTemplate();
      return;
    }

    // 自定义安装
    if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
      // await this.installCustomTemplate();
    }
  }

  // 检测cmd白名度
  checkCommand(cmd) {
    return WHITE_COMMAND.includes(cmd) ? cmd : null;
  }

  async execCommand(cmdStr) {
    if (cmdStr && typeof cmdStr === 'string') {
      const cmds = cmdStr.split(' ');
      const cmd = this.checkCommand(cmds[0]);
      if (!cmd) {
        throw new Error('非法命令！' + cmd);
      }
      const args = cmds.slice(1);
      return await execSpawnAsync(cmd, args, {
        stdio: 'inherit', // 设置子进程的输出流 到父进程
        cwd: process.cwd(),
      });
    }
    return null;
  }

  async ejsRender(options = Object.create(null)) {
    const cwd = process.cwd();
    return new Promise((resolve, reject) => {
      // 遍历所有文件
      glob('**', {
        cwd, // 遍历的位置
        ignore: options.ignores || '', // 忽略某些文件
        nodir: true, // 过滤文件夹
      }, (err, files) => {
        if (err) {
          reject(err);
        }
        Promise.all(files.map(file => {
          const filePath = path.resolve(cwd, file);
          return new Promise((resolve1, reject1) => {
            ejs.renderFile(filePath, this.projectInfo, (err, result) => {
              if (err) {
                reject1(err);
              } else {
                // ejs 修改完成后 使用fs.writeFileSync把修改后的内容写入文件中
                fs.writeFileSync(filePath, result);
                resolve1(result);
              }
            })
          });
        })).then(resolve).catch(reject)
      })
    })
  }

  // 标准安装
  async installNormalTemplate() {
    const s = spinner('正在导入模板...');
    try {
      // 拷贝模板至当前目录
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
      // 获取当前目录
      const targetPath = process.cwd();
      // 确保文件存在
      fse.ensureDirSync(targetPath);
      // 模板拷贝
      fse.copySync(templatePath, targetPath);
    } catch (e) {
      throw e;
    } finally {
      s.stop(true);
      log.success('模板导入成功');
    }

    const ignores = ['node_modules/**', 'public/**'];
    await this.ejsRender({ ignores });

    const { installCommand, startCommand } = this.templateInfo;
    // 安装依赖
    let installResult = await this.execCommand(installCommand);
    if (installResult !== 0) {
      throw new Error('依赖安装失败！');
    }
    // 启动项目
    await this.execCommand(startCommand);
  }

  // 自定义安装
  async installCustomTemplate() {
  }

  // 下载模板功能
  async downloadTemplate() {
    const { projectTemplate } = this.projectInfo;
    this.templateInfo = this.template.find((item) => item.npmName === projectTemplate);
    const targetPath = path.resolve(userHome, '.freedom-dev-cli', 'template');
    const storeDir = path.resolve(userHome, '.freedom-dev-cli', 'template', 'node_modules');
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: this.templateInfo.npmName,
      packageVersion: this.templateInfo.version,
    });
    if (await templateNpm.exists()) {
      const s = spinner('正在更新模板...');
      try {
        await templateNpm.update();
        this.templateNpm = templateNpm;
      } catch (e) {
        throw e;
      } finally {
        s.stop(true);
        log.success('模板更新成功');
      }
    } else {
      const s = spinner('正在安装模板...');
      try {
        await templateNpm.install();
        this.templateNpm = templateNpm;
      } catch (e) {
        throw e;
      } finally {
        s.stop(true);
        log.success('模板安装成功');
      }
    }
  }

  async prepare() {
    // 判断项目模板是否存在
    const template = await getProjectTemplate();
    if (!(Array.isArray(template) && template.length)) {
      throw new Error('模板不存在');
    }

    this.template = template;

    const localPath = process.cwd();

    // 判断当前目录是否存在
    if (!this.isDirEmpty(localPath)) {
      // 当前目录不为空
      // 1.1 询问是否继续创建
      let isContinue = false;
      // 判断用户是否输入 --force
      if (!this.force) {
        const { ifContinue } = await inquirer.prompt({
          type: 'confirm',
          default: false,
          name: 'ifContinue',
          message: '当前文件夹不为空, 是否继续创建项目?',
        });
        isContinue = ifContinue;
        // 如果用户选择不创建项目直接退出
        if (!isContinue) {
          return false;
        }
      }

      // 启动强制更新
      if (isContinue || this.force) {
        // 二次确定用户是否一定要删除所有文件
        const { confirmDelete } = await inquirer.prompt({
          type: 'confirm',
          default: false,
          name: 'confirmDelete',
          message: '是否确定清空当前目录下的所有文件',
        });
        if (confirmDelete) {
          // 清空文件夹下面所有文件
          await fse.emptyDirSync(localPath);
        }
      }
    }

    return await this.getProjectInfo();
  }

  // 获取项目信息
  async getProjectInfo() {
    // 选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: '请选择初始化项目',
      default: TYPE_PROJECT,
      choices: [
        {
          name: '项目',
          value: TYPE_PROJECT,
        },
        {
          name: '组件',
          value: TYPE_COMPONENT,
        }
      ]
    });
    let projectInfo = Object.create(null);
    log.verbose('type', type);

    const questions = [
      {
        type: 'input',
        name: 'projectVersion',
        message: '请输入项目版本:',
        default: '1.0.0',
        validate: (v) => !!semver.valid(v),
        filter: (v) => semver.valid(v) || v,
      },
      {
        type: 'list',
        name: 'projectTemplate',
        message: '请选择项目模板',
        choices: this.createTemplateChoice(),
      }
    ];

    // 项目名称有且不合法 或者 没有项目名称
    if (!this.projectName || !isValidName(this.projectName)) {
      questions.unshift({
        type: 'input',
        name: 'projectName',
        message: '请输入项目名称:',
        default: 'freedom-dev-cli-demo',
        validate: function (v) {
          const done = this.async();
          setTimeout(() => {
            if (!isValidName(v)) {
              done('必须是合法的文件名称');
              return true;
            }
            done(null, true);
          }, 0);
        },
        filter: (v) => v,
      })
    } else {
      projectInfo.projectName = this.projectName;
    }

    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt(questions);
      projectInfo = {
        type,
        ...projectInfo,
        ...project,
      };
    }

    if (type === TYPE_COMPONENT) {
      projectInfo = Object.create(null);
    }
    // 设置className
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName;
      projectInfo.className = (kebabCase(projectInfo.projectName) || '').replace(/^-/, '');
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    // 获取项目的基本信息
    // return 项目基本信息 (object)
    return projectInfo;
  }

  // 判断当前目录是否存在
  isDirEmpty(localPath) {
    const fileList = fs.readdirSync(localPath).filter((file) => (
      !file.startsWith('.') && file !== 'node_modules'
    ));
    return !(!fileList || fileList.length);
  }

  createTemplateChoice() {
    return this.template.map((item) => ({
      name: item.name,
      value: item.npmName,
    }))
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
