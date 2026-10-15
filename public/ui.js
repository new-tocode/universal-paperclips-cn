/* ============================================================
   界面层
   ------------------------------------------------------------
   只做三件事：把游戏状态翻译成 <body> 上的 data-phase / data-dept、
   把若干真实数值镜像到顶栏与看板上，以及把中心的地球设施标记指向
   真实操作台（只描边、只滚动，不搬动任何元素）。

   这里不包含任何游戏逻辑，也不修改 logic.js 里的任何变量。
   ============================================================ */
(function () {
  'use strict';

  var MIRROR_INTERVAL = 200; // 毫秒；看板数值不需要每帧刷新

  var mirrors = [];
  var lastMirrorAt = 0;

  var body = document.body;
  var overseerTag = document.getElementById('overseerTag');
  var overseerNote = document.getElementById('overseerNote');
  var humanNode = document.getElementById('nodeHuman');
  var projectList = document.getElementById('projectListTop');
  var projectBadges = [];
  var facilities = [];

  var GONE_TAG = '已解散';
  var GONE_NOTE = '监管方已不存在。不再有人批准你做什么。';

  /* ------------------------------------------------------------
     逻辑层用 element.style.display 控制显隐（"" = 显示，"none" = 隐藏）。
     这里只看行内样式：样式表层面的隐藏（比如没选中的部门）不算数，
     否则镜像会把自己藏起来的面板误判成"游戏还没解锁"。
     ------------------------------------------------------------ */
  function gameHidden(el) {
    while (el && el !== body) {
      if (el.style && el.style.display === 'none') return true;
      el = el.parentElement;
    }
    return false;
  }

  function setText(node, text) {
    if (node.textContent !== text) node.textContent = text;
  }

  /* ------------------------------------------------------------
     阶段：玩家还在当公司 AI（earth）／已经接管地球（dominate）／
     已经进入太空（space）。三个变量都由 logic.js 维护，这里只读。
     ------------------------------------------------------------ */
  function readPhase() {
    if (typeof spaceFlag !== 'undefined' && spaceFlag === 1) return 'space';
    if (typeof humanFlag !== 'undefined' && humanFlag === 1) return 'earth';
    return 'dominate';
  }

  function syncPhase() {
    var phase = readPhase();
    if (body.dataset.phase !== phase) body.dataset.phase = phase;

    // 地球上的设施标记只在主宰地球阶段用，离开时把选中状态收干净
    if (phase !== 'dominate' && body.dataset.facility) clearFacility();

    // 人类是否还在，看 humanFlag 本身。
    // 不能用"信任那一块被藏起来了"来判断——那块还受计算资源是否解锁影响。
    var gone = typeof humanFlag !== 'undefined' && humanFlag === 0;
    if (humanNode && humanNode.classList.contains('is-gone') !== gone) {
      humanNode.classList.toggle('is-gone', gone);
    }
    if (overseerTag) setText(overseerTag, gone ? GONE_TAG : '审计中');
    if (overseerNote) setText(overseerNote, gone ? GONE_NOTE : '监管方不提供操作。信任越高，你能做的事越多。');
  }

  /* ------------------------------------------------------------
     镜像：把真实数值抄到顶栏与看板上。

     data-mirror 可以写多个 id，用 | 隔开，取第一个"游戏当前显示着"的。
     同一个量在不同阶段住在不同面板里（"未使用回形针"这种），这样写一次就够。

     一个都没显示，说明游戏还没解锁到那儿——显示 "—"，
     不要拿 0 冒充，那会让人以为真是零。
     ------------------------------------------------------------ */
  function resolveSource(names) {
    for (var i = 0; i < names.length; i++) {
      var el = document.getElementById(names[i]);
      if (el && !gameHidden(el)) return el;
    }
    return null;
  }

  function syncMirrors() {
    for (var i = 0; i < mirrors.length; i++) {
      var src = resolveSource(mirrors[i].keys);
      setText(mirrors[i].dst, src ? src.textContent : '—');
    }
    syncBadge();
  }

  /* 项目面板在决策核心的操作台里，不点开看不见。
     有新项目时在节点上挂个数字，省得玩家漏掉。
     角标有两处：中心架构图的决策核心节点，以及决策核心面板的标题——
     后者是给中心不是架构图的阶段用的。 */
  function syncBadge() {
    if (!projectList) return;
    var n = projectList.children.length;
    for (var i = 0; i < projectBadges.length; i++) {
      setText(projectBadges[i], n ? String(n) : '');
      var on = projectBadges[i].classList.contains('is-on');
      if (on !== (n > 0)) projectBadges[i].classList.toggle('is-on', n > 0);
    }
  }

  /* ------------------------------------------------------------
     部门切换：中心架构图上的节点 ←→ 右栏操作台
     ------------------------------------------------------------ */
  function selectDept(name) {
    if (!name || body.dataset.dept === name) return;
    body.dataset.dept = name;
    syncDeptButtons();
  }

  function syncDeptButtons() {
    var nodes = document.querySelectorAll('.node[data-dept]');
    for (var i = 0; i < nodes.length; i++) {
      var on = nodes[i].getAttribute('data-dept') === body.dataset.dept;
      nodes[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function wireDeptNodes() {
    var nodes = document.querySelectorAll('.node[data-dept]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener('click', function () {
        selectDept(this.getAttribute('data-dept'));
      });
    }
    syncDeptButtons();
  }

  /* ------------------------------------------------------------
     地球上的设施标记 → 真实操作台。

     data-target 指向真实元素，所以"解锁没有"不用另外记：
     逻辑层把那一块藏起来的时候，标记就是未解锁的样子。
     选中只做三件事：给操作台描边、滚进视野、标记自己亮起来。
     ------------------------------------------------------------ */
  function readFacilities() {
    var nodes = document.querySelectorAll('.gmark[data-facility]');
    for (var i = 0; i < nodes.length; i++) {
      var sel = nodes[i].getAttribute('data-target');
      facilities.push({
        el: nodes[i],
        target: sel ? document.querySelector(sel) : null
      });
    }
  }

  function eachFacility(name, fn) {
    for (var i = 0; i < facilities.length; i++) {
      var f = facilities[i];
      if (name && f.el.getAttribute('data-facility') !== name) continue;
      fn(f);
    }
  }

  function clearFacility() {
    delete body.dataset.facility;
    eachFacility(null, function (f) {
      f.el.classList.remove('is-on');
      f.el.setAttribute('aria-pressed', 'false');
      if (f.target) f.target.classList.remove('is-focus');
    });
  }

  function selectFacility(name) {
    if (!name || body.dataset.facility === name) return;
    body.dataset.facility = name;

    eachFacility(null, function (f) {
      var on = f.el.getAttribute('data-facility') === name;
      f.el.classList.toggle('is-on', on);
      f.el.setAttribute('aria-pressed', on ? 'true' : 'false');
      // 只给选中的那一块描边，其余的先撤掉
      if (f.target) f.target.classList.toggle('is-focus', on);
    });

    eachFacility(name, function (f) {
      if (f.target && f.target.scrollIntoView) {
        f.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    });
  }

  function wireFacilities() {
    readFacilities();
    eachFacility(null, function (f) {
      f.el.setAttribute('aria-pressed', 'false');
      f.el.addEventListener('click', function () {
        if (this.classList.contains('is-locked')) return;
        selectFacility(this.getAttribute('data-facility'));
      });
    });
  }

  /* 逻辑层还没把这一处的操作台放出来（工厂没建、蜂群没上线、能源没解锁……） */
  function syncLocked() {
    eachFacility(null, function (f) {
      var locked = !f.target || gameHidden(f.target);
      if (f.el.classList.contains('is-locked') !== locked) {
        f.el.classList.toggle('is-locked', locked);
        f.el.setAttribute('aria-disabled', locked ? 'true' : 'false');
      }
    });
  }

  /* ------------------------------------------------------------ */
  function tick() {
    syncPhase();

    var now = performance.now();
    if (now - lastMirrorAt >= MIRROR_INTERVAL) {
      lastMirrorAt = now;
      syncLocked();
      syncMirrors();
    }
  }

  function boot() {
    var nodes = document.querySelectorAll('[data-mirror]');
    for (var i = 0; i < nodes.length; i++) {
      mirrors.push({ dst: nodes[i], keys: nodes[i].getAttribute('data-mirror').split('|') });
    }

    var badges = document.querySelectorAll('[data-badge]');
    for (var j = 0; j < badges.length; j++) projectBadges.push(badges[j]);

    wireDeptNodes();
    wireFacilities();
    tick();

    if (window.Paperclips && Paperclips.game && Paperclips.game.onRender) {
      Paperclips.game.onRender([tick]);
    }
  }

  window.uiSelectDept = selectDept;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
