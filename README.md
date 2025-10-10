This repo is inspired by [ccbikai/hink](https://github.com/ccbikai/hink).

# slink is a short link service
借用 cf workers 计算，github 储存，实现短链服务。
- 拥有生成前端
- 隐藏长短链
- 如果短链的背后不是合法链接，则不会302而是展示内容。

## How
### 生成流程
- 前端填入内容和密钥，点击生成
- 内容和密钥传到 worker，对称加密后生成 commit content
- 调用 GitHub API 进行 commit
- commit 成功得到 commitHash 返回给前端

### 访问
- 访问 https://{domain}/{commitHash}/{key}
- worker 校验合法后，fetch `${GIT_REPO}/commit/${commitHash}.patch` 获得加密后的 commit content
- 使用 key 解密后，如果是链接则 redirect，否则展示内容
