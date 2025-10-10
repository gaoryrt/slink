This repo is inspired by [ccbikai/hink](https://github.com/ccbikai/hink).

## What is this?
gaoryrt/slink 可以借用 cf workers 计算与 github 储存，实现短链服务。
- 友好的前端
- 无数据库，且隐藏长短链
- 每个短链都会由本人 commit（！）

[c-o.cc](https://c-o.cc) 是 slink 的第一个实现，**在 c-o.cc 上生成短链会占用我的 cf workers 额度，且不保证持久性，请不要用于生产环境或滥用。**

## How this works
### 生成
- 前端填入内容和密钥，点击生成
- 内容和密钥传到 worker，对称加密后生成 commit content
- 调用 GitHub API 进行 commit
- commit 成功得到 commitHash 返回给前端

### 访问
- 访问 https://{domain}/{commitHash}/{key}
- worker 校验合法后，fetch `${GIT_REPO}/commit/${commitHash}.patch` 获得加密后的 commit content
- 使用 key 解密后，如果是链接则 redirect，否则展示内容

## How can I deploy my own slink?
```bash
git clone https://github.com/gaoryrt/slink.git
cd slink
npm install
npm run build
```
修改 `wrangler.jsonc` 中 vars 中的对应内容
```bash
wrangler deploy
```
在 [GitHub personal-access-tokens](https://github.com/settings/personal-access-tokens) 上 `generate new token`, Repository access 选择 `Only select repositories`, 选择 `{yourname}/slink`
permissions 选择 `publ
```bash
wrangler secret put GITHUB_TOKEN
```
部署完成后，访问 `https://{domain}` 即可看到前端
