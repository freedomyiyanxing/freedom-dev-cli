'use strict';

const log = require('npmlog');

log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info'; // 判断 debug 模式
log.heading = 'freedom'; // 修改日志输出前缀
log.headingStyle = { fg: 'black', bg: 'white' }; // 修改前缀颜色
log.addLevel('success', 2000, { fg: 'green', bold: true }); // 添加自定义 success 方法

module.exports = log;

