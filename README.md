# 🏠 大胃袋的个人博客

基于 Hugo + GitHub Pages 的个人博客，通过 Cloudflare CDN 加速。

**网址：** <https://weidai.me>

---

## 技术栈

| 层 | 技术 |
|------|------|
| 静态生成 | Hugo v0.164.0 |
| 主题 | PaperMod（极简风格） |
| 托管 | GitHub Pages |
| CDN / DNS | Cloudflare |
| 自动部署 | GitHub Actions |
| 后台管理 | 自建 Web 面板 (`/admin.html`) |

---

## 项目结构

```
个人网站开发/
├── hugo.yaml              # 主配置文件
├── static/                # 静态资源（直接复制到输出目录）
│   ├── CNAME              # 自定义域名 weidai.me
│   ├── favicon.svg        # 网站图标
│   ├── admin.html         # 内容管理后台
│   └── images/            # 图片资源
│       └── avatar.jpg     # 头像
├── content/               # 网站内容
│   ├── zh/                # 中文内容
│   │   ├── _index.md      # 首页 SEO 信息
│   │   ├── about.md       # 个人介绍
│   │   ├── posts/         # 博客文章
│   │   └── projects/      # 近期项目
│   └── en/                # 英文内容（结构同 zh/）
├── layouts/               # 自定义模板（覆盖 PaperMod）
│   ├── _default/rss.xml   # RSS 模板
│   └── partials/templates/ # Schema JSON / Open Graph 模板
├── archetypes/            # 内容模板
│   ├── posts.md           # 文章模板
│   └── projects.md        # 项目模板
├── themes/
│   └── PaperMod/          # 主题（Git 子模块）
├── .github/workflows/
│   └── hugo.yaml          # GitHub Actions 自动部署
├── new.sh                 # 快速创建文章/项目脚本
└── .gitignore
```

---

## 本地开发

```bash
# 安装 Hugo
brew install hugo

# 启动本地预览（含草稿）
hugo server -D
# → 浏览器打开 http://localhost:1313

# 构建站点（输出到 public/）
hugo

# 快速创建新文章或项目
./new.sh post 我的新文章     # 创建中英双语文章
./new.sh project 我的新项目   # 创建中英双语项目
```

---

## 发布流程

### 方式一：后台面板

1. 打开 <https://weidai.me/admin.html>
2. 用 GitHub Token 登录（需要 `repo` 权限）
3. 网页上编辑内容 → 保存 → 自动部署

### 方式二：命令行

```bash
hugo                      # 构建
git add -A
git commit -m "新内容"
git push origin main      # 推送 → GitHub Actions 自动部署
```

---

## 后台管理面板

- **地址：** <https://weidai.me/admin.html>
- **认证：** GitHub Personal Access Token（存在浏览器本地）
- **功能：**
  - ✍️ 新建 / 编辑 / 删除博客文章（中英文）
  - 🚀 新建 / 编辑 / 删除项目（含封面图、GitHub 链接、演示链接）
  - 👤 编辑个人介绍（中英文）
  - 📝 草稿保存（支持 `draft: true`）
  - 👁 Markdown 实时预览
  - 📎 文件上传（图片、PDF、视频、压缩包等，上限 100MB）
  - 💾 每 3 秒自动保存草稿到浏览器

---

## 关键配置

### `hugo.yaml`

```yaml
baseURL: "https://weidai.me"
theme: PaperMod
defaultContentLanguage: zh          # 默认中文
defaultContentLanguageInSubdir: false  # 中文站挂在 /
```

- 双语：中文 (`/`) + English (`/en/`)
- 首页使用 Profile 模式（头像 + 介绍）
- 导航栏：个人介绍 / 近期项目 / 博客

### GitHub Actions

- 触发：push `main` 分支
- 流程：checkout → Hugo 构建 → 部署到 GitHub Pages
- 每次推送后约 1 分钟完成部署

### Cloudflare

- DNS：CNAME `weidai.me` → `zcrzy96drh-ai.github.io`（代理开启）
- SSL/TLS：完全（严格）

---

## 内容编辑指南

### 文章

```markdown
---
title: "文章标题"
date: 2026-08-01
description: "文章简介"
draft: false
cover:
  image: "/images/cover.jpg"   # 可选封面图
---

正文内容（Markdown 格式）...
```

### 项目

```markdown
---
title: "项目名称"
date: 2026-08-01
description: "一句话描述"
draft: false
cover:
  image: "/images/projects/demo.png"
links:
  - title: GitHub
    url: "https://github.com/xxx"
  - title: 在线演示
    url: "https://demo.example.com"
---

详细介绍...
```

---

## 常见问题

### 网站打不开？

1. 确认 Cloudflare DNS 中 CNAME 记录已配置且代理开启（橙色云朵）
2. 确认 GitHub Pages 设置中 Custom domain 为 `weidai.me`
3. 国内用户可能需要等 DNS 生效（最长 24 小时，通常几分钟）

### 推送失败？

需要开 VPN —— `git push` 直连 GitHub 服务器可能需要代理。

### 后台登录不了？

1. Token 需要有 `repo` 权限
2. 创建 Token：<https://github.com/settings/tokens> → Generate new token (classic)

### Hugo 构建报错？

```bash
# 确保子模块已初始化
git submodule update --init --recursive

# 确保 Hugo 版本兼容
hugo version  # 需要 v0.158+
```

---

## 仓库信息

- **GitHub：** `zcrzy96drh-ai/zcrzy96drh-ai.github.io`
- **本地路径：** `/Users/mac/Desktop/个人网站开发`
