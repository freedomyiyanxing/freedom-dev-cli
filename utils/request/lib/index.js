'use strict';
const axios = require('axios');

const request = axios.create({
  timeout: 5000,
  baseURL: process.env.FREEDOM_CLI_BASE_URL || 'http://localhost:3900',
});

request.interceptors.response.use(
  (response) => {
    const { status, data } = response;
    if (status === 200) {
      return Promise.resolve(data);
    }
    return Promise.reject('未知的错误');
  }
);

module.exports = request;
