# 实际进展

## 2026-11-20 · 骨架
- 已读根级计划与 2048 的 package、tsconfig、浏览器脚本（未全读旧项目）。
- Node v24.18.0 / npm 11.16.0；5180、4180 初始均无监听，未触碰 5175。
- 创建 sudoku 独立骨架；主题为「方寸」，米白纸张与墨绿手记。
- 主 Agent 加入 .github/workflows/deploy.yml，本 Agent 未修改。

## 规则完成
- 离线自建 6 道基础题，各档 2 题，有完整答案。固定种子 20261120，有限单轮移除并验证唯一解；运行时只做合法变换，无出题重试或在线服务。
- 引擎提供固定格防写、笔记切换、擦除、200 次撤销、行/列/宫冲突与完整合法胜利。
- 独立 bitmask 回溯测试计数器，第二解停止；6 原题 + 30 变换样本都唯一且与答案一致。
- 独立 Clock 可注入时间源，版本化存储校验字段/范围/历史/固定格/答案/笔记并异常降级。
- 首次测试 102/103：失败是 Infinity 经 JSON.stringify 转为合法 null 的测试断言错误，修为小数非法字段后 103/103 通过；未借此改产品字段规则。

## 界面与真实浏览器修复
- 完整中文原生 DOM 9×9，键盘/数字键盘，单格焦点、规则入口、笔记/擦除/撤销，三档切换、新题/同题重开，确认与胜利弹窗。
- 时钟在页面隐藏/弹窗/完成时暂停；进度每次操作/每秒/pagehide 保存，纪录按档隔离。
- Chrome 首轮发现原生单按钮 dialog 的 Tab 会离开焦点区，补首尾焦点循环；真实 Escape 返回入口验证通过。
- 连续触摸验收暴露真正异步问题：旧 dialog 的 close 事件排队，可能清空紧接着新开的确认 callback。修为只在 cancel 或实际点击动作时清除，新增 3 次快速重开→切档回归并通过。
- 视觉检查发现第一版桌面截图捕获淡入透明首帧，测试脚本改为等待动画并截图 animations: disabled；不依赖改变产品游戏状态。桌面 900 高另做紧凑留白，棋盘与底部操作完整入屏。
- magpie-vision 确认最新1440桌面和390/360手机棋盘与操作完整、无遮挡/溢出。胜利弹窗后的棋盘采用预期模糊遮罩，另保存关闭弹窗后的 completed-board.png 便于核验。

## 最终实跑
在本目录执行等价 npm --prefix 命令：

```sh
npm install
npm test
npm run build
npm run dev
npm run preview
npm run test:browser
GAME_URL=http://localhost:4180 npm run test:browser
```

- 独立安装 47 packages，npm audit 0 vulnerabilities。
- Vitest 4：2 文件，103/103 通过。
- 严格 tsc + Vite 8.3.8：生产构建通过。
- Chrome channel=chrome，独立上下文：开发 5180 **50/50**；生产 preview 4180 **50/50**。
- 1440×900，390×844 真实触摸，360 宽 reduced-motion；规则/焦点、数字/候选/擦除/撤销、固定格和冲突、三档/重开/新题、满盘非法不胜、最后一步键盘及触摸获胜、纪录刷新、存储禁用和损坏字段均经过真实UI验证。
- 每轮所有上下文 pageerror / console error / HTTP >=400（含404）均 0。
- 截图/JSON 在 artifacts/dev 与 artifacts/preview（已忽略）。
- 服务最终核实：5180 node PID 66740，4180 node PID 66774，仍监听；未停止其他服务。后台任务 boaok6v5b / balpfyk2k。

## 交付边界与限制
- 仅写 sudoku；未操作 git / push / deploy / Artifact / memory，未改主 Agent 工作流。
- 难度为离线题库构造策略分组，未声称空格数严格证明人类难度；有限变体可能重复。
- 本地存档无防篡改/跨设备同步，无 Service Worker 离线安装缓存。
- 无已知阻塞；子 Agent 完成后冻结交回主 Agent。

## 主 Agent 独立验收与Pages发布
- 独立103单测、严格类型检查与构建通过；生产preview复核及截图视觉检查通过。
- 仓库：https://github.com/Raingor/sudoku ，首次提交 `1785055`。
- 工作流 https://github.com/Raingor/sudoku/actions/runs/44717949719 成功。
- 站点：https://raingor.github.io/sudoku/ ，线上50/50浏览器检查通过；数字/候选/撤销、三档与确认、真实最后一步胜利、触屏及存储异常均正常。
- 线上无pageerror/console/HTTP错误；截图和结果保存在忽略的artifacts目录。

