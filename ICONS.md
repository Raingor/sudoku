# 图标来源（iconfont.cn）

2026-11-23 通过 `opencli browser` 访问 <https://www.iconfont.cn/> 搜索并采集，替换了游戏站台与六款游戏的页面图标及界面图标。采集时从搜索结果的内联 SVG 读取 `viewBox` 与路径，去除原 `fill` / `p-id` 属性，统一以 `fill="currentColor"` 渲染；favicon 另加主题色圆角底。

| 用途 | iconfont 名称 | 图标 ID | 搜索词 | viewBox |
| --- | --- | --- | --- | --- |
| 游戏站台 favicon | 火车票 | 2076291 | 车票 | `0 0 1024 1024` |
| 2048 favicon | 应用中心 | 1307 | 方块 | `0 0 1026 1024` |
| 数独 favicon | 数独游戏 | 4893921 | 数独 | `0 0 1024 1024` |
| 扫雷 favicon、地雷格 | 地雷 | 7131888 | 地雷 | `0 0 1024 1024` |
| 记忆翻牌 favicon | 图表-卡片 | 4354246 | 卡片 | `0 0 1024 1024` |
| 华容道 favicon | 拼图 | 705682 | 拼图 | `0 0 1024 1024` |
| 推箱子 favicon、箱子 | 24gf-box2 | 7542728 | 箱子 | `0 0 1024 1024` |
| 撤销（2048、数独、推箱子） | 撤销_o | 5387854 | 撤销 | `0 0 1024 1024` |
| 重开 / 重置（五款游戏） | 重置 | 7556179 | 重置 | `0 0 1024 1024` |
| 帮助（扫雷、推箱子、华容道） | 帮助 | 11372644 | 帮助 | `0 0 1024 1024` |
| 关闭（扫雷、华容道） | 关闭 | 19949533 | 关闭 | `0 0 1024 1024` |
| 旗帜（扫雷） | 旗帜 | 18455979 | 旗帜 | `0 0 1024 1024` |
| 放大棋盘（扫雷） | 全屏_o | 5387948 | 全屏 | `0 0 1024 1024` |
| 揭开 / 扫描（扫雷） | 239扫描 | 1727483 | 扫描 | `0 0 1024 1024` |
| 对勾（扫雷） | 对勾 | 4611765 | 对勾 | `0 0 1024 1024` |
| 笔记（数独） | 编辑 | 957 | 铅笔 | `0 0 1024 1024` |
| 擦除（数独） | 橡皮擦 | 7789612 | 橡皮擦 | `0 0 1024 1024` |
| 计时（数独） | 时钟 | 577362 | 时钟 | `0 0 1024 1024` |
| 下一题（数独） | 下一步 | 5302289 | 下一步 | `0 0 1024 1024` |
| 选关（推箱子） | layout-grid-2-line | 42194579 | 九宫格 | `0 0 1024 1024` |

## 落位

- `game-hub/public/favicon.svg`
- `game-2048/public/favicon.svg`、`game-2048/src/icons.ts`
- `sudoku/public/favicon.svg`、`sudoku/src/main.ts`
- `minesweeper/public/favicon.svg`、`minesweeper/src/icons.ts`
- `memory-match/public/favicon.svg`、`memory-match/src/icons.ts`
- `sliding-puzzle/public/favicon.svg`、`sliding-puzzle/src/icons.ts`
- `sokoban/public/favicon.svg`、`sokoban/src/main.ts`

图标版权归 iconfont.cn 原作者所有，使用时请遵循对应图标的上传者授权说明。
