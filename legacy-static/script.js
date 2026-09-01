/* ==========================================================
   Shop My Band — Admin Dashboard
   Icon library, theme toggle, sidebar, dropdowns, sales chart
   Depends on Chart.js (loaded before this file in index.html)
   ========================================================== */

  /* =========================================================
     ICON LIBRARY (feather-style, stroke-based line icons)
  ========================================================= */
  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    'map-pin': '<path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    'credit-card': '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
    'shopping-bag': '<path d="M6 8V6a6 6 0 1 1 12 0v2"/><rect x="3" y="8" width="18" height="13" rx="2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>',
    'refresh-cw': '<path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/>',
    'x-circle': '<circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>',
    layers: '<polygon points="12 3 20 8 12 13 4 8"/><polyline points="4 13 12 18 20 13"/>',
    package: '<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><polyline points="3.5 7.5 12 12.5 20.5 7.5"/><line x1="12" y1="12.5" x2="12" y2="21.5"/>',
    'plus-circle': '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
    tag: '<path d="M20.5 12.5l-8-8H4v8.5l8 8a1.5 1.5 0 0 0 2 0l6.5-6.5a1.5 1.5 0 0 0 0-2z"/><circle cx="8" cy="8" r="1.4"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><rect x="5" y="12" width="14" height="9" rx="1"/><line x1="12" y1="8" x2="12" y2="21"/><path d="M12 8c-1.2-3.4-5.4-3.4-5.4-1.1S8.7 8 12 8z"/><path d="M12 8c1.2-3.4 5.4-3.4 5.4-1.1S15.3 8 12 8z"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    truck: '<rect x="1" y="7" width="14" height="10" rx="1"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="1.8"/><circle cx="17.5" cy="19" r="1.8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    shield: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/>',
    'dollar-sign': '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5.5c0-2-2-3-5-3s-5 1.3-5 3 2 2.7 5 3.3 5 1.6 5 3.4-2 3.3-5 3.3-5-1-5-3"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    moon: '<path d="M21 12.5A9 9 0 1 1 11.5 3 7 7 0 0 0 21 12.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>',
    'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
    'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
    'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    'trending-down': '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    'edit-2': '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    'alert-triangle': '<path d="M12 3l10 18H2L12 3z"/><line x1="12" y1="9" x2="12" y2="14"/><line x1="12" y1="17.5" x2="12.01" y2="17.5"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  };

  function renderIcons() {
    document.querySelectorAll('[data-icon]').forEach((el) => {
      const name = el.getAttribute('data-icon');
      const inner = ICONS[name];
      if (!inner) return;
      el.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        inner +
        '</svg>';
    });
  }
  renderIcons();

  /* =========================================================
     THEME TOGGLE
  ========================================================= */
  function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    try { localStorage.setItem('smb-theme', isDark ? 'dark' : 'light'); } catch (e) {}
    updateChartTheme();
  }

  /* =========================================================
     SIDEBAR: mobile drawer + desktop collapse
  ========================================================= */
  function openSidebar() { document.body.classList.add('sidebar-open'); }
  function closeSidebar() { document.body.classList.remove('sidebar-open'); }

  function toggleCollapse() {
    const collapsed = document.body.classList.toggle('sidebar-collapsed');
    try { localStorage.setItem('smb-sidebar-collapsed', collapsed ? '1' : '0'); } catch (e) {}
    const chevron = document.getElementById('collapseIcon');
    chevron.setAttribute('data-icon', collapsed ? 'chevron-right' : 'chevron-left');
    renderIcons();
  }
  // Apply persisted collapsed state on load (desktop)
  (function () {
    try {
      if (localStorage.getItem('smb-sidebar-collapsed') === '1') {
        document.body.classList.add('sidebar-collapsed');
      }
    } catch (e) {}
  })();

  function toggleSubmenu(btn) {
    const targetId = btn.getAttribute('data-target');
    const target = document.getElementById(targetId);
    const isOpen = !target.classList.contains('hidden');
    target.classList.toggle('hidden');
    btn.classList.toggle('open', !isOpen);
  }

  /* =========================================================
     GENERIC DROPDOWNS (notifications, user menu, date range)
  ========================================================= */
  function toggleDropdown(id) {
    const panel = document.getElementById(id);
    const isHidden = panel.classList.contains('hidden');
    document.querySelectorAll('[id^="panel"]').forEach((p) => p.classList.add('hidden'));
    if (isHidden) panel.classList.remove('hidden');
  }
  document.addEventListener('click', (e) => {
    const isTrigger = e.target.closest('#btnNotif, #btnUser, #btnDateRange');
    const isPanel = e.target.closest('[id^="panel"]');
    if (!isTrigger && !isPanel) {
      document.querySelectorAll('[id^="panel"]').forEach((p) => p.classList.add('hidden'));
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('[id^="panel"]').forEach((p) => p.classList.add('hidden'));
      closeSidebar();
    }
  });

  function pickDateRange(label) {
    document.getElementById('dateRangeLabel').textContent = label;
    toggleDropdown('panelDateRange');
  }

  /* =========================================================
     NAV ACTIVE STATE (demo)
  ========================================================= */
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
      if (window.innerWidth < 1024) closeSidebar();
    });
  });

  /* =========================================================
     SALES OVERVIEW CHART
  ========================================================= */
  const SALES_DATA = {
    daily: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      sales: [42000, 38500, 51200, 47800, 62400, 71500, 58900],
      orders: [18, 15, 22, 20, 27, 31, 25],
    },
    weekly: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      sales: [286000, 312500, 298700, 344200],
      orders: [124, 138, 130, 152],
    },
    monthly: {
      labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      sales: [980000, 1120000, 1045000, 1260000, 1380000, 1842600],
      orders: [412, 468, 440, 512, 561, 620],
    },
  };

  let salesChart;
  function chartColors() {
    const dark = document.documentElement.classList.contains('dark');
    return {
      grid: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
      text: dark ? '#8a97b3' : '#64748b',
      tooltipBg: dark ? '#182142' : '#ffffff',
      tooltipText: dark ? '#e5e9f5' : '#1e293b',
      tooltipBorder: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    };
  }

  function buildChart(period) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    const d = SALES_DATA[period];
    const c = chartColors();
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(28,59,106,0.25)');
    gradient.addColorStop(1, 'rgba(28,59,106,0)');

    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, {
      data: {
        labels: d.labels,
        datasets: [
          {
            type: 'line',
            label: 'Sales (₹)',
            data: d.sales,
            borderColor: '#1c3b6a',
            backgroundColor: gradient,
            borderWidth: 2.5,
            pointRadius: 3,
            pointBackgroundColor: '#1c3b6a',
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            tension: 0.35,
            fill: true,
            yAxisID: 'y',
            order: 1,
          },
          {
            type: 'bar',
            label: 'Orders',
            data: d.orders,
            backgroundColor: 'rgba(209,157,34,0.55)',
            hoverBackgroundColor: '#d19d22',
            borderRadius: 6,
            barThickness: period === 'monthly' ? 22 : 16,
            yAxisID: 'y1',
            order: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.tooltipBg,
            titleColor: c.tooltipText,
            bodyColor: c.tooltipText,
            borderColor: c.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: function (item) {
                if (item.dataset.label.indexOf('Sales') > -1) {
                  return ' Sales: ₹' + item.raw.toLocaleString('en-IN');
                }
                return ' Orders: ' + item.raw;
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: c.text, font: { size: 11 } } },
          y: {
            position: 'left',
            grid: { color: c.grid },
            ticks: {
              color: c.text,
              font: { size: 11 },
              callback: function (v) { return '₹' + (v >= 1000 ? (v / 1000) + 'k' : v); },
            },
          },
          y1: {
            position: 'right',
            grid: { display: false },
            ticks: { color: c.text, font: { size: 11 } },
          },
        },
      },
    });
  }

  function setChartPeriod(period, btn) {
    document.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    buildChart(period);
  }

  function updateChartTheme() {
    const activeBtn = document.querySelector('.period-btn.active');
    const period = activeBtn ? activeBtn.getAttribute('data-period') : 'daily';
    buildChart(period);
  }

  buildChart('daily');