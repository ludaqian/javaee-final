/* =========================================================
 * 页面外壳渲染（游客端 / 核销端 手机壳 + 管理端后台框架）
 * 用法：在页面根元素上声明 data-* 属性，由本文件统一渲染
 * ========================================================= */
window.APP = (function () {
  'use strict';
  var C = window.CORE;
  var $ = C.$, $$ = C.$$;

  function basePath() {
    var p = (location.pathname || '').replace(/\\/g, '/');
    return /\/pages\/|\/admin\/|\/verify\//.test(p) ? '../' : '';
  }
  var BASE = basePath();
  var SUB = /\/admin\//.test(location.pathname.replace(/\\/g, '/')) ? '../' :
    /\/pages\/|\/verify\//.test(location.pathname.replace(/\\/g, '/')) ? '../' : '';

  /* ---------- 右侧按钮解析：icon:名称:链接 | text:文字:链接 | scan:名称 ---------- */
  function renderRight(str) {
    if (!str) return '';
    return str.split(';').map(function (seg) {
      var p = seg.split(':');
      var kind = p[0], a = p[1], b = p[2];
      if (kind === 'icon') {
        var inner = '<span class="ic-btn">' + C.icon(a) + '</span>';
        return b ? '<a href="' + (b.indexOf('http') === 0 ? b : BASE + b) + '">' + inner + '</a>' : '<button data-act="' + a + '">' + inner + '</button>';
      }
      if (kind === 'text') {
        return '<a class="s13 primary b" href="' + BASE + b + '">' + C.esc(a) + '</a>';
      }
      if (kind === 'link') {
        return '<a class="s13" href="' + (b.indexOf('http') === 0 ? b : BASE + b) + '">' + C.esc(a) + '</a>';
      }
      return '';
    }).join('');
  }

  /* ---------- 手机端外壳 ---------- */
  function renderShell() {
    var app = $('.app');
    if (!app) return;
    var bar = app.getAttribute('data-bar') || 'none';
    var title = app.getAttribute('data-title') || '';
    var isCustomHead = app.getAttribute('data-head') === '0';

    /* 顶部栏 */
    if (!isCustomHead) {
      var back = app.getAttribute('data-back');
      var tb = document.createElement('header');
      tb.className = 'topbar' + (app.getAttribute('data-plain') === '1' ? ' plain' : '');
      var left = '';
      if (back) {
        left = '<a class="tb-side" href="' + (back.indexOf('.html') > 0 ? BASE + back : 'javascript:history.back()') + '"' +
          (back.indexOf('.html') > 0 ? '' : ' onclick="history.back();return false"') + '>' +
          '<span class="ic-btn">' + C.icon('back') + '</span></a>';
      } else {
        left = '<span class="tb-side"></span>';
      }
      tb.innerHTML = left +
        '<div class="tb-center"><div class="tb-title ell">' + C.esc(title) + '</div></div>' +
        '<div class="tb-side r">' + renderRight(app.getAttribute('data-right')) + '</div>';
      app.insertBefore(tb, app.firstChild);
    }

    /* 底部导航 */
    if (bar !== 'none') {
      app.classList.add('has-tab');
      var cur = app.getAttribute('data-tab') || '';
      var items = [];
      if (bar === 'portal') {
        items = [
          { k: 'home', t: '首页', ic: 'home', href: 'index.html' },
          { k: 'map', t: '导览', ic: 'map', href: 'pages/map.html' },
          { k: 'book', t: '预约', ic: 'calendar', href: 'pages/booking.html', mid: 1 },
          { k: 'order', t: '订单', ic: 'order', href: 'pages/orders.html' },
          { k: 'mine', t: '我的', ic: 'user', href: 'pages/profile.html' }
        ];
      } else {
        items = [
          { k: 'manual', t: '手动核销', ic: 'edit', href: 'verify/manual.html' },
          { k: 'scan', t: '扫码核销', ic: 'scan', href: 'verify/scan.html', mid: 1 },
          { k: 'records', t: '核销记录', ic: 'list', href: 'verify/records.html' }
        ];
      }
      var nav = document.createElement('nav');
      nav.className = 'tabbar';
      nav.innerHTML = items.map(function (it) {
        return '<a href="' + BASE + it.href + '" class="' + (cur === it.k ? 'on' : '') + (it.mid ? ' mid' : '') + '">' +
          (it.mid ? '<span class="fab">' + C.icon(it.ic) + '</span>' : C.icon(it.ic)) +
          '<span>' + it.t + '</span></a>';
      }).join('');
      app.appendChild(nav);
    }

    /* 登录校验 */
    var need = app.getAttribute('data-login');
    if (need === 'visitor' && !C.Auth.visitor.isLogin()) {
      location.replace(BASE + 'pages/login.html?from=' + encodeURIComponent(location.pathname.split('/').pop()));
    }
    if (need === 'checker' && !C.Auth.checker.isLogin()) {
      location.replace(BASE + 'verify/login.html');
    }
  }

  /* ---------- 管理端外壳 ---------- */
  var ADMIN_NAV = [
    { g: '数据概览' },
    { k: 'dashboard', t: '仪表盘', ic: 'chart', href: 'admin/dashboard.html' },
    { g: '票务管理' },
    { k: 'tickets', t: '票种管理', ic: 'ticket', href: 'admin/tickets.html' },
    { k: 'inventory', t: '日期库存', ic: 'calendar', href: 'admin/inventory.html' },
    { g: '运营管理' },
    { k: 'orders', t: '订单管理', ic: 'order', href: 'admin/orders.html', badge: 'pending' },
    { k: 'reservations', t: '预约记录', ic: 'users', href: 'admin/reservations.html' },
    { g: '内容与资源' },
    { k: 'spots', t: '景点与导览', ic: 'mountain', href: 'admin/spots.html' },
    { k: 'notices', t: '公告管理', ic: 'notice', href: 'admin/notices.html' },
    { g: '系统' },
    { k: 'users', t: '用户与权限', ic: 'shield', href: 'admin/users.html' },
    { k: 'settings', t: '系统设置', ic: 'settings', href: 'admin/settings.html' }
  ];

  function renderAdmin() {
    var shell = $('.admin-shell');
    if (!shell) return;
    document.body.classList.add('admin');
    var navKey = shell.getAttribute('data-nav') || '';
    var me = C.Auth.admin.get();
    if (navKey && !me) { location.replace(BASE + 'admin/login.html'); return; }

    var pending = C.Orders.list({ status: 'pending' }).length;

    var side = document.createElement('aside');
    side.className = 'sidebar';
    side.id = 'sidebar';
    side.innerHTML =
      '<div class="brand"><div class="bi">' + C.icon('mountain') + '</div>' +
      '<div><b>云栖山景区</b><span>智慧票务管理后台</span></div></div>' +
      '<div class="nav">' + ADMIN_NAV.map(function (n) {
        if (n.g) return '<div class="grp">' + n.g + '</div>';
        var badge = '';
        if (n.badge === 'pending' && pending > 0) badge = '<span class="badge">' + pending + '</span>';
        return '<a href="' + BASE + n.href + '" class="' + (navKey === n.k ? 'on' : '') + '">' + C.icon(n.ic) + '<span>' + n.t + '</span>' + badge + '</a>';
      }).join('') + '</div>' +
      '<div class="side-foot"><button id="btnReset" class="s12" style="color:#7fa79f">重置演示数据</button></div>';
    shell.insertBefore(side, shell.firstChild);

    var main = $('.admin-main', shell);
    if (main) {
      var crumb = main.getAttribute('data-crumb') || '';
      var top = document.createElement('header');
      top.className = 'admin-top';
      top.innerHTML =
        '<button class="ic-btn hide" id="sideToggle" style="width:34px;height:34px;display:grid;place-items:center">' + C.icon('grid') + '</button>' +
        '<div class="crumb f1">' + C.esc(crumb) + '</div>' +
        '<a class="adminer" href="' + BASE + 'admin/settings.html" title="系统设置">' + C.icon('settings', '', 1.6) + '</a>' +
        '<div class="adminer"><div class="av">' + C.esc((me && me.name || '管')[0]) + '</div><span>' + C.esc(me ? me.name : '未登录') + '</span>' +
        '<button id="btnLogout" class="ic-btn" title="退出登录" style="width:30px;height:30px;display:grid;place-items:center">' + C.icon('logout') + '</button></div>';
      main.insertBefore(top, main.firstChild);
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest('#btnLogout')) {
        C.confirmBox('确定要退出后台登录吗？', function () {
          C.Auth.admin.clear(); location.replace(BASE + 'admin/login.html');
        });
      }
      if (e.target.closest('#btnReset')) {
        C.confirmBox('将恢复系统内置演示数据（票种 / 订单 / 景点 / 公告），确定重置？', function () {
          C.DB.reset(); C.toast('演示数据已重置', 'ok'); setTimeout(function () { location.reload(); }, 600);
        }, { danger: true, okText: '重置' });
      }
      if (e.target.closest('#sideToggle')) {
        $('#sidebar').classList.toggle('show');
      }
    });

    if (window.innerWidth <= 720 && $('#sideToggle')) $('#sideToggle').classList.remove('hide');
  }

  function init() {
    renderShell();
    renderAdmin();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { BASE: BASE, base: BASE, init: init };
})();
