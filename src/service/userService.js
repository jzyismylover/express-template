const md5 = require("md5");
const MyError = require("../exception");
const { Op } = require("sequelize");
const {
  NO_AUTH_ERROR_CODE,
  REQUEST_PARAMS_ERROR_CODE,
  NOT_FOUND_ERROR_CODE,
} = require("../exception/errorCode");
const UserModel = require("../model/user");

const SALT = "%EXPRESS%";

/**
 * 获取当前用户
 * @param {*} req
 * @returns
 */
async function getLoginUser(req) {
  const { userInfo } = req.session;
  if (!userInfo?.id) {
    throw new MyError(NO_AUTH_ERROR_CODE, "未登陆");
  }
  const currentUser = await UserModel.findByPk(userInfo.id);
  if (!currentUser) {
    throw new MyError(NOT_FOUND_ERROR_CODE, "找不到该用户");
  }

  return currentUser;
}

/**
 * 用户注册
 * @param {*} username
 * @param {*} password
 * @param {*} email
 * @returns {Promise<boolean>}
 */
async function userRegister(username, password, email) {
  if (!username || !password || !email) {
    throw new MyError(REQUEST_PARAMS_ERROR_CODE, "参数错误");
  }
  if (username > 32) {
    throw new MyError(REQUEST_PARAMS_ERROR_CODE, "用户名过长");
  }
  const regEmail =
    /^[A-Za-z0-9\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/;
  if (!regEmail.test(email)) {
    throw new MyError(REQUEST_PARAMS_ERROR_CODE, "邮箱非法");
  }

  let user = await UserModel.findOne({
    where: {
      [Op.or]: [{ username }, { email }],
    },
  });
  if (user) {
    throw new MyError(REQUEST_PARAMS_ERROR_CODE, "该用户名或邮箱已经被注册");
  }

  // 插入新用户
  const cryptoPassword = md5(password + SALT);
  user = await UserModel.create({
    username,
    password: cryptoPassword,
    email,
  });
  return user.id;
}

/**
 * 用户登陆
 * @param {*} username
 * @param {*} password
 * @param {*} req 指代当前请求
 * @returns {Promise<null|*>}
 */
async function userLogin(username, password, req) {
  if (!username || !password) {
    throw new MyError(REQUEST_PARAMS_ERROR_CODE, "参数错误");
  }

  const user = await UserModel.findOne({
    attributes: { exclude: ["password"] }, // 排除返回密码字段
    where: {
      username,
      password: md5(password + SALT),
    },
  });

  if (!user) {
    throw new MyError(REQUEST_PARAMS_ERROR_CODE, "用户不存在或密码错误");
  }

  req.session.userInfo = user;
  return user;
}

module.exports = {
  getLoginUser,
  userRegister,
  userLogin,
};
