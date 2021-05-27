const request = require('@freedom-dev-cli/request');

const data = [
  {
    "name": "vue2标准模板",
    "npmName": "@freedom-dev-cli-template/vue2",
    "version": "1.0.0",
    "type": "normal",
    "installCommand": "yarn install",
    "startCommand": "yarn run serve"
  },
  {
    "name": "react标准模板",
    "npmName": "@freedom-dev-cli-template/react-admin",
    "version": "1.0.0",
    "installCommand": "yarn install",
    "startCommand": "yarn run start",
    "type": "normal"
  }
];

module.exports = async () => {
  let result = Object.create(null);
  try {
    result = await request({
      url: '/template/find',
    });
  } catch (e) {
    result.data = data;
  }
  return result.data;
};
