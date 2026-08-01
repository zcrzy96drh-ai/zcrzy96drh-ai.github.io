---
title: "{{ replace .Name "-" " " | title }}"
description: ""
date: {{ .Date }}
draft: true
cover:
  image: ""
---

<!-- 
  发布前 checklist:
  1. 写正文
  2. draft 改为 false
  3. 如有英文版，复制到 content/en/posts/{{ .Name }}.md
  4. hugo server -D 预览
  5. git push
-->
