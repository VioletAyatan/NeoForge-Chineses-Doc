# NeoForge 中文文档/中文网

本项目是 [NeoForge 官方文档](https://docs.neoforged.net/docs/)的**非官方简体中文翻译**，面向 Minecraft 26.1 与 NeoForge 26.1 模组开发者。项目致力于提供准确、易读、术语统一的 NeoForge 中文文档，帮助中文开发者学习 Minecraft 模组开发、查询 NeoForge API，并理解注册表、事件、资源、数据生成、网络通信、渲染和世界生成等核心机制。

文档基于[官方NeoForge文档](https://docs.neoforged.net/docs/gettingstarted/)汉化，使用 [VitePress](https://vitepress.dev/) 构建为静态网页，可在本地启动开发服务器，也可部署到 Cloudflare Workers 等静态托管平台。

## 项目信息

| 项目 | 说明 |
| --- | --- |
| 文档原文 | [NeoForged Documentation](https://docs.neoforged.net/docs/) |
| 文档语言 | 简体中文 |
| Minecraft 版本 | 26.1 |
| NeoForge 版本 | 26.1 |
| 站点生成器 | VitePress 2 |
| 文档性质 | 社区维护的非官方中文翻译 |
| 开源许可 | MIT License |

NeoForge 26.1 对应 Minecraft 26.1。

## 文档内容

当前中文文档覆盖 NeoForge 模组开发的主要主题，包括：

- 开发环境搭建、模组文件、项目结构与版本管理；
- 注册表、事件总线、逻辑端与物理端等基本概念；
- Block、Item、Entity、BlockEntity 及相关交互；
- 数据组件、数据附件、编解码器、NBT 与 Saved Data；
- 资源包、数据包、模型、纹理、音效、粒子和本地化；
- 成就、配方、标签、战利品表、附魔、数据映射与数据加载条件；
- 网络通信、Payload、流编解码器与配置任务；
- Screen、Entity Renderer、粒子与其他客户端渲染内容；
- Capability、Container、Menu、Transaction 与资源转移；
- 世界生成、游戏测试、配置、访问转换器等进阶主题。

可从[模组编程入门](docs/gettingstarted/index.md)开始阅读，或通过仓库中的 `docs/` 目录按主题查找内容。

## 使用 VitePress 构建网页

项目使用 VitePress 将 Markdown 文档构建为支持导航栏、侧边栏、页面目录和全文搜索接入能力的静态文档网站。站点配置位于 `.vitepress/config.mts`，首页位于 `index.md`，主要译文位于 `docs/`。

### 本地运行

请先安装 Node.js 与 npm，然后在项目根目录执行：

```bash
npm ci
npm run docs:dev
```

开发服务器启动后，可根据终端提示在浏览器中访问本地文档网站。

### 构建与预览

```bash
npm run docs:build
npm run docs:preview
```

构建结果输出到 `.vitepress/dist/`。仓库同时提供 `wrangler.jsonc`，可用于将静态站点部署到 Cloudflare Workers。

## 项目结构

```text
.
├─ .vitepress/        # VitePress 站点配置
├─ docs/              # NeoForge 26.1 中文文档
├─ public/            # Logo、站点图标等静态资源
├─ GLOSSARY.md        # 项目统一术语表
├─ index.md           # 文档网站首页
├─ package.json       # 构建命令与前端依赖
└─ wrangler.jsonc     # Cloudflare Workers 部署配置
```

## 技术术语处理原则

项目统一译名及易混概念见[项目术语表](GLOSSARY.md)。

- fenced code block 中的代码结构与技术标识符保持原文；说明性注释翻译为简体中文，注释中的类名、方法名、字段名、路径和其他代码字面量不作改写。
- 行内代码、类名、方法名、字段名、包名、注册表键、资源路径、命令和配置键保持原文。
- 普通说明文字使用简体中文；必要时采用“中文说明（英文术语）”形式，避免与实际 API 名称混淆。

## 参与翻译与维护

欢迎通过 Issue 或 Pull Request 反馈错译、遗漏、失效链接和版本差异。

## 许可与归属

原始文档版权所有 © 2026 NeoForged，并以 [MIT 许可证](https://github.com/neoforged/Documentation/blob/main/LICENSE)发布。本中文译文是基于原文制作的非官方翻译，保留原始文档的许可与归属信息。

NeoForge 文档并非 Minecraft 官方网站，未获得 Mojang 或 Microsoft 的批准，也不与其存在关联。
