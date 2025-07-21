const serverlessExpress = require('@codegenie/serverless-express');
const app = require('./dist/index.js');

exports.handler = serverlessExpress({ app });