## 新增人物头像 · 本地实现（2026-11-20 20:06；未浏览器验收/发布）
- 主 Agent 指定重新打开本项目实现：只修改 sudoku；只读 xiaoxiaole/src/catalog.ts 后复制对应19张 WebP头像到 public/characters-2d/，合计682,082字节，逐文件SHA256与源一致。未复制PNG/全身图/Three资源。
- 新增 src/characters.ts、src/characters.css，接入 main.ts 原标题左栏/手机标题下方，替换原纯文字陪伴提示；米白墨绿纸面伙伴头像、完整名字与换伙伴入口。
- 原生details/summary展开19角色网格，使用普通命名按钮与aria-pressed，图片alt、显式focus-visible，选完收起并返回summary，Escape只在组件内部处理；无新dialog、无游戏键盘全局监听、无cheat globals或兄弟运行时依赖。
- 独立版本化角色选择key与数独存档隔离；无效JSON/版本/id安全默认classic；storage访问/get/set均捕获异常，失败显示提示且仍支持内存切换。
- 新增 tests/characters.test.ts 35项：19角色轮流存储/相对路径、字段校验、访问/读取/写入错误、非法id不触碰存储。
- 实跑 npm test：3文件138/138通过；npm run build：严格tsc+Vite8通过；node --check scripts/characters-smoke.mjs通过。
- 新增 scripts/characters-smoke.mjs，独立Chrome/GAME_URL，待验收19图加载、全部选择、刷新、键盘/Escape、不干扰实际数独输入、损坏/禁用/配额存储、360真实触摸无溢出。截图将写入artifacts/characters-*.png，结果characters-results.json。
- 按主 Agent 错峰指令，本轮未启动浏览器或重启任何服务，未生成新版截图，不把上方初版线上50项记录作为本次头像验收。
- README/task_plan已区分历史上线与本次待验收，未操作git/发布/memory或根计划。
- 本轮源码完成并冻结交回主 Agent；后续如需修复由同一Agent继续。

主 Agent 验收命令（服务就绪后）

```sh
GAME_URL=http://localhost:5180 node scripts/characters-smoke.mjs
GAME_URL=http://localhost:4180 node scripts/characters-smoke.mjs
GAME_URL=http://localhost:4180 npm run test:browser
```

## 人物头像手机高度回归修复 · 2026-11-20 20:11
- 主 Agent 独立头像48/48通过，但原完整数独smoke在390×844的底部操作viewport断言失败；交回本Agent并允许本游戏浏览器回归。
- 实测原始页面scrollY=0：390宽伙伴summary高62px，底部操作bottom=860px，超844。根因是新增头像块及上下间距增加了原手机页面高度。
- 仅修改src/characters.css的手机规则：伙伴头像48→40px，summary62→50px，上边距12→8px，页头上下各减4px，main顶部21→15px，introduction底部12→8px。桌面/选择网格/19角色/可访问行为不变，未改scripts/smoke.mjs或任何viewport断言。
- 修后生产preview无滚动实测：390×844操作bottom=826px；360×844为796.5px，两者scrollY=0、无横向溢出。伙伴头像和名字继续清晰可见。
- 实跑npm test：138/138；npm run build：严格TS+Vite通过。
- npm run test:browser：开发5180 50/50、生产4180 50/50。
- GAME_URL对应服务运行node scripts/characters-smoke.mjs：开发5180 48/48、生产4180 48/48。
- 四轮全部pageerror/console error/HTTP>=400含404为0，覆盖19头像加载/全部选择/键盘/Escape/刷新/存储异常/360触摸与原游戏完整回归。
- 新版截图artifacts/preview/mobile-390.png和artifacts/characters-mobile-360.png经magpie-vision确认头像/姓名不与标题重叠，棋盘/数字键/底部重开新题完整无遮挡；其他截图及结果JSON同原路径更新。
- 使用既有5180/4180服务，未重启或停止服务。未git/推送/发布/memory；仅sudoku目录，原smoke未削弱。
- README/task_plan已更新本地新版真实验收；子Agent冻结交主Agent发布。

## 人物版主Agent发布验收（2026-11-20）
- 主Agent独立复跑人物48项及完整数独50项全部通过，包括390px数字键盘首屏原断言；未削弱旧玩法覆盖。
- 代码 `ff1d165` 已推送；Pages工作流 https://github.com/Raingor/sudoku/actions/runs/44734865315 成功。
- https://raingor.github.io/sudoku/ 新版线上48项人物+50项数独检查全过，无pageerror/console/HTTP资源错误。
- 138项单测与严格构建通过；19角色、存储降级、手机人物名牌和原数独全流程已完成线上验收，上文未发布为历史交接状态。

## 2026-11-23 · iconfont 图标重采

- 通过 opencli 访问 iconfont.cn 搜索采集页面 favicon 与界面图标，图标名称、ID、搜索词和落位见 [ICONS.md](./ICONS.md)。
- 新增 `public/favicon.svg`，`index.html` 改用该文件；界面图标统一以 `currentColor` 渲染，favicon 使用本项目主题色圆角底。
- 笔记、擦除、撤销、重开、下一题、计时图标全部替换为 iconfont 线性图标。
- `npm test`、`npm run build` 通过；浏览器冒烟 50 项通过，截图复核图标尺寸、对比度与语义正常。

