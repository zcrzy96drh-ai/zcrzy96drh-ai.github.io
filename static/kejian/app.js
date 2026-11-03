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
    if (window.innerWidth !== lastW || window.innerHeight !== lastH) fit();
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
    // 标题不带动画
    head.style.opacity = 1;
  });

  /* ---------- 翻页 ---------- */
  var pageno = document.getElementById("pageno");
  function show(n) {
    if (n < 0 || n >= slides.length) return;
    slides[cur].classList.remove("active");
    cur = n;
    var sl = slides[cur];
    sl.classList.add("active");
    pageno.textContent = (cur + 1) + " / " + slides.length;
    // 渐入动画（后台标签页 rAF 会被冻结，改用 setTimeout 保证触发）
    var els = sl.querySelectorAll(".re");
    Array.prototype.forEach.call(els, function (el, i) {
      el.classList.remove("in");
      el.style.transitionDelay = (i * 0.05) + "s";
    });
    setTimeout(function () {
      Array.prototype.forEach.call(els, function (el) { el.classList.add("in"); });
    }, 30);
  }
  document.getElementById("prevBtn").addEventListener("click", function () { show(cur - 1); });
  document.getElementById("nextBtn").addEventListener("click", function () { show(cur + 1); });

  /* ---------- 键盘 / 手势 ---------- */
  document.addEventListener("keydown", function (e) {
    // 浮层打开时：只允许 Esc 关闭，屏蔽翻页/全屏/点名等快捷键
    var pickerEl = document.getElementById("picker");
    var helpEl = document.getElementById("help");
    var overlayOpen = (pickerEl && pickerEl.classList.contains("show")) ||
                      (helpEl && helpEl.classList.contains("show"));
    if (overlayOpen) {
      if (e.key === "Escape") { closePicker(); closeHelp(); }
      return;
    }
    if (e.key === "ArrowRight") show(cur + 1);
    else if (e.key === "ArrowLeft") show(cur - 1);
    else if (e.key === "f" || e.key === "F") toggleFS();
    else if (e.key === "n" || e.key === "N") openPicker();
    else if (e.key === "Escape") { closePicker(); closeHelp(); }
  });
  var tx = 0;
  stage.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 60) show(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------- 全屏 ---------- */
  function toggleFS() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
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
      exp: "雨果生于1802年，1822年发表处女作《颂歌集》，创作生涯长达60余年。" }
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
      if (qi < QUIZ.length - 1) { qi++; renderQuiz(); } else { show(cur + 1); }
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
    function render() {
      var m = Math.floor(left / 60), s = left % 60;
      tt.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
      tt.style.color = left <= 10 ? "#e05545" : "";
    }
    render();
    box.querySelector("[data-tstart]").addEventListener("click", function () {
      if (timer) { clearInterval(timer); timer = null; this.textContent = "继续"; return; }
      if (left <= 0) return;
      var self = this;
      self.textContent = "暂停";
      timer = setInterval(function () {
        left--;
        render();
        if (left <= 0) { clearInterval(timer); timer = null; self.textContent = "时间到"; confettiBurst(50); }
      }, 1000);
    });
    box.querySelector("[data-treset]").addEventListener("click", function () {
      clearInterval(timer); timer = null; left = total; render();
      box.querySelector("[data-tstart]").textContent = "开始";
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
    btn.addEventListener("click", function () {
      con.hidden = false;
      btn.style.display = "none";
    });
  })();

  /* ---------- 帮助 ---------- */
  var help = document.getElementById("help");
  document.getElementById("helpBtn").addEventListener("click", function () { help.classList.add("show"); });
  document.getElementById("helpClose").addEventListener("click", closeHelp);
  function closeHelp() { help.classList.remove("show"); }

  /* ---------- 掌声彩带 ---------- */
  var cvs = document.getElementById("confetti");
  var ctx = cvs.getContext("2d");
  function sizeCvs() { cvs.width = 1280; cvs.height = 720; }
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
  function tick() {
    ctx.clearRect(0, 0, 1280, 720);
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
    if (parts.length) { raf = requestAnimationFrame(tick); }
    else { raf = null; ctx.clearRect(0, 0, 1280, 720); }
  }
  /* 初始化 */
  show(0);
})();
