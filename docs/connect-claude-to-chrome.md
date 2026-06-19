# 让 Claude 连上你的 Chrome（本地）

> 这是**真正的连接修复**：不是网页绕过，而是让 Claude Code（跑在你电脑上的版本）
> 通过 Chrome DevTools MCP 直接驱动你已登录的 Chrome（点按钮、填表、操作
> Supabase 后台、替你测 AI 等）。
>
> ⚠️ 为什么不能在「网页版 / 云端」会话里用：云端 Claude Code 跑在隔离服务器上，
> 碰不到你电脑里的 Chrome，且网络是白名单。所以**必须在本地电脑跑 Claude Code**，
> 下面的配置（仓库根目录的 `.mcp.json`）才会生效。

## 一次性设置（约 3 分钟）

### 1. 安装本地 Claude Code（如果还没装）
```bash
npm install -g @anthropic-ai/claude-code
```

### 2. 用「远程调试」开一个 Chrome
Chrome 136+ 禁止在默认资料档开调试口，所以用一个独立资料档。

**Windows（PowerShell）**
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:USERPROFILE\ChromeDebugProfile"
```

**macOS**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/ChromeDebugProfile"
```

第一次会是一个全新的 Chrome 视窗——**在里面登录一次你的 Supabase / 网站**即可（这个资料档会记住）。

### 3. 在项目目录启动本地 Claude Code
```bash
cd MalaysiaTax_Tools
claude
```
仓库根目录已经有 `.mcp.json`，Claude Code 启动时会发现 `chrome-devtools` 这个 MCP
服务器并请你批准（选允许）。批准后，Claude 就连上了那个开着调试口的 Chrome。

### 4. 验证连接
在本地 Claude Code 里说：
> 「用 chrome-devtools 打开 https://mytaxs.online/en/ai-tax 并截图」

能截到图 = Chrome 连接已打通。之后就能让它替你在浏览器里操作了。

## 排错
- **连不上 `127.0.0.1:9222`**：确认第 2 步那个带 `--remote-debugging-port` 的
  Chrome 还开着；浏览器访问 `http://127.0.0.1:9222/json/version` 应返回 JSON。
- **没出现 MCP 批准提示**：在 Claude Code 里执行 `/mcp` 查看 `chrome-devtools`
  状态，或重开 Claude Code。
- **要连「你平时那个」已登录的 Chrome**：把平时的 Chrome 全部关掉，再用第 2 步的
  命令但 `--user-data-dir` 指向你的正式资料档路径（注意 Chrome 136+ 的安全限制，
  建议还是用独立调试资料档并在里面登录一次）。

## 参考
- [Chrome DevTools MCP（官方）](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Chrome for Developers：用 Chrome DevTools MCP 调试浏览器会话](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [用 Chrome DevTools MCP + Claude Code 自动化需要登录的网站](https://scalified.com/blog/chrome-devtools-mcp-authentication)
