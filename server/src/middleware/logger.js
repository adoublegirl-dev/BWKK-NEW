const morgan = require('morgan');

/**
 * 请求日志中间件
 */
const logger = morgan((tokens, req, res) => {
  const status = tokens.status(req, res);
  const color = status >= 400 ? '\x1b[31m' : '\x1b[32m';

  return [
    `\x1b[36m[${new Date().toISOString()}]\x1b[0m`,
    tokens.method(req, res),
    tokens.url(req, res),
    `${color}${status}\x1b[0m`,
    `${tokens['response-time'](req, res)}ms`,
    `- ${tokens.res(req, res, 'content-length') || 0} bytes`,
    req.user ? `user=${req.user.id}` : '',
  ].filter(Boolean).join(' ');
});

module.exports = logger;
