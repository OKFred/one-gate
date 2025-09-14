cd ./server
docker build -t registry.cn-hangzhou.aliyuncs.com/one-registry/node-server-server .
docker push registry.cn-hangzhou.aliyuncs.com/one-registry/node-server-server

cd ..
cd ./platform
docker build -t registry.cn-hangzhou.aliyuncs.com/one-registry/node-server-platform .
docker push registry.cn-hangzhou.aliyuncs.com/one-registry/node-server-platform

cd ..
docker compose up -d