/* ============================================================
   界面层
   ------------------------------------------------------------
   只做两件事：把游戏状态翻译成 <body> 上的 data-phase / data-dept，
   以及把若干真实数值镜像到顶栏与看板上。

   这里不包含任何游戏逻辑，也不修改 logic.js 里的任何变量——
   全部是只读的。
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
  var wipTitle = document.querySelector('[data-wip-title]');

  var WIP_TITLE = { dominate: '主宰地球', space: '太空探索' };

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

    if (wipTitle) setText(wipTitle, WIP_TITLE[phase] || '');

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

  /* ------------------------------------------------------------ */
  function tick() {
    syncPhase();

    var now = performance.now();
    if (now - lastMirrorAt >= MIRROR_INTERVAL) {
      lastMirrorAt = now;
      syncMirrors();
    }
  }

  function boot() {
    var nodes = document.querySelectorAll('[data-mirror]');
    for (var i = 0; i < nodes.length; i++) {
      mirrors.push({ dst: nodes[i], keys: nodes[i].getAttribute('data-mirror').split('|') });
    }

    wireDeptNodes();
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
