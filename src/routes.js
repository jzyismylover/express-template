const { userRegisterApi, userLoginApi, userLogoutApi, getLoginUserApi } = require("./controller/userController");

const routes = [
  {
    method: 'post',
    path: '/user/register',
    handler: userRegisterApi
  },
  {
    method: 'post',
    path: '/user/login',
    handler: userLoginApi
  },
  {
    method: 'post',
    path: '/user/logout',
    handler: userLogoutApi
  },
  {
    method: 'post',
    path: '/user/current',
    handler: getLoginUserApi
  },
  {
    method: 'get',
    path: '/haha',
    handler: (event, req, res) => {
      console.log('get handler')
      return 'get handler'
    }
  }
];

module.exports = routes;