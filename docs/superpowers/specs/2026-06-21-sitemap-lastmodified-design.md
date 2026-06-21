# Sitemap `lastModified` 全自动修正 — 设计文档

> 日期:2026-06-21 · 范围:`src/app/sitemap.ts` 单文件 + 一个小 helper · 类别:SEO bugfix

## 问题

`src/app/sitemap.ts` 有两处 `lastModified: new Date()`(静态页 line 31、博客 line 49),
恒为**构建当天**。结果是每次部署后 sitemap 里所有 URL 都显示"今天改过"。Google 会判定
这是不可信信号,从而**降低对该站 `lastModified` 的采信权重**,削弱"内容新鲜度"对收录/排名的帮助。

约束:用户不接受任何**手工维护日期**的方案,要求全自动、零维护。

## 方案

按来源分两类,各取**真实**日期,均不依赖人工填写。

### 1. 静态页 → 该页源文件的 git 最后提交日

- 新增 helper `gitLastModified(file: string): Date | null`:
  - 用 `node:child_process` 的 `execFileSync('git', ['log', '-1', '--format=%cI', '--', file])`。
  - 用 `execFile`(不经 shell),因此路径里的 `[locale]` 方括号**不会被通配符展开**。
  - 包 try/catch;命令失败、无输出、或解析出 Invalid Date → 返回 `null`。
- 每个静态页映射到它自己的源文件:`src/app/[locale]<path>/page.tsx`;
  其中 `path: ""`(首页)映射到 `src/app/[locale]/page.tsx`。
- 取该文件的 git 提交日作为 `lastModified`。各页天然不同、改内容时自动更新、无需任何手工维护。

### 2. 博客文章 → frontmatter 真实 `date`

- 改用 `getAllPosts(locale)`(已含 `date: ISO`)逐 locale 生成条目,`lastModified = new Date(post.date)`。
- 顺带修一个隐藏 bug:现有代码用 `getAllSlugs()` 去重后假设"同一 slug 三语都存在",
  会为缺失语言生成死链;改用 `getAllPosts(locale)` 后只为**实际存在**的 (slug, locale) 生成条目,
  `alternates` 也只列实际存在的语言。
- 不依赖 git。

### 3. 兜底

- git 取不到(理论上仅当 Vercel 浅克隆历史不足时)或博客 `date` 缺失时 →
  **省略该条目的 `lastModified` 字段**(`MetadataRoute.Sitemap` 允许 `lastModified` 可选)。
- 省略是诚实中性的:Google 退回按抓取判断新鲜度,优于塞一个错误的构建当天日期。

## 不做(明确排除)

- 不引入手填日期常量。
- 不改 `priority` / `changeFrequency`。
- 不改任何 URL 结构(那是后续"工具拆独立 URL"那件事)。
- 不引入预构建脚本 / 生成式 manifest。

## 已知取舍(接受)

- `/corporate-tools`、`/property` 等把多个工具塞在同一页的路由,其 `page.tsx` 的 git 日期
  不会因为某个被引用的工具组件改动而更新——是个合理代理,不完美但全自动。等后续把工具
  拆成独立页后,这个自然就准了。

## 验证

1. `npm run build` 成功。
2. 读构建产物 `.next/server/app/sitemap.xml.body`(或等价产出),确认:
   - 静态页 `lastModified` 是各源文件真实提交日、**互不相同**、且**不是构建当天**;
   - 博客条目用 frontmatter 日期。
3. `npm run lint` + `npx tsc --noEmit` + `npm test` 全过。
