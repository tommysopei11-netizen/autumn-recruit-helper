# Autumn Recruit Helper

Tampermonkey 秋招助手：根据嵌入式/自动化方向简历自动筛选招聘岗位和公司，隐藏低匹配岗位，打开高匹配岗位，并在安全条件下导航到申请页面。

## 安装

直接打开：

https://raw.githubusercontent.com/tommysopei11-netizen/autumn-recruit-helper/main/autumn_recruit_helper.user.js

Tampermonkey 会识别为 userscript 并提示安装。

## 自动更新

脚本已配置固定的 `@updateURL` 和 `@downloadURL`。以后只要仓库中的脚本版本号提升，Tampermonkey 即可检查并安装更新，无需重复下载 ZIP。

## 当前功能

- 按个人简历自动筛选岗位
- S/A/B/C 匹配分级
- 自动隐藏低匹配岗位
- 高匹配岗位批量打开
- 安全导航到申请/投递页面
- 详情页匹配度、方向和简历版本推荐
- 投递记录与 CSV 导出
- 自动填写常用网申字段
- 浮动面板可拖动、收起
- 每个招聘网站独立记忆面板位置

## 安全边界

脚本不会自动点击“确认投递”“提交申请”“发送简历”等最终提交动作；最终提交由用户确认。
