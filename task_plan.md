# 数独实施计划

- [x] 读取根计划，确认写入仅 sudoku，5180 / 4180 无监听，加载 frontend-design。
- [x] 独立 Vite 8 / Vitest 4 / TS 严格模式 / Playwright 骨架，相对 base，独立 lock。
- [x] 原创离线 6 基础题（每档 2）、附答案、合法变换、纯规则、独立回溯唯一解测试。
- [x] 米白纸面墨绿界面；键盘/触摸输入、笔记、擦除、撤销、冲突、规则、计时、重开/新题/切档、胜利与本地续局/分档最佳。
- [x] 存档版本/字段校验、访问/读取/写入异常降级，计时与 DOM 隔离。
- [x] 103 单元测试通过；严格 tsc / Vite 生产构建通过。
- [x] 开发 5180 / 生产 4180 各 50 项独立 Chrome 验收，1440×900 / 390×844 / 360 宽，触摸/reduced-motion，全部通过。
- [x] 生成截图、零 pageerror / console error / HTTP 错误；截图实际视觉核验。
- [x] README、实际进展记录完成，交回主 Agent；不操作 Git、发布、Artifact 或 memory。

## 新增人物头像任务（2026-11-20，本地回归完成，待主 Agent 发布）

- [x] 只读 xiaoxiaole/src/catalog.ts，复制对应19张 WebP头像到本项目public/characters-2d（682,082字节，逐文件SHA256一致）。
- [x] 独立characters.ts/css，主题化陪伴头像+姓名，原生details/summary展示全部19角色；不新增dialog、不遮棋盘、不监听全局游戏快捷键。
- [x] 角色按钮aria-pressed/name、图片alt、清晰焦点、Escape收起返回summary、选完收起。
- [x] 独立版本化偏好存储与异常/非法id安全默认；35项新单测，合计138/138通过。
- [x] 严格TS/生产build与characters-smoke.mjs语法检查通过；无浏览器启动。
- [x] 编写scripts/characters-smoke.mjs，GAME_URL兼容开发/生产，头像证据artifacts/characters-*.png。
- [x] 主 Agent先跑头像48项通过，发现原数独390高回归失败后交回；本Agent修手机真实布局（原viewport断言不变），开发/生产完整游戏各50项、头像各48项通过，零页面/控制台/HTTP错误。
- [x] 390原始无滚动bottom=860修为826，360为796.5；头像40px及全部19选择保留，截图视觉通过。
- [ ] 主 Agent 确认截图、推送及Pages更新（不由本Agent执行）。

本次源码已再次冻结交回；新增头像版现有本地双态验收，仍不能把旧的线上通过记录当作新版线上验收。

## 边界
- 仅写入 /Users/mac-2312-r/workspace/wwwroot/M-projects/sudoku。
- 5175 与其他服务未改动。主 Agent 添加的 .github/workflows/deploy.yml 未修改。
- 题库分组不代表严格人类推理难度；有限变体可能重复，非在线出题器。
- findings 不另建汇总文件，发现与修复直接在交回消息和 progress 中记录。
