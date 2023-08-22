const MyError = require("../exception");
const {
  NOT_FOUND_ERROR_CODE,
} = require("../exception/errorCode");
const {
  userRegister,
  userLogin,
  getLoginUser,
} = require("../service/userService");

/**
 * 用户注册
 * @param {*} event body、params、query 网络请求参数
 * @param {*} req
 * @param {*} res
 */
async function userRegisterApi(event, req, res) {
  const { username, password, email } = event;

  return await userRegister(username, password, email);
}

/**
 * 用户登陆
 * @param {*} event
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function userLoginApi(event, req, res) {
  const { username, password } = event;

  return await userLogin(username, password, req);
}

/**
 * 用户注销
 * @param {*} event
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function userLogoutApi(event, req, res) {
  if (!req.session.userInfo) {
    throw new MyError(NOT_FOUND_ERROR_CODE, "未登陆");
  }
  delete req.session.userInfo;
  return true;
}

/**
 * 获取当前用户
 * @param {*} event
 * @param {*} req
 * @param {*} res
 */
async function getLoginUserApi(event, req, res) {
  return await getLoginUser(req);
}

module.exports = {
  userRegisterApi,
  userLoginApi,
  userLogoutApi,
  getLoginUserApi,
};
