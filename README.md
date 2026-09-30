# 图轻松 —— 图片工具箱(变现小项目)

纯前端图片工具站,图片 100% 本地处理、不上传服务器,「免费引流 + 会员付费」变现。

线上地址:https://tuqingsong.pages.dev

## 功能

- ✅ 图片压缩(质量滑块 / 目标大小,实时显示省了多少)
- ✅ 格式转换(JPG / WebP / PNG)
- ✅ 加水印(可选,不强制)
- ✅ 调整尺寸 / 旋转翻转 / 裁剪
- ✅ 调色 / 滤镜(亮度、对比度、饱和度、黑白、复古)
- ✅ 图片转 PDF(每张一页,合并下载)
- ✅ 图片转 Base64(生成 Data URL)
- ✅ 拼图(横向 / 纵向 / 网格 / 九宫格,会员)
- ✅ 图片本地处理,隐私安全

## 免费 vs 会员

| 功能 | 免费版 | 会员 |
|---|---|---|
| 压缩 / 转格式 / 水印 / 缩放 / 旋转 / 裁剪 / 调色 | ✅(限 1 张) | ✅(批量) |
| 批量处理 | ❌(一次 1 张) | ✅ |
| 高清输出 | 质量 ≤80% | 质量 100% |
| 拼图 | ❌ | ✅ |
| 转 PDF | 单张 | 多张 |
| 价格 | 免费 | ¥9.9/月 · ¥16.6/季 · ¥24.4/半年 · ¥36.6/年 |

> 不再给免费用户强制打水印 —— 水印完全可选,变现靠「批量 + 高清 + 拼图」等进阶功能。

## 账号与会员系统

- 注册:用户名 + 邮箱 + 密码(邮箱唯一);登录支持用户名或邮箱
- 密码加盐哈希(PBKDF2)存 Cloudflare KV,不存明文
- 激活码激活后绑定账号,会员权益跨设备生效
- 激活码在后端校验(Cloudflare Pages Functions),不在前端暴露

## 技术栈 / 部署

- 静态站点:`index.html` + `style.css` + `app.js`
- 后端:Cloudflare Pages Functions(`functions/api/*`),账号数据存 Cloudflare KV(绑定名 `USERS`)
- 环境变量:`MASTER_CODE`(主控码)、`VALID_CODES`(有效激活码列表)、`XH_APPID`/`XH_SECRET`(虎皮椒支付)
- 部署:GitHub 仓库 → Cloudflare Pages(Git 集成自动部署)

## 文件结构

```
image-tools/
├── index.html           页面结构(10 个工具独立界面)
├── style.css            样式(浅色蓝白主题)
├── app.js               前端逻辑(工具处理 + 账号 + 支付)
├── pay-qr.jpg           收款二维码
├── functions/
│   ├── _lib/auth.js     账号公共工具(哈希 / 会话)
│   └── api/             register / login / me / logout / activate / admin / pay
└── tools/               激活码生成(不入库,.gitignore 排除)
```
