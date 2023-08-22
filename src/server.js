const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const MyError = require("./exception");

const redis = require("redis");
const { redisConfig } = require("./config/getConfig");
const expressSession = require("express-session");
const RedisStore = require("connect-redis")(expressSession);

// 创建Redis配置连接
const redisClient = redis.createClient(
  Object.assign(redisConfig, { legacyMode: true }) // 必须开启 legacy 模式
);
redisClient.on("connect", () => {
  console.log("Redis client connected");
});
redisClient.on("error", (e) => {
  console.error(e);
});
redisClient.connect()

// 请求大小限制
const requestLimit = "5120kb";

// Express实例
class ExpressServer {
  constructor() {
    this.app = express();
    this.contextPath = "/api";
    this.app.use(morgan("short"));
    // extends:false -> 使用node>querystring处理
    this.app.use(
      bodyParser.urlencoded({ extended: false, limit: requestLimit })
    );
    this.app.use(bodyParser.json({ limit: requestLimit }));
    this.app.disabled("x-powered-by");
    this.app.all("*", (req, res, next) => {
      res.setHeader("Access-Control-Allow-Credentials", "true"); // 允许携带 cookie
      const origin = req.get("Origin");
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
      // 允许跨域请求的方法
      res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, GET, OPTIONS, DELETE, PUT"
      );
      // 允许跨域请求 header 携带哪些东西
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, If-Modified-Since"
      );

      next();
    });

    const sessionOptions = {
      store: new RedisStore({ client: redisClient }),
      name: "session_id",
      secret: "%jzy%",
      resave: false,
      saveUninitialized: true,
      rolling: true,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 30,
        httpOnly: true,
      },
    };
    
    this.app.use(expressSession(sessionOptions));
    this.server = http.createServer(this.app);
  }

  setRoute(method = "post", path, handlerFunction) {
    const handler = async (req, res) => {
      // IP 过滤
      const requestClientIp = getClientIp(req);
      if (!requestClientIp) {
        return FORBIDDEN_ERROR_CODE;
      }
      // 记录初始时间
      const startTime = new Date().getTime();

      let result;
      const data = methodsHandlerMapping.get(method)?.(req, requestClientIp);
      try {
        result = await handlerFunction(data, req, res);

        result = {
          code: 0,
          data: result,
        };
        console.log(
          `req end path = ${
            req.path
          }, clientIp = ${requestClientIp}, params = ${JSON.stringify(
            data
          )}, costTime = ${new Date().getTime() - startTime}`
        );
      } catch (e) {
        // 全局异常处理
        if (e instanceof MyError) {
          result = {
            code: e.code,
            message: e.message,
            data: null,
          };
        } else {
          result = {
            code: 500,
            data: null,
            message: "server error",
          };
        }
        console.error(
          `req error path = ${
            req.path
          }, clientIp = ${requestClientIp}, params = ${JSON.stringify(data)}`,
          e
        );
      }
      res.send(result);
    };

    this.app[method](this.contextPath + path, handler);
  }

  // 监听端口运行
  listen(port) {
    this.server.listen(port);
    let url = `http://localhost:${port}`;
    if (this.contextPath) {
      url += this.contextPath;
    }
    console.log(`server start at ${url}, env = ${process.env.NODE_ENV}`);
  }
}

// 获取真实客户端 ip
function getClientIp(req) {
  if (!req) {
    return "";
  }
  return (
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    req.ip
  );
}

/**
 * 映射不同请求方法 handler
 */

const methodsHandlerMapping = new Map();
methodsHandlerMapping.set("get", setGetHandler);
methodsHandlerMapping.set("post", setPostHandler);

function setPostHandler(req, requestClientIp) {
  const event = req.body;
  let params; // 仅仅是为了console输出内容
  if (event.file) {
    let eventCopy = { ...event };
    eventCopy.file = undefined;
    params = JSON.stringify(eventCopy);
  } else {
    params = JSON.stringify(event);
  }
  logger(req, requestClientIp, params);
  return event;
}

function setGetHandler(req, requestClientIp) {
  const event = req.query;
  logger(req, requestClientIp, JSON.stringify(event));
  return event;
}

function logger(req, requestClientIp, params = "") {
  console.log(
    `req start path = ${req.path}, clientIp = ${requestClientIp}, params = ${params}`
  );
}

module.exports.ExpressServer = ExpressServer;
