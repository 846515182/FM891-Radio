# FM891 音乐电台（安卓可用的网页 App）

一个可以直接"安装到手机主屏幕"的音乐电台网页 App（PWA）：

- 📻 内置 9 个推荐音乐频道（FM891 线上音乐台 / Radio Paradise ×4 / FIP 法国音乐 ×2 / 舞曲 / 欧陆流行），一键切换
- ▶️ 播放 / 暂停、上一曲 / 下一曲、音量调节
- 🎵 播放时封面带动态频谱动画，状态显示"直播中 / 缓冲中 / 连接失败"，
  并实时显示当前曲目（ICY 元数据，APK 内由原生读取器解析）
- 🔒 **锁屏 / 后台不断播**：APK 带前台媒体服务（mediaPlayback）+ WakeLock，
  锁屏卡片显示电台与当前歌曲、带播放 / 暂停按钮（安卓原生 MediaSession）
- 📱 支持安装到安卓 / iPhone 主桌面，全屏运行（无浏览器地址栏）
- 🔁 断流自动重连（最多 5 次）+ 20 秒卡死看门狗自动换源；
  音频卡顿时自动让出曲目读取带宽，优先保证播放
- 🔄 **在线更新**：APK 启动后静默检查 GitHub Release 新版本，弹窗一键下载安装
  （页脚也有"检查更新"入口）；网页版 Service Worker 自动热更新，
  正在听歌时会推迟到暂停后再刷新，不断播
- 📴 断网后 App 外壳仍可打开，提示网络问题
- 🎧 支持 `.m3u8`（HLS）直播源，自动加载 hls.js

## 目录结构

```
fm891-radio/
├── index.html        页面结构
├── style.css         样式
├── app.js            逻辑 + 频道配置（想改直播源就改这里）
├── manifest.json     PWA 清单（App 名称、图标、全屏模式）
├── sw.js             Service Worker（离线缓存）
├── icons/            应用图标（make-icons.ps1 生成）
├── make-icons.ps1    重新生成图标的脚本
├── serve.ps1         本地预览服务器
└── README.md
```

## 本地预览

方式一（推荐）：双击 `serve.ps1` 或在该目录执行：

```powershell
.\serve.ps1
```

然后浏览器打开 <http://localhost:8080>

方式二：直接双击 `index.html` 也能看界面、听直播（但 Service Worker /
安装功能需要通过 http/https 访问才会生效）。

## 让手机真正"安装使用"

PWA 需要部署到 **HTTPS** 网站（localhost 除外）。任选一种免费方式：

1. **Netlify Drop**（最快）：打开 <https://app.netlify.com/drop>，把整个
   `fm891-radio` 文件夹拖进去，几秒后得到一个 `https://xxx.netlify.app` 地址。
2. **GitHub Pages**：新建仓库 → 上传本文件夹所有文件 → Settings → Pages →
   选 `main` 分支 → 访问 `https://用户名.github.io/仓库名/`。

然后用手机浏览器打开该地址：

- **安卓 Chrome**：右上角 ⋮ →「添加到主屏幕」→ 安装，桌面出现 FM891 图标，
  打开即为全屏独立 App。
- **iPhone Safari**：分享 →「添加到主屏幕」。

## 打包成安卓 APK（本地，不装 Android Studio）

本项目的 `android/` 目录是一个免 Gradle 的轻量安卓工程，用 WebView
把整个网页打包成独立 App：

```powershell
cd android
.\build-apk.ps1
# 产出 ..\FM891.apk（已签名，apksigner verify 通过）
```

依赖（本机已装好）：

- Temurin JDK 17（winget: `EclipseAdoptium.Temurin.17.JDK`）
- `C:\android-tools`：经典版 cmdline-tools + `platforms;android-34` + `build-tools;34.0.0`
- 桌面图标重新生成：`.\make-launcher-icons.ps1`

安装到手机：把 `FM891.apk` 传到手机（微信/QQ/网盘/数据线）→ 点击安装
（需允许"安装未知应用"）。App 名称：**FM891 音乐电台**，包名 `com.fm891.radio`，
网页资源全部内嵌，**可离线打开**；直播与"发现电台"搜索需联网。

修改网页后重新打包：直接再跑一次 `.\build-apk.ps1` 即可（会自动重新拷贝
`index.html / style.css / app.js` 等到 assets）。

## GitHub 仓库与在线更新

- 仓库（公开）：<https://github.com/846515182/FM891-Radio>
- 版本发布在 **Releases**：tag 形如 `v1.1`，附件 `FM891.apk`。

### 在线更新怎么工作

- **APK**：启动 6 秒后静默检查 GitHub Releases API；发现新 tag 弹窗提示
  （页脚"检查更新 · v1.1"可手动触发）→ 点"立即更新" → 流式下载到
  `PackageInstaller` 会话 → 系统确认弹窗 → 覆盖安装。
  首次使用需允许"安装未知应用"（点击更新会自动跳设置页，允许后重试即可）。
- **网页版**：Service Worker 自动热更 —— 每次发版把 `sw.js` 的 `CACHE`
  版本号 +1，新 SW 接管后自动刷新；正在听歌时推迟到暂停后再刷，不断播。

### 发新版本（3 处版本号要同步）

1. `android/AndroidManifest.xml` → `android:versionName`（+ `android:versionCode` 递增）
2. `app.js` → `currentVersion()` 里的兜底字符串（网页版显示用）
3. Git tag / Release 名：`vX.Y`

发版流程：

```powershell
# 1) 改上面 3 处版本号后重新打包
.\android\build-apk.ps1
# 2) 提交推送
git add -A; git commit -m "release: vX.Y"; git push
# 3) 创建 Release 并挂上 APK（在线更新即刻生效）
gh release create vX.Y FM891.apk --title "vX.Y" --notes "更新说明……"
```

## 更换直播源

推荐频道在 `app.js` 顶部的 `STATIONS`：

```js
{
  id: 'my',
  name: '我的频道',
  desc: '频道简介',
  url: 'https://example.com/live.m3u8',   // mp3 / aac 直链或 m3u8
}
```

增删改条目即可，界面会自动生成频道按钮。

### 注意事项

- 页面部署在 `https` 时，直播源也必须是 `https`，否则浏览器会因
  **混合内容（Mixed Content）** 拦截播放。
- 直播源地址可以在浏览器里新开一个 `<audio>` 标签或直接访问验证是否能播。
- iOS 系统会忽略网页里的音量条，需用手机侧边音量键调节（安卓正常）。
- 部分公开电台对海外/国内访问性不同，播不了就换一个源。

## 重新生成图标

```powershell
.\make-icons.ps1
```
