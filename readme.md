#  express-template

:star: `express` 项目基础模板，包括 `mysql`、`redis`、`docker`



## config

> `config` 文件包含 `mysql`、`redis` 启动配置，可针对应用不同运行环境切换不同项目配置

```javascript
// getConfig.js

let config;

const env = process.config.env ?? 'local';

if (env === 'local') {
    config = require('./config')
} else {
    config = require(`./config.${env}`)
}
```

> db.js：通过 [sequelize](https://github.com/demopark/sequelize-docs-Zh-CN/blob/v6/core-concepts/getting-started.md) `orm` 工具配置连接 `mysql`

### sequelize

1. 安装对应依赖

   ```bash
   $ npm install --save sequelize mysql2
   ```

2. 创建数据库连接实例 ( `dbconfig` 指的是 `config` 暴露出来的配置 )

   ```javascript
   // 创建数据库实例
   const sequelize = new Sequelize({
     database: dbConfig.database,
     username: dbConfig.username,
     password: dbConfig.password,
     host: dbConfig.host,
     port: dbConfig.port,
     dialect: "mysql",
     logging: console.log,
   });
   
   // 测试连接
   sequelize
     .authenticate()
     .then(() => {
       console.log('MySQL client connected');
     })
     .catch((e) => {
       console.error('Unable to connect to MySQL', e);
     });
   ```

   

3. **定义模型**。有两种方式定义模型，分别是 `sequelize.define` 和 `Model.init` 两种方式，两种定义方法等效

   ```js
   const { Sequelize, DataTypes } = require('sequelize');
   const sequelize = new Sequelize('sqlite::memory:');
   
   const User = sequelize.define('User', {
     // 在这里定义模型属性
     firstName: {
       type: DataTypes.STRING,
       allowNull: false
     },
     lastName: {
       type: DataTypes.STRING
       // allowNull 默认为 true
     }
   }, {
     // 这是其他模型参数
   });
   
   ```

   

4. **模型实例**

   引用官网的一句话” 类的实例表示该模型中的一个对象(该对象映射到数据库中表的一行). 这样,模型实例就是 [DAOs](https://en.wikipedia.org/wiki/Data_access_object) “。可以理解模型实例代表的其实就是数据库表中的一行数据，在 `javascript` 里就映射为一个对象。

   - 介绍创建实例

     ```js
     User.build({})
     ```

     :warning: 需要注意的是 `build` 方法仅仅创建了一个对象并未实现对数据库数据表的修改，还需要调用异步 `save` 方法来永久保存数据
     
     ```js
     const user = User.build({ name: 'jzyismylover' })
     await user.save()
     console.log('user data save in database')
     ```
     
   - `create`

     `create` 是一个异步方法，等价于 `build` 和 `save` 方法的结合

   更多关于 [模型实例介绍](https://www.sequelize.cn/core-concepts/model-instances)

   

5. **模型查询**

   模型查询指代通过 `API` 的方式操作数据表中的数据

   - `insert` 

     ```js
     const user = await User.create();
     // fields 指定 insert 字段
     const user = await User.create({}, { fields: [] });
     ```

   - ``findByPk``：使用提供的主键从表中获得一个条目

   - `findOne`：从数据表中获得第一个条目

     ```js
     const user = await User.findOne({
         where: {
             username,
             password: cryptoPassword
         }
     })
     ```

     很多时候 `where` 可以使用以上对象的方式以 `and` 方式进行，如果需要用到 `or` 指定条件查询的话需要使用到 `Op`

     ```js
     const { Op } = require('sequelize')
     
     let user = await UserModel.findOne({
         where: {
           [Op.or]: [{ username }, { email }],
         },
       });
     ```



### redis

> 在 `express` 中使用 `redis` 需要使用到三个 `npm` 包：`redis`、`express-redis`、`connect-redis`

- `redis`：`node-redis`，在 `node` 中使用 `redis` 的必备
- `express-redis` & `connect-redis`：`express` 使用 `redis` 组合包

🔐 版本迭代使得某些包在使用上有些许不同

```js
// 创建 redis 实例
const redisClient = redis.createClient({
    url: 'redis[s]://[[username][:password]@][host][:port][/db-number]',
    legacy: true // 必须开启否则无法正常启动
})

// 手动调用连接(4.x版本)
redisClient.connect()

// 测试连接(监听不同event事件)
redisClient.on('connect', () => {})
redisClient.on('error', () => {})
```

项目中主要使用 `redis` 作为 `session` 持久化存储工具



## controller

> 控制器，后端注册 `api`



## service

> 抽取控制器中部分实现逻辑，提供代码复用性和可维护性



## routes

> 路由注册

```js
class ExpressServer () {
    constructor() {}
    setRoute() {}
}
```

项目中定义了 `ExpressServer` 类，作为 `express` 对象实例的原型，`setRoute` 方法即为实例注册路由方式

```js
setRoute(method, path, handleFn) {
  // method: 当前请求方法
  // path: 请求路径
  // handleFn controller处理函数
}
```

对于 `handleFn` 来说，其实需要传递三个参数

- `data`：网络请求中的数据（包括 `post`、`get`解析得到的 `JS` 对象）
- `req`：`express` 中请求对象（包括各种请求信息：请求头、请求方法……）
- `res`：`express` 中响应对象（用于向客户端推送信息）

🔐 `setRoute` 总的逻辑

1. 限制请求 `IP `

   ```js
   // 获取请求 ip 地址
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
   ```

   - **`X-Forwarded-For`**（XFF）请求标头是一个事实上的用于标识通过代理服务器连接到 web 服务器的客户端的原始 IP 地址的标头

2. 解析不同请求方法的参数（得到一个 `JS` 对象）

   ```js
   function setPostHandler() {
       // req.body(中间配置可以解析)
   }
   function setGetHandler() {
       // req.query(原生)
   }
   ```

3. 错误处理 —— 针对 `handleFn` 的错误处理，这是一个全局的错误处理机制，所有路由 `controller` 抛出的错误异常都会在这里被捕获，因此这里也是一个错误日志记录的好节点。

🔐  导出`routes`，并注册到 `express` 实例上

```javascript
// routes.js
const { userLoginApi } = require('./controller/user')

module.exports = [
    {
      method: 'post',
      path: '/user/login',
      handler: userLoginApi
    }
]
```

```js
// index.js
const routes = require('./routes')
const ExpressServer = require('./server')

const app = new ExpressServer()

routes.forEach(route => {
    const { method, path, handler } = route
    app.setRoute(method, path, handler)
})
```

