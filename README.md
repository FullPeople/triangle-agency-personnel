# 三角机构·职工档案

为《三角机构 / Triangle Agency》制作的浏览器角色档案工具。支持离线填写、ARC 查阅、任务与成长记录、JSON 导入导出，以及 A4 打印、PDF 和 PNG 输出。

网站：[dnd.center/3/](https://dnd.center/3/)

角色档案保存在当前浏览器，不上传服务器。首次使用自带来福示例角色；已有档案不会被示例覆盖。“新建档案”创建空白角色。换浏览器前请先导出 JSON。

## 本地运行

直接打开 `src/index.html`。也可以在项目目录启动静态服务器：

```sh
python -m http.server 8328 --directory src
```

随后打开 `http://127.0.0.1:8328/`。

## 检查与离线打包

```sh
npm ci
npm test
python build_offline.py
```

需要 Node.js 20 或更新版本，以及 Python 3。打包脚本会在仓库旁的 `offline/` 目录生成独立 HTML 与 ZIP；字体首次打包时从官方来源获取并缓存，生成的离线文件无需联网。

本地源码可能领先于线上版本。此仓库不会自动部署网站。

## 内容与许可

原创程序代码采用 MIT 许可。游戏规则、名称及相关文本属于《三角机构》的原权利人，不在程序代码的 MIT 许可范围内；本工具为非官方辅助工具。仓库不包含原始规则书 PDF。

第三方库及字体保留各自许可证，见 `src/vendor/` 和 `LICENSES/FONT-LICENSES.txt`。
