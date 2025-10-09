This repo is part of a short-link-service based on [ccbikai/hink](https://github.com/ccbikai/hink).

## slink 生成流程
1. 访问 https://a.c-o.cc/gen 填入内容和密钥
2. 内容和密钥传到 worker，对称加密后获得 commit content，调用 GitHub API 进行 commit
3. commit 成功得到 commit hash 返回给前端
4. 前端展示前六位

## slink 访问流程
1. 访问 https://c-o.cc/{hash}/{key}
2. worker 校验合法后，fetch `${GIT_REPO}/commit/${commitHash}.patch` 获得加密后的内容
3. 解密后，如果是链接则 redirect，否则展示内容
