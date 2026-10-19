# 学习进度云端同步

项目：hajime-nihongo；Supabase ref：wlwuqowvjyauuttepqry；组织：Licop‘s org；区域：ap-southeast-1。

## 使用方法

1. 打开 https://licop2022.github.io/hajime-nihongo/，点击顶部「登录 / 同步」。
2. 邮箱注册后完成验证，再回网站登录。
3. 在原来学习的浏览器点击「导入本机原有进度」，等待显示「已同步」。原来的本机记录另有备份。
4. 手机和电脑使用同一网址、同一账号。每次学习先在本机保存，约一秒后同步；重新联网、回到网页及前台每30秒重试。
5. 两端离线修改同一份记录会提示选择云端或本机版本，可先导出两份备份。完成学习后关闭网页前确认「已同步」。

网站更换域名不会自动复制浏览器旧记录；仍需从旧网址导出课程和真题记录，在新网址导入。声音、罗马音开关为设备偏好。

## 认证服务配置

在 Supabase Dashboard → Authentication → URL Configuration，将 Site URL 设为 https://licop2022.github.io/hajime-nihongo/，将同一地址加入 Redirect URLs。此项需要项目所有者在控制台完成；不要关闭邮箱验证。

注册邮件是否送达尚需使用自己的邮箱验证。默认邮件服务有收件人和频率限制；面向更多用户时配置自有 SMTP。不要把邮箱密码、secret 或 service_role key 放到网页和仓库。

## 维护与验证

数据库迁移已执行：supabase/migrations/202610180001_progress_sync.sql。不要重复盲目执行。

前端仅使用公开的 publishable key，认证由 Supabase Auth 处理。hajime_progress 启用按 auth.uid() 限制的 RLS，未登录不能读写。hajime_save_progress 使用 revision 比较更新，拒绝过期上传；不按设备时钟覆盖。

study 保存课程、单词、每日计划、草稿和学习档案；real 独立保存真题答题、笔记和历史。账号缓存隔离；退出恢复游客记录。

检查命令：node verify-cloud.cjs、node verify-cloud-ui.cjs，连同课程、语音和罗马音检查在 GitHub Actions 中执行。数据库权限、两用户隔离与过期版本拒绝已实际检查；浏览器使用临时测试账号验证登录和上传。注册邮件送达与两台实际设备需由用户登录后确认。

Supabase SDK 固定为2.118.0并随网站托管，来源、校验值与许可见 dist/vendor/README.md。更新时同步替换文件、记录校验值并重跑检查。
