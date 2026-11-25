/* 《就英法联军远征中国致巴特勒上尉的信》互动课堂 */
(function () {
  "use strict";
  var stage = document.getElementById("stage");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var cur = 0;

  /* ---------- 多显示屏自适应（仅自动适配，无手动缩放） ---------- */
  var lastW = 0, lastH = 0;
  function fit() {
    var s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    stage.style.transform = "translate(-50%,-50%) scale(" + s + ")";
    lastW = window.innerWidth; lastH = window.innerHeight;
  }
  window.addEventListener("resize", fit);
  document.addEventListener("fullscreenchange", fit);
  window.addEventListener("orientationchange", fit);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fit);
  if (window.ResizeObserver) {
    try { new ResizeObserver(function () { fit(); }).observe(document.getElementById("viewport")); } catch (e) {}
  }
  fit();
  // 白板/多屏切换时个别浏览器不一定派发 resize，兜底轮询尺寸变化
  setInterval(function () {
    if (window.innerWidth !== lastW || window.innerHeight !== lastH) {
      fit();
      if (typeof sizeCvs === "function") sizeCvs(); // 彩带画布随舞台同步重算
    }
  }, 1000);

  /* ---------- 注入页眉 ---------- */
  slides.forEach(function (sl) {
    if (sl.classList.contains("cover")) return;
    var tag = sl.getAttribute("data-tag") || "";
    var title = sl.getAttribute("data-title") || "";
    var head = document.createElement("div");
    head.className = "shead";
    head.innerHTML = '<div class="tag"></div><h1></h1>';
    head.querySelector(".tag").textContent = tag;
    head.querySelector("h1").textContent = title;
    // 关卡进度：0=导入/第零关，1—5=各关，6=通关
    var LEVEL_BY_INDEX = [null, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 5, 6, 6, 6, null];
    var lv = LEVEL_BY_INDEX[slides.indexOf(sl)];
    if (lv != null) {
      var rail = document.createElement("div");
      rail.className = "levelrail";
      for (var i = 0; i < 7; i++) {
        var seg = document.createElement("i");
        if (i < lv) seg.className = "done";
        else if (i === lv) seg.className = "now";
        rail.appendChild(seg);
      }
      head.appendChild(rail);
    }
    sl.insertBefore(head, sl.firstChild);
    // 「雨果」骑缝印章（页眉与正文交界处）
    var seal = document.createElement("div");
    seal.className = "seal";
    seal.textContent = "雨果";
    sl.appendChild(seal);
    // 巨型「信」水印（页面右下）
    var wm = document.createElement("div");
    wm.className = "wm";
    wm.textContent = "信";
    sl.appendChild(wm);
    // 标题不带动画
    head.style.opacity = 1;
  });

  /* ---------- 翻页 ---------- */
  var pageno = document.getElementById("pageno");
  /* ---------- 翻页特效表：按页面内容特性逐页指定（索引 0—21） ----------
     cover=封面推镜 slide=侧滑 zoom=推镜 rise=浮升 fade=淡化 flip=翻板
     wipe=擦除 swivel=旋落 fly-x=元素交错飞入 fly-y=元素逐行上浮 pop=元素弹入 */
  var FX_BY_PAGE = ["cover","fly-x","slide","pop","fly-y","fade","wipe","zoom","slide","fly-x","fly-y","flip","pop","fade","slide","fly-y","fly-x","swivel","zoom","rise","pop","cover"];
  var EL_FX = { "fly-x": 1, "fly-y": 1, "pop": 1 }; // 元素级特效（页面瞬切，卡片飞入）
  function show(n, dir) {
    if (n < 0 || n >= slides.length || n === cur) return;
    // 本页指定特效（slide/cover 为默认，不设属性）
    var fx = FX_BY_PAGE[n] || "slide";
    if (fx === "slide" || fx === "cover") stage.removeAttribute("data-fx");
    else stage.setAttribute("data-fx", fx);
    // 旧页不立即隐藏，而是缩小淡出退场，与新页形成交替
    // 深链直达时旧页并未激活，跳过退场动画，避免首屏闪一帧封面
    var oldSl = slides[cur];
    var hadActive = oldSl.classList.contains("active");
    slides.forEach(function (s) { s.classList.remove("leave", "lv-back"); });
    if (hadActive) {
      oldSl.classList.remove("active");
      oldSl.classList.add("leave");
      if (dir === -1) oldSl.classList.add("lv-back");
      setTimeout(function () { oldSl.classList.remove("leave", "lv-back"); }, 480);
    }
    cur = n;
    var sl = slides[cur];
    // dir<0 时页面从左侧进入，配合 pageInBack 动画
    sl.classList.toggle("back", dir === -1);
    sl.classList.add("active");
    pageno.textContent = (cur + 1) + " / " + slides.length;
    pageno.classList.remove("tick");
    void pageno.offsetWidth; // 重启动画
    pageno.classList.add("tick");
    // 渐入动画（后台标签页 rAF 会被冻结，改用 setTimeout 保证触发）
    var els = sl.querySelectorAll(".re");
    var stag = EL_FX[fx] ? 0.08 : 0.05; // 元素级特效用更长的错落间隔
    Array.prototype.forEach.call(els, function (el, i) {
      el.classList.remove("in");
      el.style.transitionDelay = (i * stag) + "s";
    });
    setTimeout(function () {
      Array.prototype.forEach.call(els, function (el) { el.classList.add("in"); });
    }, 30);
  }
  /* 统一翻页入口：所有翻页来源（按钮/键盘/滑动/空白点击/Quiz 完成）共用；
     成功翻页时统一刷新 lastNavTs，让空白点击的防抖对一切来源生效 */
  var lastNavTs = 0;   // 最近一次成功翻页的时间
  var lastClickTs = 0; // 最近一次空白点击尝试的时间（无论是否翻页成功）
  function navTo(n, dir) {
    if (n < 0 || n >= slides.length || n === cur) return false;
    show(n, dir);
    lastNavTs = Date.now();
    return true;
  }
  // 按钮防抖：双击/触屏双点只翻一页；键盘路径不防抖，保留快速连按
  function navStep(d) {
    if (Date.now() - lastNavTs < 300) return false;
    return navTo(cur + d, d);
  }
  document.getElementById("prevBtn").addEventListener("click", function () { navStep(-1); });
  document.getElementById("nextBtn").addEventListener("click", function () { navStep(1); });

  /* ---------- 键盘 / 手势 ---------- */
  document.addEventListener("keydown", function (e) {
    // 点名器打开时：只允许 Esc 关闭，屏蔽翻页/全屏/点名等快捷键
    var pickerEl = document.getElementById("picker");
    if (pickerEl && pickerEl.classList.contains("show")) {
      if (e.key === "Escape") closePicker();
      return;
    }
    if (e.key === "ArrowRight") navTo(cur + 1, 1);
    else if (e.key === "ArrowLeft") navTo(cur - 1, -1);
    else if (e.key === "PageDown") navTo(cur + 1, 1);
    else if (e.key === "PageUp") navTo(cur - 1, -1);
    else if (e.key === "f" || e.key === "F") toggleFS();
    else if (e.key === "n" || e.key === "N") openPicker();
    else if (e.key === "Escape") closePicker();
  });
  /* ---------- 触屏翻页：左右滑动前/后翻；点按空白处前进 ---------- */
  var tx = 0, ty = 0, lastTouchTs = 0;
  // 点到这些交互元素时只响应元素自身逻辑，不翻页
  var NO_FLIP = "button,a,input,select,textarea,.timerbox,#quizBox,.quiz-card,#radarBox,.seq-tipwrap,.seq-item,.seq-final,.noflip,#picker,.overlay,.seal";
  function pickerOpen() {
    var pk = document.getElementById("picker");
    return pk && pk.classList.contains("show");
  }
  function tapFeedback(x, y) {
    // 点按涟漪，给触屏一个「已翻页」的即时反馈
    var r = document.createElement("div");
    r.className = "tap-ripple";
    r.style.cssText = "left:" + x + "px;top:" + y + "px;width:90px;height:90px";
    document.getElementById("viewport").appendChild(r);
    setTimeout(function () { r.remove(); }, 600);
  }
  function blankAdvance(x, y) {
    if (pickerOpen()) return false;
    var now = Date.now();
    // 连点吸收：每次空白点击（无论是否翻页成功）都刷新窗口——
    // 间隔 <300ms 的连点只翻一页（3 次以上也吸收），间隔 ≥300ms 的点击每次都翻（设计如此）
    var ok = now - lastClickTs >= 300 && now - lastNavTs >= 300;
    lastClickTs = now;
    if (!ok || !navTo(cur + 1, 1)) return false;
    tapFeedback(x, y); // 只有真正翻页才画涟漪
    return true;
  }
  stage.addEventListener("touchstart", function (e) {
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    var t = e.changedTouches[0];
    var dx = t.clientX - tx, dy = t.clientY - ty;
    // 横向滑动翻页
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      lastTouchTs = Date.now();
      navTo(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      return;
    }
    // 轻点（非滑动）：空白处前进
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      lastTouchTs = Date.now(); // 屏蔽随后浏览器派发的合成 click，避免连翻两页
      if (e.target.closest(NO_FLIP)) return;
      blankAdvance(t.clientX, t.clientY);
    }
  }, { passive: true });
  // 鼠标点击空白处前进（触屏路径已在 touchend 处理并设置 lastTouchTs）
  stage.addEventListener("click", function (e) {
    if (Date.now() - lastTouchTs < 800) return;
    if (e.target.closest(NO_FLIP)) return;
    blankAdvance(e.clientX, e.clientY);
  });

  /* ---------- 全屏 ---------- */
  function toggleFS() {
    var de = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (de.requestFullscreen) {
        de.requestFullscreen().catch(function () {});
      } else if (de.webkitRequestFullscreen) {
        de.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }
  document.getElementById("fsBtn").addEventListener("click", toggleFS);

  /* ---------- 知人论世 Quiz ---------- */
  var QUIZ = [
    { q: "① 雨果是哪国作家？", opts: ["A. 英国", "B. 法国", "C. 俄国"], ans: 1,
      exp: "法国。写《雾都孤儿》的那个叫狄更斯，别认错人。" },
    { q: "② 他的代表作不包括？", opts: ["A. 《巴黎圣母院》", "B. 《悲惨世界》", "C. 《战争与和平》"], ans: 2,
      exp: "《战争与和平》是俄国托尔斯泰的。雨果代表作：《巴黎圣母院》《悲惨世界》《九三年》。" },
    { q: "③ 他属于哪个文学流派？", opts: ["A. 浪漫主义", "B. 现实主义", "C. 荒诞派"], ans: 0,
      exp: "19世纪法国浪漫主义文学的旗手。" },
    { q: "④ 他一生创作了多少年？", opts: ["A. 20 年", "B. 40 年", "C. 60 余年"], ans: 2,
      exp: "雨果生于1802年，1822年出版第一本诗集《颂歌集》，创作生涯长达60余年。" }
  ];
  var quizBox = document.getElementById("quizBox");
  var qi = 0;
  function renderQuiz() {
    var d = QUIZ[qi];
    quizBox.innerHTML =
      '<div class="quiz-q">' + d.q + '</div>' +
      '<div class="quiz-opts">' + d.opts.map(function (o, i) {
        return '<button class="btn btn-line" data-i="' + i + '">' + o + '</button>';
      }).join("") + "</div>" +
      '<div class="quiz-exp">' + d.exp + "</div>" +
      '<div class="quiz-foot"><span class="score-chip">第 ' + (qi + 1) + " / " + QUIZ.length + " 题</span>" +
      '<button class="btn btn-gold quiz-next" style="padding:9px 22px">' + (qi < QUIZ.length - 1 ? "下一题" : "完成，进入课文") + "</button></div>";
    quizBox.querySelectorAll(".quiz-opts .btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = parseInt(b.getAttribute("data-i"), 10);
        var btns = quizBox.querySelectorAll(".quiz-opts .btn");
        if (i === d.ans) {
          btns[i].classList.add("right");
          confettiBurst(30);
        } else {
          // 答错：亮出正确答案 + 解析
          btns[i].classList.add("wrong");
          btns[d.ans].classList.add("right");
        }
        quizBox.querySelector(".quiz-exp").classList.add("show");
        quizBox.querySelector(".quiz-next").style.display = "inline-block";
        btns.forEach(function (x) { x.disabled = true; });
      });
    });
    quizBox.querySelector(".quiz-next").addEventListener("click", function () {
      // 走统一入口：翻页成功会刷新 lastNavTs，随后落在卡片空白上的第二击不再连翻/跳页
      if (qi < QUIZ.length - 1) { qi++; renderQuiz(); } else { navTo(cur + 1, 1); }
    });
  }
  renderQuiz();

  /* ---------- 反语雷达（作答后揭晓答案） ---------- */
  var RADAR = [
    { q: "A.「丰功伟绩！收获巨大！」", yes: true, ans: "是反语",
      fb: "字面说功劳极大？实为滔天罪行，赞得越狠，骂得越毒。" },
    { q: "B.「不同的只是干得更彻底，更漂亮，以至于荡然无存。」", yes: true, ans: "是反语",
      fb: "烧得「漂亮」？漂亮的只有侵略者的无耻。" },
    { q: "C.「我们欧洲人是文明人，中国人在我们眼中是野蛮人。这就是文明对野蛮所干的事情。」", yes: true, ans: "是反语",
      fb: "谁文明？谁野蛮？全句翻转，字字见血。" },
    { q: "D.「我希望有朝一日，解放了的干干净净的法兰西会把这份战利品归还给被掠夺的中国，那才是真正的物主。」", yes: false, ans: "不是反语",
      fb: "这是雨果真诚的愿望——他希望文明终能归位。" }
  ];
  var radarBox = document.getElementById("radarBox");
  radarBox.innerHTML = RADAR.map(function (d, i) {
    return '<div class="card radar-item" data-i="' + i + '">' +
      '<div class="q">' + d.q + '</div>' +
      '<div class="jd"><button class="btn btn-line" data-y="1">是反语</button>' +
      '<button class="btn btn-line" data-y="0">不是</button></div>' +
      '<div class="fb"></div></div>';
  }).join("");
  radarBox.querySelectorAll(".radar-item").forEach(function (item) {
    var i = parseInt(item.getAttribute("data-i"), 10);
    var d = RADAR[i];
    item.querySelectorAll(".jd .btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var sayYes = b.getAttribute("data-y") === "1";
        var ok = sayYes === d.yes;
        var fb = item.querySelector(".fb");
        fb.innerHTML = ok
          ? '<b style="color:#2e7d4f">✔ 判断正确。</b>' + d.fb
          : '<b style="color:var(--red)">✘ 正确答案：' + d.ans + '。</b>' + d.fb;
        fb.classList.add("show");
        item.classList.add(ok ? "right-flash" : "wrong-flash");
        if (ok) { confettiBurst(18); }
        item.querySelectorAll(".jd .btn").forEach(function (x) { x.disabled = true; });
      });
    });
  });

  /* ---------- 第9页：提示下拉 + 点击逐个揭晓 ---------- */
  (function () {
    var items = Array.prototype.slice.call(document.querySelectorAll(".seq-item"));
    if (!items.length) return;
    var shown = 0;
    var tipBtn = document.querySelector(".seq-tipbtn");
    var tipBody = document.querySelector(".seq-tipbody");
    if (tipBtn && tipBody) {
      tipBtn.addEventListener("click", function () {
        tipBody.hidden = !tipBody.hidden;
        tipBtn.classList.toggle("open", !tipBody.hidden);
      });
    }
    items.forEach(function (it) {
      it.querySelector(".seq-head").addEventListener("click", function () {
        if (this.disabled) return;
        this.disabled = true;
        if (shown === 0) {
          // 首次点击后，未揭晓的两项先显示空框
          items.forEach(function (x) {
            var b = x.querySelector(".seq-body");
            b.hidden = false;
            if (x !== it) {
              b.classList.add("waiting");
              b.querySelector(".seq-inner").hidden = true;
            }
          });
        }
        var body = it.querySelector(".seq-body");
        body.hidden = false;
        body.classList.remove("waiting");
        body.querySelector(".seq-inner").hidden = false;
        body.style.animation = "seqIn .4s ease";
        shown++;
        if (shown === items.length) {
          var fin = document.querySelector(".seq-final");
          setTimeout(function () {
            fin.hidden = false;
            fin.style.animation = "seqIn .5s ease";
            confettiBurst(25);
          }, 350);
        }
      });
    });
  })();

  /* ---------- 计时器 ---------- */
  document.querySelectorAll("[data-timer]").forEach(function (tt) {
    var total = parseInt(tt.getAttribute("data-timer"), 10);
    var left = total, timer = null, box = tt.closest(".timerbox");
    var startBtn = box.querySelector("[data-tstart]");
    var resetBtn = box.querySelector("[data-treset]");
    function render() {
      var m = Math.floor(left / 60), s = left % 60;
      tt.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
      tt.style.color = left <= 10 ? "#e05545" : "";
    }
    render();
    var timerEl = tt.closest(".timer");
    var lastTimerTs = 0; // 开始/重置的连点防抖（S1）
    startBtn.addEventListener("click", function () {
      var now = Date.now();
      if (now - lastTimerTs < 300) return; // 双击不反转状态
      lastTimerTs = now;
      if (timer) { clearInterval(timer); timer = null; this.textContent = "继续"; timerEl.classList.remove("run"); return; }
      if (left <= 0) return;
      var self = this;
      self.textContent = "暂停";
      timerEl.classList.add("run");
      timer = setInterval(function () {
        left--;
        render();
        if (left <= 0) {
          clearInterval(timer); timer = null;
          self.textContent = "时间到"; timerEl.classList.remove("run");
          self.disabled = true; // 归零后按钮不可再点（S7）
          if (slides[cur].contains(box)) confettiBurst(50); // 只在本页可见时爆彩带（S5）
        }
      }, 1000);
    });
    resetBtn.addEventListener("click", function () {
      var now = Date.now();
      if (now - lastTimerTs < 300) return;
      lastTimerTs = now;
      clearInterval(timer); timer = null; left = total; render();
      timerEl.classList.remove("run");
      startBtn.textContent = "开始";
      startBtn.disabled = false;
    });
  });

  /* ---------- 点名器（名单来自 roster.js） ---------- */
  var ROSTER = (window.YMY_ROSTER && window.YMY_ROSTER.length) ? window.YMY_ROSTER : [];
  var NAMES = ROSTER.map(function (n, i) {
    if (/^\d+号/.test(n)) return n;
    var num = (i + 1) < 10 ? "0" + (i + 1) : "" + (i + 1);
    return num + "号 " + n;
  });
  var picker = document.getElementById("picker");
  var nameEl = document.getElementById("pickerName");
  var spinning = null;
  var pickCount = 1; // 1=抽1人 2=抽2人（如双人合作）
  var lastPickTs = 0; // 开始/停止的连点防抖
  function openPicker() {
    picker.classList.add("show");
    renderPickMode();
  }
  function closePicker() {
    picker.classList.remove("show");
    if (spinning) { clearInterval(spinning); spinning = null; }
    renderPickMode();
  }
  function renderPickMode() {
    var btn = document.getElementById("pickGo");
    if (spinning) return;
    btn.textContent = pickCount === 2 ? "抽两位上台" : "抽一位上台";
    nameEl.classList.toggle("pk", pickCount === 2);
  }
  document.querySelectorAll("[data-pick]").forEach(function (b) { b.addEventListener("click", openPicker); });
  document.getElementById("pickClose").addEventListener("click", closePicker);
  // 单击标题切换 抽1人/抽2人
  document.querySelector("#picker .panel h2").addEventListener("click", function () {
    pickCount = pickCount === 2 ? 1 : 2;
    renderPickMode();
  });
  document.getElementById("pickGo").addEventListener("click", function () {
    var now = Date.now();
    if (now - lastPickTs < 300) return; // 「停止」连点不重新滚动（S2）
    lastPickTs = now;
    if (!NAMES.length) {
      nameEl.textContent = "名单未加载";
      return;
    }
    if (spinning) { // 手动停止
      clearInterval(spinning); spinning = null;
      renderPickMode();
      popName();
      return;
    }
    this.textContent = "停止";
    spinning = setInterval(function () {
      if (pickCount === 2) {
        var a = NAMES[Math.floor(Math.random() * NAMES.length)];
        var b = NAMES[Math.floor(Math.random() * NAMES.length)];
        if (NAMES.length > 1) { while (b === a) b = NAMES[Math.floor(Math.random() * NAMES.length)]; }
        nameEl.classList.add("pk");
        nameEl.innerHTML = '<span style="margin:0 .45em">' + a + '</span><span style="color:var(--gold);font-size:.8em">PK</span><span style="margin:0 .45em">' + b + '</span>';
      } else {
        nameEl.classList.remove("pk");
        nameEl.textContent = NAMES[Math.floor(Math.random() * NAMES.length)];
      }
    }, 90);
  });
  function popName() {
    nameEl.classList.add("pop");
    setTimeout(function () { nameEl.classList.remove("pop"); }, 500);
    confettiBurst(80);
  }

  /* ---------- 第18页：讨论后揭晓结论 ---------- */
  (function () {
    var btn = document.getElementById("p18Reveal");
    var con = document.getElementById("p18Conclusion");
    if (!btn || !con) return;
    var lastRevealTs = 0;
    btn.addEventListener("click", function () {
      var now = Date.now();
      if (now - lastRevealTs < 300) return; // 双击只揭晓一次，第二击不再漏到引文条上翻页
      lastRevealTs = now;
      con.hidden = false;
      btn.style.display = "none";
    });
  })();

  /* ---------- 掌声彩带 ---------- */
  // 画布盒子与内部缓冲都对齐舞台矩形（1280×720 内容坐标 × scale）：
  // 彩带永远落在舞台内，且盖在点名器遮罩（z-index:50）之上可见
  var cvs = document.getElementById("confetti");
  var ctx = cvs.getContext("2d");
  var CV_SCALE = 1;
  function setConfettiMode(rect) {
    CV_SCALE = rect.width / 1280;
    cvs.style.left = rect.left + "px";
    cvs.style.top = rect.top + "px";
    cvs.style.width = rect.width + "px";
    cvs.style.height = rect.height + "px";
    cvs.width = Math.max(1, Math.round(rect.width));
    cvs.height = Math.max(1, Math.round(rect.height));
  }
  function sizeCvs() {
    var r = stage.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) { cvs.style.width = "0px"; cvs.style.height = "0px"; return; }
    setConfettiMode(r);
  }
  sizeCvs();
  var parts = [], raf = null;
  var COLORS = ["#C9A227", "#9E2B25", "#1B2A4A", "#E8E2D2", "#2E7D4F"];
  function confettiBurst(n) {
    for (var i = 0; i < n; i++) {
      parts.push({
        x: 640 + (Math.random() - 0.5) * 500,
        y: 340 + (Math.random() - 0.5) * 120,
        vx: (Math.random() - 0.5) * 9,
        vy: -4 - Math.random() * 6,
        s: 4 + Math.random() * 6,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 90 + Math.random() * 40
      });
    }
    if (!raf) tick();
  }
  // 舞台尺寸/缩放变化（含全屏、letterbox 偏移）时重算画布映射
  window.addEventListener("resize", sizeCvs);
  document.addEventListener("fullscreenchange", sizeCvs);
  function tick() {
    // 画布原点即舞台左上角：1280×720 内容坐标 × scale 即画布像素
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.setTransform(CV_SCALE, 0, 0, CV_SCALE, 0, 0);
    parts = parts.filter(function (p) { return p.life > 0 && p.y < 760; });
    parts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.r += p.vr; p.life--;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.min(1, p.life / 40);
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (parts.length) { raf = requestAnimationFrame(tick); }
    else { raf = null; ctx.clearRect(0, 0, cvs.width, cvs.height); }
  }
  /* ---------- 初始化：支持 #p=N 直达第 N 页（从 1 计） ---------- */
  function parseHash() {
    var m = location.hash.match(/^#?p=(\d+)$/); // 严格解析：拒绝 12x/2.9/007/+5 等前缀匹配
    return m ? Math.min(Math.max(parseInt(m[1], 10) - 1, 0), slides.length - 1) : -1;
  }
  var startAt = parseHash();
  // 深链直达（#p≥2，含刷新）：先静默摘下封面的初始 active，让 show() 的 hadActive 为 false——
  // 封面不播 450ms 退场动画，也不会在目标页透明背景下透出封面大标题残影；
  // 从封面起步（#p=1 / 无 hash）startAt 为 0，跳过此步，封面照常播 coverIn/kb 动画
  if (startAt > 0) slides[0].classList.remove("active");
  show(startAt === -1 ? 0 : startAt, 1);
  // 页内改 hash（如 #p=15）即时跳页；无效 hash 不响应
  window.addEventListener("hashchange", function () {
    var n = parseHash();
    if (n !== -1) navTo(n, n > cur ? 1 : -1);
  });
})();
