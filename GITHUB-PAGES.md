# 部署到 GitHub Pages

项目无需安装依赖，网站文件在 `dist/`。已提供 `.github/workflows/pages.yml`，推送到 `main` 后自动检查课程、学习记录、语音和罗马音，再发布静态网站。

## 首次部署

1. 在自己的 GitHub 账号下创建空仓库，建议名称 `hajime-nihongo`。不要另外生成 README、License 或 gitignore。
2. GitHub Free 的 Pages 需要公开仓库；若希望源码私有，请先确认自己的套餐支持私有仓库 Pages。
3. 将本项目上传或推送到仓库的 `main` 分支。仓库根目录应直接包含 `.github/`、`dist/`、README.md 等，不要再套一层 `hajime/` 目录。
4. 打开仓库 Settings → Pages，在 Build and deployment 的 Source 里选择 **GitHub Actions**。
5. 打开 Actions → Publish GitHub Pages → Run workflow，选择 main 并运行（初次上传时未开启 Pages，可能需要这次手动重跑）。
6. 部署成功后，在 Settings → Pages 或 workflow 的 github-pages environment 查看实际网址。项目网站通常位于 `https://你的用户名.github.io/仓库名/`；请以 GitHub 返回的地址为准。

后续更新只需推送到 main，Actions 将自动发布。工作流只部署 dist，不会公开本地缓存或 Git 历史。

## 学习记录迁移

学习进度保存在当前网址对应的浏览器本机存储。迁移前，在原网站「学习档案」导出学习记录，在新网址导入。真题答题记录独立保存，需在「真题训练」中另外导出、导入。更换网址不会自动复制这些记录。

GitHub Pages 提供网站的云端访问，当前版本不提供学习记录跨设备自动同步。发音仍依赖浏览器可用的日语声音。

## 后续 AI 助教

当前网站尚未接入 GPT。GitHub Pages 不能保管或执行服务器端 API 密钥；如以后接入 GPT，需要额外的后端服务。不要将 API 密钥提交到此仓库或放入前端脚本。

参考：[GitHub Pages 官方部署说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
