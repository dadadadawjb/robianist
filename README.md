# Robo Piano

娱乐性质的 3D 机器人钢琴实验台，使用 Next.js、React Three Fiber、Three.js 和 Web Audio。

## For Users · 项目介绍

给机器一点音乐感：在浏览器中自由组合双臂机器人和灵巧手，看它们在三维场景里弹钢琴。项目优先考虑趣味、视觉与流畅度，不用于真实机器人控制。

### 怎么玩

1. 选择机械臂与灵巧手，左右两侧会使用相同配置。
2. 选择《两只老虎》或《小星星》，点击 **Play** 开始演奏。
3. 使用 **Pause** 暂停、回转箭头 **Restart** 回到开头；播放过程中拖动进度条可跳转。
4. 拖拽场景旋转视角，滚轮缩放，右键拖拽平移；点击「手部特写」观察触键，点击「重置视角」恢复机位。触屏可用手势控制。
5. 音量滑块调节实时音符音量。首次播放需要点击按钮以满足浏览器音频策略。
6. 设备运行吃力时开启「轻量渲染」：切换到程序化低细节机器人、隐藏琴弦、关闭阴影、限制像素比为 1。不会改变音符或播放速度。

切换曲目会停止播放并回到开头；切换机械臂或手不改变曲目进度。切换到后台时自动暂停。

### 当前支持

- 双 Franka 官方网格、LEAP 官方 URDF 与 88 键斯坦威风格三角钢琴。
- Franka / UR5 / Flexiv / 天机风格预设，与 LEAP Hand / Sharpa / Wuji 风格预设自由组合。
- 《两只老虎》《小星星》，含简单左手伴奏。
- Play / Pause / Restart、进度拖动、音量与视角重置。
- 每个音符单独产生带衰减泛音的合成钢琴音色，无录制好的音乐；声音与动画共享 AudioContext 时钟。

### 当前限制

Franka 与 LEAP 使用官方开源仿真资源，其余预设仍是风格化模型。钢琴是原创斯坦威风格三角钢琴，并非官方授权模型。左右两侧暂时复用同一个 LEAP 右手资产；按场景比例缩放，动作不代表真实硬件可执行轨迹。当前每只手执行单声部演奏，没有复杂和弦指法、碰撞检测或严格动力学。合成音色不是采样钢琴。流行曲和 MIDI/MusicXML 上传尚未实现。

## For Developers · 开发指南

### 环境与启动

需要 Node.js 24+（测试命令使用 Node 内置 TypeScript 支持）。

```sh
npm install
npm run dev
```

打开 http://localhost:3000 。点击 Play 启用浏览器声音。拖拽旋转，滚轮缩放，右键拖拽平移。

```sh
npm test
npm run build
npm start
```

### 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm install` | 初次安装依赖 |
| `npm ci` | 按 package-lock.json 安装一致版本 |
| `npm run dev` | 启动开发服务，默认端口 3000 |
| `npm test` | 检查音高、键位映射、事件排序和单手无重叠约束 |
| `npm run build` | 类型检查与生产构建 |
| `npm start` | 启动已经构建的生产服务 |

无需 API key、数据库或环境变量。浏览器需要支持 WebGL 和 Web Audio。端口占用时可运行 `npm run dev -- --port 3001`。

### 代码结构

| 路径 | 职责 |
| --- | --- |
| `app/page.tsx` | 配置面板、歌曲选择、播放控制 |
| `app/globals.css` | 响应式布局与视觉样式 |
| `components/Scene.tsx` | 场景、轻量几何与相机 |
| `components/GrandPiano.tsx` | 三角琴体、琴盖、琴弦与 88 键 |
| `components/RobotAsset.tsx` | URDF 资源加载、实例与手指标定 |
| `lib/arm-ik.ts` | URDF 到 Three.js CCDIKSolver 的适配 |
| `lib/music.ts` | 统一音符事件、预设歌曲、键位与频率映射 |
| `lib/player.ts` | 音频时钟、独立音符合成、暂停和跳转 |
| `lib/presets.ts` | 机械臂与灵巧手配置类型及预设 |
| `tests/` | 音符、键位和 IK 测试 |
| `public/models/` | 官方网格、URDF 和授权文件 |
| `scripts/prepare-franka.mjs` | 从官方定义生成浏览器视觉 URDF |

### 实现边界与扩展

Franka 使用 Three.js 自带 CCDIKSolver，由 lib/arm-ik.ts 将 URDF 固定坐标变换和转动关节适配成骨骼链，并保留官方关节限位。LEAP 通过 URDF 关节值驱动手指，按指尖标定点对齐目标琴键。轻量模式与其余风格预设使用简化双连杆姿态。无动力学或碰撞保证。

`lib/presets.ts` 将机器人和手分开配置，包含 `procedural | glb | urdf` 资源描述类型。渲染器实现 procedural 与 URDF 分支，URDF 引用的 STL/DAE/GLB 由现有加载器读取。独立 GLB 的 rig 尚未实现；接入新机械臂或手时仍需提供对应关节链、挂载变换和指尖标定，不能仅更换 URL。

歌曲统一为 `Note { midi, start, duration, hand }`，时间单位为秒。音频和场景消费同一份事件。下一步建议先导入 Standard MIDI Files（.mid），处理 tempo map 并转为秒时间线；再支持 MusicXML（.musicxml/.mxl）的声部、连音和反复记号。导入与机器人动作规划应独立：后者处理左右手、指法、和弦、可达性。将来加入 velocity、踏板和轨道信息时需同步扩展音源与规划器。PDF/图片乐谱需要另外的 OMR 识谱，不是直接读取音符。

### 大模型优化

官方资源原文件合计约 22 MB，浏览器对同一路径缓存和复用。轻量开关使用程序化替代模型降低 GPU 开销；在真实模型加载后切换不会撤销已经发生的下载。它不执行自动 mesh 减面或凸分解。后续优化真实资源时，建议离线生成低面数 GLB / LOD，进行 mesh 简化、纹理降采样、Meshopt/Draco 几何压缩和 KTX2 纹理压缩，再由模型配置选择轻量资源。压缩降低传输量，但仍需控制解码后的几何与纹理规模。保留关节层级和原点，避免破坏动画。

凸分解（如 VHACD）主要为碰撞体服务，应作为独立 collision 资源；它不能代替显示 mesh 减面，当前无物理仿真所以没有引入。

### 资源来源

完整来源、修改说明和授权见 [ASSETS.md](ASSETS.md)。模型已随仓库保存，无需安装 ROS。需要重新生成 Franka 视觉 URDF 时运行：

```sh
node scripts/prepare-franka.mjs
```


