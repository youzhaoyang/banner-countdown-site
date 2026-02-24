# Banner Countdown Site (React)

吸顶 Banner 倒计时 Demo，已改写为 React + Vite。

## 本地运行

1. 安装依赖
```bash
npm install
```

2. 启动开发服务
```bash
npm run dev
```

3. 构建产物
```bash
npm run build
```

## 功能

- 展示/隐藏循环（支持无限循环与有限次数）
- 展示态/隐藏态倒计时
- 手动关闭后继续循环或暂停
- 本地状态持久化（localStorage）
- 会员等级 ID 定向展示（可见/不可见列表）
- 右侧按钮可视化配置（文案、颜色、背景、边框、圆角）

## 存储键

- 循环状态：`pop_459_cycle_state`
- 编辑配置：`pop_459_cycle_state_editor`

## GitHub Pages

项目使用 Vite `base: /banner-countdown-site/`，可直接部署到该仓库对应的 Pages 路径。
