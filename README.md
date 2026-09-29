# 图轻松 —— 图片压缩 / 转格式 / 加水印(变现小项目)

纯前端图片工具站,图片 100% 本地处理、不上传服务器,「免费引流 + 会员付费」变现。

线上地址:https://tuqingsong.pages.dev

## 功能

- ✅ 图片压缩(质量滑块,实时显示省了多少)
- ✅ 格式转换(JPG / WebP / PNG)
- ✅ 文字水印(位置可调)
- ✅ 批量处理(会员)
- ✅ 图片本地处理,隐私安全

## 免费 vs 会员

| 功能 | 免费版 | 会员 |
|---|---|---|
| 压缩 / 转格式 | ✅ | ✅ |
| 批量处理 | ❌(限 1 张) | ✅ |
| 高清输出 | 质量 ≤80% | 质量 100% |
| 去水印 | ❌(强制水印) | ✅ |
| 价格 | 免费 | ¥9.9/月 或 ¥49 终身 |

## 账号与会员系统

- 用户可注册 / 登录(用户名 + 密码),密码加盐哈希后存 Cloudflare KV,不存明文
- 激活码激活后绑定账号,会员权益跨设备生效
- 激活码在后端校验(Cloudflare Pages Functions),不在前端暴露

## 技术栈 / 部署

- 静态站点:`index.html` + `style.css` + `app.js`
- 后端:Cloudflare Pages Functions(`functions/api/*`),账号数据存 Cloudflare KV(绑定名 `USERS`)
- 环境变量:`MASTER_CODE`(主控码)、`VALID_CODES`(有效激活码列表)
- 部署:GitHub 仓库 → Cloudflare Pages(Git 集成自动部署)

## 文件结构

```
image-tools/
├── index.html           页面结构
├── style.css            样式(暗色主题)
├── app.js               前端逻辑(处理 + 账号)
├── pay-qr.jpg           收款二维码
├── functions/
│   ├── _lib/auth.js     账号公共工具(哈希 / 会话)
│   └── api/             register / login / me / logout / activate
└── tools/               激活码生成(不入库,.gitignore 排除)
```
