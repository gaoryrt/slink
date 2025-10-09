This repo is part of a short-link-service based on [ccbikai/hink](https://github.com/ccbikai/hink).

## 部署设置

### 1. 设置 GitHub Token
在部署之前，你需要设置 GitHub token 作为 Cloudflare Worker 的密钥：

```bash
wrangler secret put GITHUB_TOKEN
```

然后输入你的 GitHub Personal Access Token。这个 token 需要以下权限：
- `repo` (完整仓库访问权限)
- `workflow` (如果需要 GitHub Actions 权限)

### 2. 部署
```bash
wrangler deploy
```

## slink 生成流程
1. 访问 https://a.c-o.cc/ 填入内容和密钥
2. 内容和密钥传到 worker，对称加密后获得 commit content，调用 GitHub API 进行 commit
3. commit 成功得到 commit hash 返回给前端
4. 前端展示前六位

## slink 访问流程
1. 访问 https://c-o.cc/{hash}/{key}
2. worker 校验合法后，fetch `${GIT_REPO}/commit/${commitHash}.patch` 获得加密后的内容
3. 解密后，如果是链接则 redirect，否则展示内容
