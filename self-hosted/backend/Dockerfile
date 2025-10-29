# 后端 Dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install --only=production

# 复制源代码
COPY . .

# 创建必要的目录
RUN mkdir -p logs data

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["npm", "start"]
