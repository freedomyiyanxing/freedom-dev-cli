const request = require('@freedom-dev-cli/request');

module.exports = async () => {
  const result = await request({
    url: '/template/find',
  });
  return result.data;
};
