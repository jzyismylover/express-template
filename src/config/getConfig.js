let config;

// 区分不同环境
const env = process.config.env ?? 'local'

if(env === 'local') {
  config = require('./config')
} else {
  config = require(`./config.${env}`)
}

module.exports = config;