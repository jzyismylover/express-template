FROM node:16-slim

# 定义工作目录
WORKDIR /usr/src/app

COPY ./ ./

RUN npm install

# 安装 pm2
RUN npm install pm2 -g
CMD pm2-runtime 'npm start'