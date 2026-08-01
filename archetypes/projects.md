---
title: "{{ replace .Name "-" " " | title }}"
description: ""
date: {{ .Date }}
draft: true
tags: []
cover:
  image: "/images/projects/{{ .Name }}.png"
links:
  - title: GitHub
    url: ""
  - title: 在线演示
    url: ""
---

<!-- 
  发布前 checklist:
  1. 写项目说明（技术栈、功能、截图）
  2. draft 改为 false
  3. 如有英文版，复制到 content/en/projects/{{ .Name }}.md
  4. 封面图放 static/images/projects/{{ .Name }}.png
  5. hugo server -D 预览
  6. git push
-->
