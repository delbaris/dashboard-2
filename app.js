/* =====================================================================
   PMO Command Center — Application
   Vanilla JS · Modular · API-ready
   ===================================================================== */
(function () {
  'use strict';

  /* =============================================================
     1. CONSTANTS & UTILITIES
     ============================================================= */
  const KEY = 'pmo_demo_v1';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const fmtNum  = (n) => new Intl.NumberFormat('fa-IR').format(Math.round(Number(n) || 0));
  const fmtMoney = (n) => '$' + fmtNum(n);
  const fmtPct = (n) => fmtNum(n) + '٪';
  const uid = (p) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const daysDiff = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000);
  const initials = (first, last) => ((first || '?')[0] + (last || '')[0] || '').toUpperCase();

  /* ---------- Jalali Date ---------- */
  const JMONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  function g2j(gy, gm, gd) {
    const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    const gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365*gy) + Math.floor((gy2+3)/4) - Math.floor((gy2+99)/100) + Math.floor((gy2+399)/400) - 80 + gd + g_d_m[gm-1];
    jy += 33 * Math.floor(days/12053);
    days %= 12053;
    jy += 4 * Math.floor(days/1461);
    days %= 1461;
    if (days > 365) { jy += Math.floor((days-1)/365); days = (days-1)%365; }
    const jm = (days < 186) ? 1 + Math.floor(days/31) : 7 + Math.floor((days-186)/30);
    const jd = 1 + ((days < 186) ? (days%31) : ((days-186)%30));
    return [jy, jm, jd];
  }
  function jalali(iso, withTime) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    const [jy, jm, jd] = g2j(d.getFullYear(), d.getMonth()+1, d.getDate());
    let s = `${jd} ${JMONTHS[jm-1]} ${jy}`;
    if (withTime) {
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      s += ` - ${hh}:${mm}`;
    }
    return s;
  }

  /* =============================================================
     2. STORE  (state + localStorage persistence)
     ============================================================= */
  const Store = {
    state: null,
    defaults() {
      const d = clone(window.DEMO_DATA);
      return {
        ...d,
        session: null,
        ui: { theme: 'light', density: 'comfortable', sidebarCollapsed: false },
        settings: {
          companyName: 'شرکت هوش مصنوعی پارس',
          currency: 'USD', timeZone: 'Asia/Tehran', dateFormat: 'jalali',
          density: 'comfortable',
          alertThresholds: { timeOverrunPct: 10, budgetOverrunPct: 10, overallocationPct: 100, noProgressDays: 14 }
        },
        kpiCards: defaultKpiCards(),
        alertState: {},
        notifications: [],
        auditLog: clone(window.DEMO_DATA.auditLog)
      };
    },
    init() {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        try { this.state = JSON.parse(raw); } catch (_) { this.state = null; }
      }
      if (!this.state || !this.state.employees) { this.state = this.defaults(); this.save(); }
      // ensure new fields for forward-compat
      if (!this.state.kpiCards) this.state.kpiCards = defaultKpiCards();
      if (!this.state.settings.alertThresholds) this.state.settings.alertThresholds = { timeOverrunPct: 10, budgetOverrunPct: 10, overallocationPct: 100, noProgressDays: 14 };
      if (!this.state.alertState) this.state.alertState = {};
      if (!this.state.notifications) this.state.notifications = [];
      return this.state;
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (_) {} },
    reset() { localStorage.removeItem(KEY); this.state = this.defaults(); this.save(); }
  };

  function defaultKpiCards() {
    return [
      { id:'k1', title:'کارکنان فعال',      metric:'activeEmployees',   visible:true, order:1, chartType:'sparkline', chartVisible:true,  icon:'users',      format:'number', comparePeriod:'prev', drilldown:'#/employees', color:'primary' },
      { id:'k2', title:'پروژه‌های فعال',    metric:'activeProjects',    visible:true, order:2, chartType:'sparkline', chartVisible:true,  icon:'folder',     format:'number', comparePeriod:'prev', drilldown:'#/projects',  color:'info' },
      { id:'k3', title:'آماده تخصیص',       metric:'availableEmployees',visible:true, order:3, chartType:'sparkline', chartVisible:true,  icon:'userCheck',  format:'number', comparePeriod:'prev', drilldown:'#/capacity',  color:'success' },
      { id:'k4', title:'ظرفیت مصرف‌شده',    metric:'utilization',       visible:true, order:4, chartType:'progress',  chartVisible:true,  icon:'gauge',      format:'percent',comparePeriod:'prev', drilldown:'#/capacity',  color:'warning' },
      { id:'k5', title:'ساعات تأییدشده',    metric:'actualHours',       visible:true, order:5, chartType:'sparkline', chartVisible:true,  icon:'clock',      format:'hours',  comparePeriod:'prev', drilldown:'#/timesheets',color:'primary' },
      { id:'k6', title:'ارزش پرتفوی',       metric:'portfolioBudget',   visible:true, order:6, chartType:'bar',       chartVisible:true,  icon:'dollar',     format:'money',  comparePeriod:'prev', drilldown:'#/budget',    color:'success' }
    ];
  }

  /* =============================================================
     3. METRICS  (derived from data — not hard-coded)
     ============================================================= */
  const Metrics = {
    totalAllocation(employeeId) {
      const s = Store.state;
      return s.assignments
        .filter(a => a.employeeId === employeeId && a.status === 'Active')
        .reduce((sum, a) => sum + (a.allocation || 0), 0);
    },
    projectActualHours(projectId) {
      return Store.state.timeEntries
        .filter(t => t.projectId === projectId && t.status === 'Approved')
        .reduce((s, t) => s + t.hours, 0);
    },
    projectActualCost(projectId) {
      const s = Store.state;
      const costByEmp = {};
      s.employees.forEach(e => { costByEmp[e.id] = e.hourlyCost || 0; });
      return s.timeEntries
        .filter(t => t.projectId === projectId && t.status === 'Approved')
        .reduce((sum, t) => sum + (t.hours * (costByEmp[t.employeeId] || 0)), 0);
    },
    projectLaborCost(projectId) { return this.projectActualCost(projectId); },
    utilizationFor(employeeId) {
      const emp = Store.state.employees.find(e => e.id === employeeId);
      if (!emp || !emp.weeklyCapacity) return 0;
      const alloc = this.totalAllocation(employeeId);
      return Math.round((alloc / 100) * 100);
    },
    avgUtilization() {
      const active = Store.state.employees.filter(e => e.status === 'Active');
      if (!active.length) return 0;
      const sum = active.reduce((s, e) => s + this.totalAllocation(e.id), 0);
      return Math.round(sum / active.length);
    },
    compute(metric) {
      const s = Store.state;
      switch (metric) {
        case 'activeEmployees':    return s.employees.filter(e => ['Active','Onboarding'].includes(e.status)).length;
        case 'totalEmployees':     return s.employees.length;
        case 'activeProjects':     return s.projects.filter(p => ['On Track','At Risk','Delayed','Planning'].includes(p.status)).length;
        case 'atRiskProjects':     return s.projects.filter(p => ['At Risk','Delayed'].includes(p.status)).length;
        case 'availableEmployees': return s.employees.filter(e => e.status === 'Active' && this.totalAllocation(e.id) < 80).length;
        case 'utilization':        return this.avgUtilization();
        case 'actualHours':        return Math.round(s.timeEntries.filter(t => t.status === 'Approved').reduce((a, b) => a + b.hours, 0));
        case 'portfolioBudget':    return s.projects.reduce((a, p) => a + (p.financialBudget || 0), 0);
        case 'actualCost':         return Math.round(s.projects.reduce((a, p) => a + this.projectActualCost(p.id), 0));
        case 'pendingTimesheets':  return s.timeEntries.filter(t => t.status === 'Submitted').length;
        case 'overallocated':      return s.employees.filter(e => e.status === 'Active' && this.totalAllocation(e.id) > 100).length;
        case 'openAlerts':         return Alerts.derive().filter(a => !isAlertDismissed(a.id)).length;
        case 'candidates':         return s.candidates.filter(c => !['Rejected','Hired'].includes(c.status)).length;
        case 'avgProgress':        return s.projects.length ? Math.round(s.projects.reduce((a, p) => a + p.progress, 0) / s.projects.length) : 0;
        default: return 0;
      }
    },
    formatValue(value, format) {
      if (format === 'money')   return fmtMoney(value);
      if (format === 'percent') return fmtPct(value);
      if (format === 'hours')   return fmtNum(value) + ' ساعت';
      return fmtNum(value);
    }
  };

  /* =============================================================
     4. ALERTS  (rule-based, derived from data)
     ============================================================= */
  const Alerts = {
    derive() {
      const s = Store.state;
      const th = s.settings.alertThresholds || {};
      const out = [];

      s.projects.forEach(p => {
        if (p.status === 'Completed') return;
        const tb = p.timeBudget || 1;
        const actualH = Metrics.projectActualHours(p.id);
        const timeUsedPct = tb ? (actualH / tb) * 100 : 0;

        if (timeUsedPct - p.progress > (th.timeOverrunPct || 10)) {
          out.push({
            id: 'time-' + p.id, severity: 'high', rule: 'انحراف زمان/پیشرفت',
            title: 'انحراف زمان در ' + p.name, projectId: p.id,
            message: `مصرف زمان ${Math.round(timeUsedPct)}٪ در مقابل پیشرفت ${p.progress}٪`,
            reason: ['مصرف زمان از پیشرفت جلو زده', `اختلاف ${Math.round(timeUsedPct - p.progress)} واحد`]
          });
        }
        if (p.endDate && new Date(p.endDate) < new Date()) {
          out.push({
            id: 'deadline-' + p.id, severity: 'high', rule: 'عبور از مهلت',
            title: 'عبور از مهلت پروژه ' + p.name, projectId: p.id,
            message: `تاریخ پایان ${jalali(p.endDate)} گذشته است`,
            reason: ['تاریخ پایان گذشته', 'پروژه همچنان باز است']
          });
        }
        const cost = Metrics.projectActualCost(p.id);
        const budget = p.financialBudget || 1;
        const budgetPct = (cost / budget) * 100;
        if (budgetPct - p.progress > (th.budgetOverrunPct || 10)) {
          out.push({
            id: 'budget-' + p.id, severity: 'medium', rule: 'ریسک بودجه',
            title: 'ریسک بودجه در ' + p.name, projectId: p.id,
            message: `مصرف بودجه ${Math.round(budgetPct)}٪ در مقابل پیشرفت ${p.progress}٪`,
            reason: ['هزینه واقعی سریع‌تر از پیشرفت رشد کرده']
          });
        }
        const pTasks = s.tasks.filter(t => t.projectId === p.id);
        if (pTasks.length && !pTasks.some(t => ['In Progress','Review','Testing'].includes(t.status))) {
          out.push({
            id: 'noactive-' + p.id, severity: 'medium', rule: 'پروژه بدون تسک فعال',
            title: 'پروژه بدون تسک فعال: ' + p.name, projectId: p.id,
            message: 'در حال حاضر هیچ تسکی در جریان نیست',
            reason: ['هیچ تسکی در وضعیت فعال نیست']
          });
        }
      });

      s.employees.forEach(e => {
        if (e.status !== 'Active') return;
        const a = Metrics.totalAllocation(e.id);
        if (a > (th.overallocationPct || 100)) {
          out.push({
            id: 'over-' + e.id, severity: 'high', rule: 'تخصیص بیش از حد',
            title: 'تخصیص بیش از حد: ' + e.firstName + ' ' + e.lastName,
            employeeId: e.id,
            message: `مجموع تخصیص ${a}٪`,
            reason: [`مجموع تخصیص ${a}٪ از ۱۰۰٪ عبور کرده`]
          });
        }
      });

      return out;
    }
  };
  function isAlertDismissed(id) { return !!(Store.state.alertState[id] && Store.state.alertState[id].dismissed); }
  function isAlertRead(id)      { return !!(Store.state.alertState[id] && Store.state.alertState[id].read); }

  /* =============================================================
     5. AUDIT LOG HELPER
     ============================================================= */
  function pushAudit(action, entity, entityId, before, after, reason) {
    const s = Store.state;
    const user = s.session || { name: 'سیستم', role: 'System' };
    s.auditLog.unshift({
      id: 'L-' + Date.now().toString(36),
      actor: user.name, role: user.role,
      timestamp: new Date().toISOString(),
      action, entity, entityId,
      source: 'UI', reason: reason || '', before: before ?? '—', after: after ?? '—'
    });
    if (s.auditLog.length > 300) s.auditLog.length = 300;
    Store.save();
  }

  /* =============================================================
     6. ICONS  (inline SVG — no external deps)
     ============================================================= */
  const ICONS = {
    grid:      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    users:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    userCheck: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
    userPlus:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
    folder:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    calendar:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    award:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>',
    gauge:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M13.4 10.6 19 5"/><path d="M20.5 15a9 9 0 1 0-17 0"/></svg>',
    clock:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>',
    dollar:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    bell:      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    search:    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    sun:       '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    moon:      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    refresh:   '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    menu:      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    x:         '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    chevron:   '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    alert:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    chart:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    settings:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    shield:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    fileText:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    sparkles:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>',
    layers:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    check:     '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    trash:     '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    edit:      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    eye:       '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff:    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    logout:    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    download:  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    plus:      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    sliders:   '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
    arrowUp:   '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
    arrowDown: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
    database:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    package:   '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'
  };
  const icon = (name, size) => {
    const svg = ICONS[name] || ICONS.grid;
    if (!size) return svg;
    return svg.replace(/width="\d+"/, `width="${size}"`).replace(/height="\d+"/, `height="${size}"`);
  };

  /* =============================================================
     7. CHART HELPERS  (pure SVG)
     ============================================================= */
  const Charts = {
    sparkline(values, color) {
      if (!values || values.length < 2) values = [0, 0];
      const w = 120, h = 38, pad = 4;
      const max = Math.max(...values), min = Math.min(...values);
      const range = (max - min) || 1;
      const step = (w - pad * 2) / (values.length - 1);
      const pts = values.map((v, i) => [pad + i * step, h - pad - ((v - min) / range) * (h - pad * 2)]);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      const area = d + ` L ${w - pad} ${h} L ${pad} ${h} Z`;
      const c = color || 'var(--primary)';
      return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <path d="${area}" fill="${c}" opacity=".10"/>
        <path d="${d}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>`;
    },
    bars(values, color) {
      const max = Math.max(...values, 1);
      return `<div style="display:flex;align-items:flex-end;gap:3px;height:100%">` +
        values.map(v => `<div style="flex:1;background:${color || 'var(--primary)'};opacity:.75;border-radius:3px;height:${Math.max(8, (v / max) * 100)}%"></div>`).join('') +
        `</div>`;
    },
    donut(segments, size) {
      size = size || 150;
      const th = 20, r = (size - th) / 2, c = 2 * Math.PI * r;
      const total = segments.reduce((a, b) => a + b.value, 0) || 1;
      let offset = 0;
      const circles = segments.map(s => {
        const len = (s.value / total) * c;
        const seg = `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${th}" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size/2} ${size/2})" stroke-linecap="butt"/>`;
        offset += len;
        return seg;
      }).join('');
      return `<svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px;flex-shrink:0">${circles}</svg>`;
    },
    hbar(rows) {
      const max = Math.max(...rows.map(r => r.value), 1);
      return `<div style="display:flex;flex-direction:column;gap:10px">` +
        rows.map(r => `<div>
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px"><span style="color:var(--text-2)">${esc(r.label)}</span><b>${esc(r.display ?? r.value)}</b></div>
          <div class="progress"><i style="width:${(r.value / max) * 100}%;background:${r.color || 'var(--primary)'}"></i></div>
        </div>`).join('') + `</div>`;
    }
  };

  /* =============================================================
     8. UI HELPERS
     ============================================================= */
  const UI = {
    avatar(employee, size) {
      if (!employee) return `<div class="avatar ${size || ''}" style="background:#64748b">?</div>`;
      const c = employee.color || stringColor(employee.id);
      return `<div class="avatar ${size || ''}" style="background:${c}">${esc(initials(employee.firstName, employee.lastName))}</div>`;
    },
    statusBadge(status) {
      const map = {
        'Active': 'success', 'Onboarding': 'info', 'Offboarding': 'warning', 'Inactive': 'danger',
        'On Track': 'success', 'At Risk': 'warning', 'Delayed': 'danger', 'Planning': 'info', 'Completed': 'primary',
        'Todo': 'outline', 'In Progress': 'info', 'Blocked': 'danger', 'Review': 'warning', 'Testing': 'primary', 'Done': 'success',
        'Screening': 'outline', 'Interview': 'info', 'Evaluation': 'warning', 'Decision': 'primary', 'Accepted': 'success', 'Rejected': 'danger', 'Hired': 'success',
        'Draft': 'outline', 'Submitted': 'info', 'Approved': 'success'
      };
      const cls = map[status] || 'outline';
      return `<span class="badge ${cls}"><span class="bdot"></span>${esc(status)}</span>`;
    },
    priorityBadge(p) {
      const map = { 'Low': 'outline', 'Medium': 'info', 'High': 'warning', 'Critical': 'danger' };
      return `<span class="badge ${map[p] || 'outline'}">${esc(p)}</span>`;
    },
    healthBadge(h) {
      const map = { 'Healthy': 'success', 'Warning': 'warning', 'Critical': 'danger' };
      return `<span class="badge ${map[h] || 'outline'}">${esc(h)}</span>`;
    },
    progressBar(value, cls) {
      const v = Math.max(0, Math.min(100, value || 0));
      return `<div class="progress ${cls || ''}"><i style="width:${v}%"></i></div>`;
    },
    toast(message, type) {
      const root = $('#toast-root');
      const el = document.createElement('div');
      el.className = 'toast ' + (type || '');
      const ic = type === 'danger' ? 'alert' : type === 'success' ? 'check' : type === 'warning' ? 'alert' : 'sparkles';
      el.innerHTML = `<div style="color:var(--${type || 'primary'});margin-top:2px">${icon(ic)}</div><div>${esc(message)}</div>`;
      root.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.transition = 'all .25s'; setTimeout(() => el.remove(), 260); }, 3200);
    }
  };

  function stringColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const palette = ['#4f46e5','#12b76a','#f79009','#e5484d','#2e90fa','#9333ea','#0891b2','#db2777','#65a30d','#ea580c'];
    return palette[Math.abs(hash) % palette.length];
  }

  /* =============================================================
     9. MODAL & DRAWER
     ============================================================= */
  const Modal = {
    open({ title, body, footer, wide, onMount }) {
      const root = $('#modal-root');
      const backdrop = document.createElement('div');
      backdrop.className = 'backdrop';
      const modal = document.createElement('div');
      modal.className = 'modal' + (wide ? ' wide' : '');
      modal.innerHTML = `
        <div class="modal-head">
          <h3>${esc(title)}</h3>
          <button class="icon-btn" data-close>${icon('x')}</button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      `;
      root.appendChild(backdrop);
      root.appendChild(modal);
      requestAnimationFrame(() => { backdrop.classList.add('show'); modal.classList.add('show'); });
      const close = () => {
        backdrop.classList.remove('show'); modal.classList.remove('show');
        setTimeout(() => { backdrop.remove(); modal.remove(); }, 220);
      };
      modal.querySelector('[data-close]').addEventListener('click', close);
      backdrop.addEventListener('click', close);
      if (onMount) onMount(modal, close);
      return { close, el: modal };
    },
    confirm({ title, message, confirmText, danger }) {
      return new Promise(resolve => {
        const m = this.open({
          title: title || 'تأیید',
          body: `<div style="font-size:13.5px;color:var(--text-2)">${esc(message)}</div>`,
          footer: `<button class="btn" data-cancel>انصراف</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmText || 'تأیید')}</button>`
        });
        m.el.querySelector('[data-cancel]').addEventListener('click', () => { m.close(); resolve(false); });
        m.el.querySelector('[data-ok]').addEventListener('click', () => { m.close(); resolve(true); });
      });
    }
  };

  const Drawer = {
    open({ title, subtitle, body, footer, onMount, width }) {
      const root = $('#drawer-root');
      const backdrop = document.createElement('div');
      backdrop.className = 'backdrop';
      const drawer = document.createElement('div');
      drawer.className = 'drawer';
      if (width) drawer.style.width = width;
      drawer.innerHTML = `
        <div class="drawer-head">
          <div>
            <h3 style="margin:0;font-size:16px">${esc(title)}</h3>
            ${subtitle ? `<p style="margin:4px 0 0;color:var(--text-3);font-size:12.5px">${subtitle}</p>` : ''}
          </div>
          <button class="icon-btn" data-close>${icon('x')}</button>
        </div>
        <div class="drawer-body">${body}</div>
        ${footer ? `<div class="drawer-foot">${footer}</div>` : ''}
      `;
      root.appendChild(backdrop);
      root.appendChild(drawer);
      requestAnimationFrame(() => { backdrop.classList.add('show'); drawer.classList.add('show'); });
      const close = () => {
        backdrop.classList.remove('show'); drawer.classList.remove('show');
        setTimeout(() => { backdrop.remove(); drawer.remove(); }, 260);
      };
      drawer.querySelector('[data-close]').addEventListener('click', close);
      backdrop.addEventListener('click', close);
      if (onMount) onMount(drawer, close);
      return { close, el: drawer };
    }
  };

  /* =============================================================
     10. THEME
     ============================================================= */
  function applyTheme() {
    const theme = Store.state.ui.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    const density = Store.state.ui.density || 'comfortable';
    document.documentElement.setAttribute('data-density', density);
  }
  function toggleTheme() {
    Store.state.ui.theme = Store.state.ui.theme === 'light' ? 'dark' : 'light';
    Store.save(); applyTheme(); renderHeader();
    UI.toast('تم ' + (Store.state.ui.theme === 'light' ? 'روشن' : 'تیره') + ' شد', 'success');
  }

  /* =============================================================
     11. LOGIN
     ============================================================= */
  function renderLogin() {
    const root = $('#login-screen');
    root.innerHTML = `
      <div class="login-art">
        <div class="login-brand">
          <div class="logo-mark">${icon('layers')}</div>
          <span>${esc(Store.state.settings.companyName)}</span>
        </div>
        <div>
          <h1>سامانه مدیریت و ردیابی<br>کارکنان، منابع و پروژه‌ها</h1>
          <p class="lead">مرکز فرماندهی سازمان — یک منبع واحد حقیقت برای People، Resources و Projects.</p>
          <div class="login-features">
            <div class="feat"><div class="dot">${icon('users')}</div><span>ردیابی کامل کارکنان و ظرفیت منابع</span></div>
            <div class="feat"><div class="dot">${icon('folder')}</div><span>مدیریت پروژه‌ها، WBS و تسک‌ها</span></div>
            <div class="feat"><div class="dot">${icon('alert')}</div><span>هشدارهای هوشمند و مبتنی بر قاعده</span></div>
            <div class="feat"><div class="dot">${icon('sparkles')}</div><span>دستیار هوشمند برای تحلیل وضعیت</span></div>
          </div>
        </div>
        <div class="foot">© ${new Date().getFullYear()} — Demo Build v1.0</div>
      </div>

      <div class="login-panel">
        <div class="login-card">
          <h2>ورود به سامانه</h2>
          <p class="sub">برای ادامه، اطلاعات کاربری خود را وارد کنید.</p>

          <div id="login-msg"></div>

          <form id="login-form" autocomplete="off">
            <label class="field">
              <span>نام کاربری</span>
              <div class="input-wrap">
                <span class="in-icon">${icon('users', 16)}</span>
                <input class="input" name="username" id="in-user" placeholder="مثلاً ceo" required>
              </div>
            </label>

            <label class="field">
              <span>رمز عبور</span>
              <div class="input-wrap">
                <span class="in-icon">${icon('shield', 16)}</span>
                <input class="input" type="password" name="password" id="in-pass" placeholder="••••••" required>
                <button type="button" class="toggle-pass" id="toggle-pass">${icon('eye')}</button>
              </div>
            </label>

            <div class="row-between mb-16">
              <label class="checkbox"><input type="checkbox" id="remember" checked> مرا به خاطر بسپار</label>
              <span style="font-size:12px;color:var(--text-3)">نسخه نمایشی</span>
            </div>

            <button class="btn btn-primary btn-block" type="submit" id="login-btn">
              <span id="login-btn-label">ورود به سامانه</span>
            </button>
          </form>

          <div class="demo-accounts">
            <h4>ورود آزمایشی سریع</h4>
            <div class="demo-chips">
              <button class="demo-chip" data-user="ceo">مدیرعامل</button>
              <button class="demo-chip" data-user="manager">مدیر پروژه</button>
              <button class="demo-chip" data-user="hr">منابع انسانی</button>
              <button class="demo-chip" data-user="user">کارمند</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const msg = $('#login-msg');
    const toggle = $('#toggle-pass');
    const pass = $('#in-pass');

    toggle.addEventListener('click', () => {
      if (pass.type === 'password') { pass.type = 'text'; toggle.innerHTML = icon('eyeOff'); }
      else { pass.type = 'password'; toggle.innerHTML = icon('eye'); }
    });

    $$('.demo-chip').forEach(chip => chip.addEventListener('click', () => {
      $('#in-user').value = chip.dataset.user;
      $('#in-pass').value = '123456';
    }));

    $('#login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const u = $('#in-user').value.trim();
      const p = $('#in-pass').value;
      const btn = $('#login-btn');
      const label = $('#login-btn-label');
      msg.innerHTML = '';
      btn.disabled = true;
      label.innerHTML = '<span class="spinner"></span> در حال بررسی...';

      setTimeout(() => {
        const user = Store.state.users.find(x => x.username === u && x.password === p);
        if (!user) {
          btn.disabled = false;
          label.textContent = 'ورود به سامانه';
          msg.innerHTML = `<div class="login-error">${icon('alert', 16)} نام کاربری یا رمز عبور نادرست است.</div>`;
          return;
        }
        msg.innerHTML = `<div class="login-success">${icon('check', 16)} خوش آمدید، ${esc(user.name)}</div>`;
        setTimeout(() => {
          Store.state.session = user;
          Store.save();
          startApp();
        }, 350);
      }, 550);
    });
  }

  /* =============================================================
     12. SIDEBAR
     ============================================================= */
  const MENU = [
    { section: 'داشبورد', items: [
      { id: 'dashboard', label: 'نمای مدیریتی', icon: 'grid', hash: '#/dashboard', roles: ['CEO','Admin','HR','Project Manager','Finance','Employee'] }
    ]},
    { section: 'سرمایه انسانی', items: [
      { id: 'employees',  label: 'کارکنان',        icon: 'users',    hash: '#/employees',  roles: ['CEO','Admin','HR','Project Manager','Finance'] },
      { id: 'recruitment',label: 'جذب و استخدام',  icon: 'userPlus', hash: '#/recruitment',roles: ['CEO','Admin','HR'] },
      { id: 'interviews', label: 'مصاحبه‌ها',      icon: 'calendar', hash: '#/interviews', roles: ['CEO','Admin','HR','Project Manager'] },
      { id: 'skills',     label: 'مهارت‌ها',       icon: 'award',    hash: '#/skills',     roles: ['CEO','Admin','HR','Project Manager'] },
      { id: 'capacity',   label: 'ظرفیت منابع',    icon: 'gauge',    hash: '#/capacity',   roles: ['CEO','Admin','HR','Project Manager'] }
    ]},
    { section: 'پروژه‌ها', items: [
      { id: 'projects',   label: 'همه پروژه‌ها',   icon: 'folder',   hash: '#/projects',   roles: ['CEO','Admin','HR','Project Manager','Finance'] },
      { id: 'tasks',      label: 'تسک‌ها / WBS',    icon: 'layers',   hash: '#/tasks',      roles: ['CEO','Admin','Project Manager'] },
      { id: 'timesheets', label: 'زمان و Timesheet',icon: 'clock',    hash: '#/timesheets', roles: ['CEO','Admin','HR','Project Manager','Finance'] },
      { id: 'budget',     label: 'بودجه و هزینه',  icon: 'dollar',   hash: '#/budget',     roles: ['CEO','Admin','Finance','Project Manager'] }
    ]},
    { section: 'مدیریت', items: [
      { id: 'reports',    label: 'گزارش‌ها',       icon: 'chart',    hash: '#/reports',    roles: ['CEO','Admin','HR','Finance','Project Manager'] },
      { id: 'alerts',     label: 'هشدارها',        icon: 'alert',    hash: '#/alerts',     roles: ['CEO','Admin','HR','Project Manager','Finance'] }
    ]},
    { section: 'هوشمند', items: [
      { id: 'assistant',  label: 'دستیار هوشمند',  icon: 'sparkles', hash: '#/assistant',  roles: ['CEO','Admin','HR','Project Manager','Finance','Employee'] }
    ]},
    { section: 'سیستم', items: [
      { id: 'settings',   label: 'تنظیمات',        icon: 'settings', hash: '#/settings',   roles: ['CEO','Admin'] },
      { id: 'users',      label: 'کاربران و نقش‌ها',icon: 'shield',   hash: '#/users',      roles: ['CEO','Admin'] },
      { id: 'audit',      label: 'Audit Log',      icon: 'fileText', hash: '#/audit',      roles: ['CEO','Admin'] }
    ]}
  ];

  function renderSidebar() {
    const session = Store.state.session;
    const currentHash = location.hash || '#/dashboard';
    const alerts = Alerts.derive().filter(a => !isAlertDismissed(a.id));

    let html = `
      <div class="sidebar-head">
        <div class="logo-mark">${icon('layers')}</div>
        <div class="brand-text">
          <b>${esc(Store.state.settings.companyName)}</b>
          <small>Command Center</small>
        </div>
      </div>
      <nav class="sidebar-nav">
    `;

    MENU.forEach(sec => {
      const items = sec.items.filter(it => it.roles.includes(session.role));
      if (!items.length) return;
      html += `<div class="nav-section"><div class="nav-section-title">${esc(sec.section)}</div>`;
      items.forEach(it => {
        const active = currentHash === it.hash || (it.hash !== '#/dashboard' && currentHash.startsWith(it.hash + '/'));
        const badge = (it.id === 'alerts' && alerts.length) ? `<span class="n-badge">${fmtNum(alerts.length)}</span>` : '';
        html += `<div class="nav-item ${active ? 'active' : ''}" data-hash="${it.hash}">
          <span class="n-icon">${icon(it.icon)}</span>
          <span class="n-label">${esc(it.label)}</span>
          ${badge}
        </div>`;
      });
      html += `</div>`;
    });

    html += `</nav>
      <div class="sidebar-foot">
        <div class="user-box" id="user-menu">
          ${UI.avatar({ id: session.id, firstName: session.name.split(' ')[0], lastName: '', color: session.color }, 'sm')}
          <div class="u-meta">
            <b>${esc(session.name)}</b>
            <small>${esc(session.role)} · ${esc(session.dataScope)}</small>
          </div>
          ${icon('chevron')}
        </div>
      </div>
    `;
    $('#sidebar').innerHTML = html;

    $$('.nav-item', $('#sidebar')).forEach(item => {
      item.addEventListener('click', () => {
        location.hash = item.dataset.hash;
        $('#sidebar').classList.remove('mobile-open');
        $('#sidebar-backdrop').classList.remove('show');
      });
    });
    $('#user-menu').addEventListener('click', openUserMenu);
  }

  function openUserMenu() {
    const s = Store.state.session;
    Modal.open({
      title: 'حساب کاربری',
      body: `
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:18px">
          ${UI.avatar({ id: s.id, firstName: s.name.split(' ')[0], lastName: '', color: s.color }, 'lg')}
          <div>
            <div style="font-weight:700;font-size:15px">${esc(s.name)}</div>
            <div style="color:var(--text-3);font-size:12.5px;margin-top:2px">${esc(s.email)}</div>
            <div style="margin-top:6px"><span class="badge primary">${esc(s.role)}</span> <span class="badge outline">${esc(s.dataScope)}</span></div>
          </div>
        </div>
        <div class="kv"><span>شناسه کاربر</span><span>${esc(s.id)}</span></div>
        <div class="kv"><span>حوزه دسترسی</span><span>${esc(s.dataScope)}</span></div>
        <div class="kv"><span>وضعیت نشست</span><span><span class="badge success">فعال</span></span></div>
      `,
      footer: `<button class="btn" data-close2>بستن</button><button class="btn btn-danger" data-logout>${icon('logout')} خروج از حساب</button>`,
      onMount: (el, close) => {
        el.querySelector('[data-close2]').addEventListener('click', close);
        el.querySelector('[data-logout]').addEventListener('click', () => {
          close();
          if (confirm('خروج از حساب کاربری؟')) logout();
        });
      }
    });
  }

  function logout() {
    Store.state.session = null;
    Store.save();
    $('#app').classList.add('hidden');
    $('#login-screen').classList.remove('hidden');
    renderLogin();
  }

  /* =============================================================
     13. HEADER
     ============================================================= */
  function renderHeader() {
    const session = Store.state.session;
    const hash = location.hash || '#/dashboard';
    const page = Pages.titleFor(hash);
    const alerts = Alerts.derive().filter(a => !isAlertDismissed(a.id));
    const notifs = Store.state.notifications || [];

    $('#header').innerHTML = `
      <button class="icon-btn" id="btn-mobile-menu" style="display:none">${icon('menu')}</button>
      <button class="icon-btn" id="btn-collapse">${icon('menu')}</button>
      <div class="crumb">
        <b>${esc(page.title)}</b>
        <span class="sep">/</span>
        <span>${esc(page.section)}</span>
      </div>
      <div class="spacer"></div>

      <div class="search-box" id="global-search">
        ${icon('search')}
        <input placeholder="جستجو در کارکنان، پروژه‌ها، تسک‌ها..." id="gs-input">
        <span class="kbd">/</span>
      </div>

      <button class="icon-btn" id="btn-refresh" title="بروزرسانی داده">${icon('refresh')}</button>
      <button class="icon-btn" id="btn-theme" title="تغییر تم">${icon(Store.state.ui.theme === 'light' ? 'moon' : 'sun')}</button>

      <div style="position:relative">
        <button class="icon-btn" id="btn-notif" title="اعلان‌ها">
          ${icon('bell')}
          ${alerts.length ? `<span class="dot-badge">${fmtNum(alerts.length)}</span>` : ''}
        </button>
      </div>

      <button class="icon-btn" id="btn-user" style="padding:0">${UI.avatar({ id: session.id, firstName: session.name.split(' ')[0], lastName: '', color: session.color }, 'sm')}</button>
    `;

    $('#btn-collapse').addEventListener('click', () => {
      Store.state.ui.sidebarCollapsed = !Store.state.ui.sidebarCollapsed;
      Store.save();
      $('#app').classList.toggle('sidebar-collapsed', Store.state.ui.sidebarCollapsed);
    });
    $('#btn-theme').addEventListener('click', toggleTheme);
    $('#btn-user').addEventListener('click', openUserMenu);
    $('#btn-refresh').addEventListener('click', () => {
      UI.toast('داده‌ها بروزرسانی شدند', 'success');
      Router.resolve();
    });
    $('#btn-notif').addEventListener('click', (e) => { e.stopPropagation(); openNotifications(); });
    $('#btn-mobile-menu').addEventListener('click', () => {
      $('#sidebar').classList.toggle('mobile-open');
      $('#sidebar-backdrop').classList.toggle('show');
    });

    $('#gs-input').addEventListener('focus', () => { if (!location.hash.includes('/search')) location.hash = '#/search'; });
    $('#gs-input').addEventListener('input', (e) => { GlobalSearch.query = e.target.value; Router.resolve(); });

    // responsive
    const isMobile = window.matchMedia('(max-width: 860px)').matches;
    $('#btn-mobile-menu').style.display = isMobile ? 'grid' : 'none';
    $('#btn-collapse').style.display = isMobile ? 'none' : 'grid';
  }

  function openNotifications() {
    const alerts = Alerts.derive().filter(a => !isAlertDismissed(a.id));
    const extra = Store.state.notifications || [];
    const all = [
      ...alerts.map(a => ({ id: a.id, title: a.title, desc: a.message, severity: a.severity, type: 'alert' })),
      ...extra.map(n => ({ id: n.id, title: n.title, desc: n.desc, severity: n.severity || 'info', type: 'notif' }))
    ];

    const body = all.length
      ? all.slice(0, 30).map(n => {
          const cls = n.severity === 'high' ? 'danger' : n.severity === 'medium' ? 'warning' : 'info';
          return `<div class="notif-item" data-nid="${esc(n.id)}">
            <div class="ni-icon" style="background:var(--${cls}-soft);color:var(--${cls})">${icon('alert')}</div>
            <div class="ni-body">
              <div class="ni-title">${esc(n.title)}</div>
              <div class="ni-desc">${esc(n.desc)}</div>
            </div>
          </div>`;
        }).join('')
      : `<div class="empty"><div class="emp-icon">${icon('bell')}</div><h4>اعلان جدیدی وجود ندارد</h4><p>همه چیز مرتب است.</p></div>`;

    const m = Modal.open({
      title: 'اعلان‌ها و هشدارها',
      body: `<div style="max-height:60vh;overflow:auto;margin:-20px">${body}</div>`,
      footer: `<button class="btn" data-close3>بستن</button>`,
      onMount: (el, close) => {
        el.querySelector('[data-close3]').addEventListener('click', close);
        el.querySelectorAll('.notif-item').forEach(it => {
          it.addEventListener('click', () => {
            close();
            const alertId = it.dataset.nid;
            Store.state.alertState[alertId] = Store.state.alertState[alertId] || {};
            Store.state.alertState[alertId].read = true;
            Store.save();
            const alert = Alerts.derive().find(a => a.id === alertId);
            if (alert) {
              if (alert.projectId) location.hash = '#/projects/' + alert.projectId;
              else if (alert.employeeId) location.hash = '#/employees/' + alert.employeeId;
              else location.hash = '#/alerts';
            }
          });
        });
      }
    });
  }

  /* =============================================================
     14. GLOBAL SEARCH
     ============================================================= */
  const GlobalSearch = { query: '' };

  function renderSearchResults() {
    const q = (GlobalSearch.query || '').trim();
    if (!q) {
      return `<div class="empty"><div class="emp-icon">${icon('search')}</div><h4>جستجوی سراسری</h4><p>نام کارمند، پروژه یا تسک را وارد کنید.</p></div>`;
    }
    const s = Store.state;
    const lq = q.toLowerCase();
    const emp = s.employees.filter(e => (e.firstName + ' ' + e.lastName + ' ' + e.position + ' ' + e.email).toLowerCase().includes(lq)).slice(0, 6);
    const prj = s.projects.filter(p => (p.name + ' ' + p.code + ' ' + p.client).toLowerCase().includes(lq)).slice(0, 6);
    const tsk = s.tasks.filter(t => (t.title + ' ' + t.code).toLowerCase().includes(lq)).slice(0, 6);
    const cnd = s.candidates.filter(c => (c.name + ' ' + c.position).toLowerCase().includes(lq)).slice(0, 4);

    const block = (title, rows) => rows.length ? `
      <div class="card mb-16">
        <div class="card-head"><h3>${esc(title)}</h3><span class="badge outline">${fmtNum(rows.length)}</span></div>
        <div class="card-body tight">${rows.join('')}</div>
      </div>` : '';

    const empRow = (e) => `<div class="stat-line clickable" style="cursor:pointer" data-go="#/employees/${e.id}">
      <div style="display:flex;align-items:center;gap:10px">
        ${UI.avatar(e, 'sm')}
        <div>
          <div style="font-weight:600;font-size:13px">${esc(e.firstName + ' ' + e.lastName)}</div>
          <div style="font-size:11.5px;color:var(--text-3)">${esc(e.position)}</div>
        </div>
      </div>
      ${UI.statusBadge(e.status)}
    </div>`;
    const prjRow = (p) => `<div class="stat-line clickable" style="cursor:pointer" data-go="#/projects/${p.id}">
      <div>
        <div style="font-weight:600;font-size:13px">${esc(p.name)}</div>
        <div style="font-size:11.5px;color:var(--text-3)">${esc(p.code)} · ${esc(p.client)}</div>
      </div>
      ${UI.statusBadge(p.status)}
    </div>`;
    const tskRow = (t) => `<div class="stat-line clickable" style="cursor:pointer" data-go="#/tasks">
      <div>
        <div style="font-weight:600;font-size:13px">${esc(t.title)}</div>
        <div style="font-size:11.5px;color:var(--text-3)">${esc(t.code)}</div>
      </div>
      ${UI.statusBadge(t.status)}
    </div>`;
    const cndRow = (c) => `<div class="stat-line clickable" style="cursor:pointer" data-go="#/recruitment">
      <div>
        <div style="font-weight:600;font-size:13px">${esc(c.name)}</div>
        <div style="font-size:11.5px;color:var(--text-3)">${esc(c.position)}</div>
      </div>
      ${UI.statusBadge(c.status)}
    </div>`;

    return block('کارکنان', emp.map(empRow)) +
           block('پروژه‌ها', prj.map(prjRow)) +
           block('تسک‌ها', tsk.map(tskRow)) +
           block('کاندیدها', cnd.map(cndRow)) ||
           `<div class="empty"><div class="emp-icon">${icon('search')}</div><h4>نتیجه‌ای یافت نشد</h4><p>عبارت دیگری را امتحان کنید.</p></div>`;
  }

  /* =============================================================
     15. PAGES — Dashboard
     ============================================================= */
  const Pages = {
    titleFor(hash) {
      const map = {
        '/dashboard': { title: 'نمای مدیریتی', section: 'داشبورد' },
        '/employees': { title: 'کارکنان', section: 'سرمایه انسانی' },
        '/recruitment': { title: 'جذب و استخدام', section: 'سرمایه انسانی' },
        '/interviews': { title: 'مصاحبه‌ها', section: 'سرمایه انسانی' },
        '/skills': { title: 'مهارت‌ها', section: 'سرمایه انسانی' },
        '/capacity': { title: 'ظرفیت منابع', section: 'سرمایه انسانی' },
        '/projects': { title: 'پروژه‌ها', section: 'پروژه‌ها' },
        '/tasks': { title: 'تسک‌ها / WBS', section: 'پروژه‌ها' },
        '/timesheets': { title: 'زمان و Timesheet', section: 'پروژه‌ها' },
        '/budget': { title: 'بودجه و هزینه', section: 'پروژه‌ها' },
        '/reports': { title: 'گزارش‌ها', section: 'مدیریت' },
        '/alerts': { title: 'هشدارها', section: 'مدیریت' },
        '/assistant': { title: 'دستیار هوشمند', section: 'هوشمند' },
        '/settings': { title: 'تنظیمات', section: 'سیستم' },
        '/users': { title: 'کاربران و نقش‌ها', section: 'سیستم' },
        '/audit': { title: 'Audit Log', section: 'سیستم' },
        '/search': { title: 'جستجو', section: 'جستجو' }
      };
      const key = hash.replace(/^#/, '').split('/').slice(0, 2).join('/');
      return map[key] || { title: 'صفحه', section: 'سامانه' };
    },

    dashboard() {
      const s = Store.state;
      const cards = s.kpiCards.filter(c => c.visible).sort((a, b) => a.order - b.order);

      const kpiHtml = cards.map(c => renderKpiCard(c)).join('');

      // status distributions
      const empStatus = ['Active','Onboarding','Offboarding','Inactive'].map(st => ({
        label: st, value: s.employees.filter(e => e.status === st).length,
        color: { Active: 'var(--success)', Onboarding: 'var(--info)', Offboarding: 'var(--warning)', Inactive: 'var(--danger)' }[st]
      })).filter(x => x.value > 0);

      const prjStatus = ['On Track','At Risk','Delayed','Planning','Completed'].map(st => ({
        label: st, value: s.projects.filter(p => p.status === st).length,
        color: { 'On Track':'var(--success)','At Risk':'var(--warning)','Delayed':'var(--danger)','Planning':'var(--info)','Completed':'var(--primary)' }[st]
      })).filter(x => x.value > 0);

      const alerts = Alerts.derive().filter(a => !isAlertDismissed(a.id));
      const actionItems = [
        { label: 'پروژه نیازمند بررسی', value: s.projects.filter(p => ['At Risk','Delayed'].includes(p.status)).length, hash: '#/projects?filter=atrisk' },
        { label: 'کارمند Overallocated', value: s.employees.filter(e => e.status === 'Active' && Metrics.totalAllocation(e.id) > 100).length, hash: '#/capacity' },
        { label: 'Timesheet منتظر تأیید', value: s.timeEntries.filter(t => t.status === 'Submitted').length, hash: '#/timesheets?status=Submitted' },
        { label: 'پروژه دارای ریسک بودجه', value: s.projects.filter(p => p.status !== 'Completed' && Metrics.projectActualCost(p.id) / (p.financialBudget || 1) > (p.progress + 10) / 100).length, hash: '#/budget' },
        { label: 'کاندید منتظر تصمیم', value: s.candidates.filter(c => ['Decision','Evaluation'].includes(c.status)).length, hash: '#/recruitment' }
      ].filter(x => x.value > 0);

      const empCapacity = s.employees.filter(e => e.status === 'Active').slice(0, 6).map(e => {
        const alloc = Metrics.totalAllocation(e.id);
        const cls = alloc > 100 ? 'danger' : alloc > 85 ? 'warning' : '';
        return `<div style="padding:10px 0;border-bottom:1px dashed var(--border)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div style="display:flex;align-items:center;gap:8px">
              ${UI.avatar(e, 'sm')}
              <div>
                <div style="font-size:13px;font-weight:600">${esc(e.firstName + ' ' + e.lastName)}</div>
                <div style="font-size:11px;color:var(--text-3)">${esc(e.position)}</div>
              </div>
            </div>
            <b style="font-size:12.5px;color:var(--${cls === 'danger' ? 'danger' : cls === 'warning' ? 'warning' : 'success'})">${fmtNum(alloc)}٪</b>
          </div>
          ${UI.progressBar(Math.min(alloc, 100), cls)}
        </div>`;
      }).join('');

      const atRiskProjects = s.projects.filter(p => ['At Risk','Delayed'].includes(p.status)).slice(0, 4);

      return `
        <div class="page-head">
          <div>
            <h1>نمای مدیریتی</h1>
            <p>خلاصه وضعیت سازمان در ${jalali(todayISO())}</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-sm" id="btn-manage-cards">${icon('sliders')} مدیریت کارت‌ها</button>
            <button class="btn btn-sm" id="btn-export-dash">${icon('download')} خروجی</button>
          </div>
        </div>

        <div class="grid grid-kpi mb-16">${kpiHtml}</div>

        <div class="grid grid-dash mb-16">
          <div>
            <div class="card mb-16">
              <div class="card-head">
                <div><h3>اقدامات مورد نیاز</h3><p>موارد فوری که نیاز به بررسی دارند</p></div>
              </div>
              <div class="card-body">
                ${actionItems.length ? actionItems.map(a => `
                  <div class="stat-line clickable" style="cursor:pointer" data-go="${a.hash}">
                    <span>${esc(a.label)}</span>
                    <span><span class="badge ${a.value > 2 ? 'danger' : 'warning'}">${fmtNum(a.value)}</span></span>
                  </div>
                `).join('') : `<div class="empty" style="padding:24px"><p>موردی نیازمند اقدام نیست.</p></div>`}
              </div>
            </div>

            <div class="card">
              <div class="card-head">
                <div><h3>پروژه‌های نیازمند توجه</h3><p>وضعیت پروژه‌های در ریسک یا تأخیر</p></div>
                <a href="#/projects" class="btn btn-sm btn-ghost">مشاهده همه</a>
              </div>
              <div class="card-body tight">
                ${atRiskProjects.length ? atRiskProjects.map(p => {
                  const h = Metrics.projectActualHours(p.id);
                  const timePct = Math.round((h / (p.timeBudget || 1)) * 100);
                  return `<div style="padding:12px;border-bottom:1px solid var(--border);cursor:pointer" data-go="#/projects/${p.id}">
                    <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;margin-bottom:8px">
                      <div>
                        <div style="font-weight:600;font-size:13.5px">${esc(p.name)}</div>
                        <div style="font-size:11.5px;color:var(--text-3);margin-top:2px">${esc(p.code)} · ${esc(p.client)}</div>
                      </div>
                      ${UI.statusBadge(p.status)}
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11.5px;color:var(--text-2)">
                      <div>پیشرفت: <b>${fmtNum(p.progress)}٪</b></div>
                      <div>مصرف زمان: <b>${fmtNum(timePct)}٪</b></div>
                    </div>
                    <div style="margin-top:8px">${UI.progressBar(p.progress, p.progress >= timePct ? 'success' : 'warning')}</div>
                  </div>`;
                }).join('') : `<div class="empty"><p>همه پروژه‌ها در وضعیت مطلوب هستند.</p></div>`}
              </div>
            </div>
          </div>

          <div>
            <div class="card mb-16">
              <div class="card-head"><h3>وضعیت کارکنان</h3></div>
              <div class="card-body">
                <div style="display:flex;justify-content:center;margin-bottom:12px">
                  ${Charts.donut(empStatus, 150)}
                </div>
                <div class="donut-legend">
                  ${empStatus.map(x => `<div class="legend-row">
                    <span class="sw" style="background:${x.color}"></span>
                    <span>${esc(x.label)}</span>
                    <b>${fmtNum(x.value)}</b>
                  </div>`).join('')}
                </div>
              </div>
            </div>

            <div class="card mb-16">
              <div class="card-head"><h3>وضعیت پروژه‌ها</h3></div>
              <div class="card-body">
                <div style="display:flex;justify-content:center;margin-bottom:12px">
                  ${Charts.donut(prjStatus, 150)}
                </div>
                <div class="donut-legend">
                  ${prjStatus.map(x => `<div class="legend-row">
                    <span class="sw" style="background:${x.color}"></span>
                    <span>${esc(x.label)}</span>
                    <b>${fmtNum(x.value)}</b>
                  </div>`).join('')}
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-head">
                <div><h3>ظرفیت کارکنان</h3><p>نسبت تخصیص به ظرفیت</p></div>
                <a href="#/capacity" class="btn btn-sm btn-ghost">جزئیات</a>
              </div>
              <div class="card-body">${empCapacity || `<div class="empty"><p>داده‌ای موجود نیست.</p></div>`}</div>
            </div>
          </div>
        </div>
      `;
    },

    employees() {
      const s = Store.state;
      const params = parseQuery();
      const state = {
        q: params.q || '', office: params.office || '', org: params.org || '',
        status: params.status || '', type: params.type || '', page: 1, sort: 'name'
      };

      let list = s.employees.slice();
      if (state.q) { const lq = state.q.toLowerCase(); list = list.filter(e => (e.firstName + ' ' + e.lastName + ' ' + e.position + ' ' + e.email).toLowerCase().includes(lq)); }
      if (state.office) list = list.filter(e => e.office === state.office);
      if (state.org) list = list.filter(e => e.orgUnit === state.org);
      if (state.status) list = list.filter(e => e.status === state.status);
      if (state.type) list = list.filter(e => e.employmentType === state.type);

      list.sort((a, b) => (a.firstName + ' ' + a.lastName).localeCompare(b.firstName + ' ' + b.lastName, 'fa'));

      const perPage = 8;
      const totalPages = Math.max(1, Math.ceil(list.length / perPage));
      if (state.page > totalPages) state.page = 1;
      const pageItems = list.slice((state.page - 1) * perPage, state.page * perPage);

      const rows = pageItems.map(e => {
        const alloc = Metrics.totalAllocation(e.id);
        const allocCls = alloc > 100 ? 'danger' : alloc > 85 ? 'warning' : 'success';
        return `<tr class="clickable" data-id="${e.id}">
          <td>
            <div class="emp-cell">
              ${UI.avatar(e)}
              <div>
                <div class="emp-name">${esc(e.firstName + ' ' + e.lastName)}</div>
                <div class="emp-role">${esc(e.position)}</div>
              </div>
            </div>
          </td>
          <td>${esc(e.orgUnit)}</td>
          <td>${esc(e.office)}</td>
          <td>${UI.statusBadge(e.status)}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;min-width:120px">
              ${UI.progressBar(Math.min(alloc, 100), allocCls)}
              <b style="font-size:12px;min-width:36px;text-align:left">${fmtNum(alloc)}٪</b>
            </div>
          </td>
          <td>${fmtNum(e.skills.length)} مورد</td>
          <td style="white-space:nowrap">
            <button class="btn btn-sm btn-ghost" data-view="${e.id}" title="مشاهده">${icon('eye')}</button>
            <button class="btn btn-sm btn-ghost" data-edit="${e.id}" title="ویرایش">${icon('edit')}</button>
          </td>
        </tr>`;
      }).join('');

      return `
        <div class="page-head">
          <div><h1>کارکنان</h1><p>${fmtNum(list.length)} نفر — مدیریت پرسنل، ظرفیت و مهارت‌ها</p></div>
          <div class="page-actions">
            <button class="btn btn-sm" id="btn-export-emp">${icon('download')} خروجی CSV</button>
            <button class="btn btn-sm btn-primary" id="btn-add-emp">${icon('plus')} افزودن کارمند</button>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-body">
            <div class="filter-bar">
              <input class="input" id="f-q" placeholder="جستجو..." value="${esc(state.q)}" style="min-width:200px">
              <select class="select" id="f-office"><option value="">همه دفاتر</option>${s.offices.map(o => `<option ${state.office === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
              <select class="select" id="f-org"><option value="">همه واحدها</option>${s.orgUnits.map(o => `<option ${state.org === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
              <select class="select" id="f-status"><option value="">همه وضعیت‌ها</option>${s.employeeStatuses.map(o => `<option ${state.status === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
              <select class="select" id="f-type"><option value="">همه انواع</option>${s.employmentTypes.map(o => `<option ${state.type === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
              <button class="btn btn-sm btn-ghost" id="f-clear">پاک‌سازی</button>
            </div>

            <div class="table-wrap">
              <table class="tbl">
                <thead><tr>
                  <th>کارمند</th><th>واحد</th><th>دفتر</th><th>وضعیت</th><th>تخصیص</th><th>مهارت‌ها</th><th>عملیات</th>
                </tr></thead>
                <tbody>${rows || `<tr><td colspan="7"><div class="tbl-empty">هیچ کارمندی یافت نشد.</div></td></tr>`}</tbody>
              </table>
            </div>

            ${totalPages > 1 ? `<div class="pagination">
              ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `<button class="btn btn-sm ${p === state.page ? 'active' : ''}" data-page="${p}">${fmtNum(p)}</button>`).join('')}
            </div>` : ''}
          </div>
        </div>
      `;
    },

    employeeDetail(id) {
      return null; // handled via drawer
    },

    recruitment() {
      const s = Store.state;
      const funnel = ['Screening','Interview','Evaluation','Decision','Accepted'];
      const funnelCounts = funnel.map(st => ({ status: st, count: s.candidates.filter(c => c.status === st).length }));
      const sources = s.candidateSources.map(src => ({ src, count: s.candidates.filter(c => c.source === src).length }));

      const rows = s.candidates.map(c => {
        const ivs = s.interviews.filter(i => i.candidateId === c.id);
        return `<tr class="clickable" data-cid="${c.id}">
          <td><div style="font-weight:600">${esc(c.name)}</div><div style="font-size:11.5px;color:var(--text-3)">${esc(c.contact)}</div></td>
          <td>${esc(c.position)}</td>
          <td><span class="badge outline">${esc(c.source)}</span></td>
          <td>${UI.statusBadge(c.status)}</td>
          <td>${fmtNum(ivs.length)}</td>
          <td>${jalali(c.createdDate)}</td>
        </tr>`;
      }).join('');

      return `
        <div class="page-head">
          <div><h1>جذب و استخدام</h1><p>قیف جذب، منابع ورودی و مدیریت کاندیدها</p></div>
          <div class="page-actions">
            <button class="btn btn-sm btn-primary" id="btn-add-cand">${icon('plus')} افزودن کاندید</button>
          </div>
        </div>

        <div class="grid grid-3 mb-16">
          <div class="card" style="grid-column:span 2">
            <div class="card-head"><h3>قیف جذب</h3><p>مراحل فرآیند استخدام</p></div>
            <div class="card-body">
              <div style="display:flex;gap:8px;align-items:stretch;overflow-x:auto;padding-bottom:4px">
                ${funnelCounts.map((f, i) => `
                  <div style="flex:1;min-width:120px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center">
                    <div style="font-size:11px;color:var(--text-3);margin-bottom:6px">مرحله ${fmtNum(i + 1)}</div>
                    <div style="font-size:12.5px;font-weight:600;margin-bottom:6px">${esc(f.status)}</div>
                    <div style="font-size:22px;font-weight:700;color:var(--primary)">${fmtNum(f.count)}</div>
                  </div>
                  ${i < funnelCounts.length - 1 ? `<div style="display:grid;place-items:center;color:var(--text-3)">←</div>` : ''}
                `).join('')}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h3>منابع جذب</h3></div>
            <div class="card-body">
              ${Charts.hbar(sources.map(x => ({ label: x.src, value: x.count, display: fmtNum(x.count) })))}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>کاندیدها</h3><span class="badge outline">${fmtNum(s.candidates.length)} نفر</span></div>
          <div class="card-body tight">
            <div class="table-wrap">
              <table class="tbl">
                <thead><tr><th>کاندید</th><th>موقعیت</th><th>منبع</th><th>وضعیت</th><th>مصاحبه‌ها</th><th>تاریخ</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    interviews() {
      const s = Store.state;
      const rows = s.interviews.map(i => {
        const c = s.candidates.find(x => x.id === i.candidateId);
        const emp = s.employees.find(e => e.id === i.interviewerId);
        return `<tr>
          <td>${c ? esc(c.name) : '—'}</td>
          <td>${esc(i.type)}</td>
          <td>${emp ? esc(emp.firstName + ' ' + emp.lastName) : '—'}</td>
          <td>${jalali(i.date)}</td>
          <td><b>${fmtNum(i.score)}</b></td>
          <td><span class="badge ${i.result === 'Pass' ? 'success' : 'danger'}">${esc(i.result)}</span></td>
          <td>${esc(i.recommendation)}</td>
        </tr>`;
      }).join('');

      return `
        <div class="page-head"><div><h1>مصاحبه‌ها</h1><p>سابقه و نتایج مصاحبه‌های انجام‌شده</p></div></div>
        <div class="card">
          <div class="card-body tight">
            <div class="table-wrap">
              <table class="tbl">
                <thead><tr><th>کاندید</th><th>نوع</th><th>مصاحبه‌گر</th><th>تاریخ</th><th>امتیاز</th><th>نتیجه</th><th>پیشنهاد</th></tr></thead>
                <tbody>${rows || `<tr><td colspan="7"><div class="tbl-empty">مصاحبه‌ای ثبت نشده است.</div></td></tr>`}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    skills() {
      const s = Store.state;
      const map = {};
      s.employees.forEach(e => e.skills.forEach(sk => {
        map[sk.name] = map[sk.name] || { count: 0, totalLevel: 0, employees: [] };
        map[sk.name].count++;
        map[sk.name].totalLevel += sk.level;
        map[sk.name].employees.push(e);
      }));
      const rows = Object.entries(map)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, d]) => ({ label: name, value: d.count, display: `${fmtNum(d.count)} نفر` }));

      const grid = Object.entries(map).sort((a, b) => b[1].count - a[1].count).map(([name, d]) => `
        <div class="card" style="padding:16px">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">
            <b style="font-size:14px">${esc(name)}</b>
            <span class="badge primary">${fmtNum(d.count)}</span>
          </div>
          <div style="font-size:12px;color:var(--text-3);margin-bottom:10px">میانگین سطح: ${fmtNum((d.totalLevel / d.count).toFixed(1))} از ۵</div>
          <div class="chips">${d.employees.slice(0, 4).map(e => `<span class="chip">${esc(e.firstName + ' ' + e.lastName)}</span>`).join('')}${d.employees.length > 4 ? `<span class="chip">+${fmtNum(d.employees.length - 4)}</span>` : ''}</div>
        </div>
      `).join('');

      return `
        <div class="page-head"><div><h1>مهارت‌ها</h1><p>توزیع مهارت‌ها در سازمان</p></div></div>
        <div class="grid grid-2 mb-16">
          <div class="card">
            <div class="card-head"><h3>پرکاربردترین مهارت‌ها</h3></div>
            <div class="card-body">${Charts.hbar(rows.slice(0, 8))}</div>
          </div>
          <div class="card">
            <div class="card-head"><h3>آمار کلی</h3></div>
            <div class="card-body">
              <div class="kv"><span>تعداد مهارت‌ها</span><span><b>${fmtNum(Object.keys(map).length)}</b></span></div>
              <div class="kv"><span>کارمند فعال</span><span><b>${fmtNum(s.employees.filter(e => e.status === 'Active').length)}</b></span></div>
              <div class="kv"><span>میانگین مهارت هر نفر</span><span><b>${fmtNum((s.employees.reduce((a, e) => a + e.skills.length, 0) / s.employees.length).toFixed(1))}</b></span></div>
            </div>
          </div>
        </div>
        <div class="grid grid-3">${grid}</div>
      `;
    },

    capacity() {
      const s = Store.state;
      const active = s.employees.filter(e => e.status === 'Active');

      const rows = active.map(e => {
        const alloc = Metrics.totalAllocation(e.id);
        const remaining = Math.max(0, 100 - alloc);
        const cls = alloc > 100 ? 'danger' : alloc > 85 ? 'warning' : 'success';
        const label = alloc > 100 ? 'Overallocated' : alloc > 85 ? 'Warning' : 'Safe';
        return `<tr>
          <td>
            <div class="emp-cell">
              ${UI.avatar(e)}
              <div><div class="emp-name">${esc(e.firstName + ' ' + e.lastName)}</div><div class="emp-role">${esc(e.position)}</div></div>
            </div>
          </td>
          <td>${fmtNum(e.weeklyCapacity)} ساعت</td>
          <td><b>${fmtNum(alloc)}٪</b></td>
          <td>${fmtNum(remaining)}٪</td>
          <td style="min-width:160px">
            <div style="display:flex;align-items:center;gap:10px">
              ${UI.progressBar(Math.min(alloc, 100), cls)}
              <span class="badge ${cls === 'danger' ? 'danger' : cls === 'warning' ? 'warning' : 'success'}">${esc(label)}</span>
            </div>
          </td>
          <td><button class="btn btn-sm btn-ghost" data-view="${e.id}">مشاهده</button></td>
        </tr>`;
      }).join('');

      // heatmap
      const heat = active.map(e => {
        const alloc = Metrics.totalAllocation(e.id);
        const intensity = Math.min(alloc, 130) / 130;
        const bg = alloc > 100 ? `rgba(229,72,77,${intensity})` : alloc > 85 ? `rgba(247,144,9,${intensity})` : `rgba(18,183,106,${Math.max(0.15, intensity)})`;
        return `<div style="background:${bg};border-radius:8px;padding:12px;border:1px solid var(--border)">
          <div style="font-size:12px;font-weight:600">${esc(e.firstName + ' ' + e.lastName)}</div>
          <div style="font-size:20px;font-weight:700;margin-top:6px">${fmtNum(alloc)}٪</div>
        </div>`;
      }).join('');

      return `
        <div class="page-head"><div><h1>ظرفیت منابع</h1><p>تحلیل تخصیص و ظرفیت کارکنان</p></div></div>

        <div class="grid grid-3 mb-16">
          <div class="card"><div class="card-body">
            <div style="font-size:12px;color:var(--text-3)">ظرفیت کل</div>
            <div style="font-size:24px;font-weight:700">${fmtNum(active.length * 100)}٪</div>
          </div></div>
          <div class="card"><div class="card-body">
            <div style="font-size:12px;color:var(--text-3)">تخصیص‌یافته</div>
            <div style="font-size:24px;font-weight:700">${fmtNum(active.reduce((a, e) => a + Metrics.totalAllocation(e.id), 0))}٪</div>
          </div></div>
          <div class="card"><div class="card-body">
            <div style="font-size:12px;color:var(--text-3)">میانگین مصرف</div>
            <div style="font-size:24px;font-weight:700">${fmtNum(Metrics.avgUtilization())}٪</div>
          </div></div>
        </div>

        <div class="card mb-16">
          <div class="card-head"><h3>Heatmap ظرفیت</h3><p>نمای سریع مصرف ظرفیت</p></div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">${heat}</div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>جزئیات ظرفیت</h3></div>
          <div class="card-body tight">
            <div class="table-wrap">
              <table class="tbl">
                <thead><tr><th>کارمند</th><th>ظرفیت هفتگی</th><th>تخصیص‌یافته</th><th>آزاد</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    projects() {
      const s = Store.state;
      const params = parseQuery();
      const state = { status: params.status || '', client: params.client || '', view: params.view || 'table' };

      let list = s.projects.slice();
      if (state.status) list = list.filter(p => p.status === state.status);
      if (state.client) list = list.filter(p => p.client === state.client);

      const clients = [...new Set(s.projects.map(p => p.client))];

      const cardView = list.map(p => {
        const actualHours = Metrics.projectActualHours(p.id);
        const timePct = Math.round((actualHours / (p.timeBudget || 1)) * 100);
        const actualCost = Metrics.projectActualCost(p.id);
        const budgetPct = Math.round((actualCost / (p.financialBudget || 1)) * 100);
        const team = s.assignments.filter(a => a.projectId === p.id).length;
        return `<div class="card clickable" style="cursor:pointer" data-pid="${p.id}">
          <div class="card-body">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;margin-bottom:12px">
              <div>
                <div style="font-size:11px;color:var(--text-3);font-family:monospace">${esc(p.code)}</div>
                <div style="font-weight:700;font-size:14.5px;margin-top:2px">${esc(p.name)}</div>
                <div style="font-size:12px;color:var(--text-2);margin-top:3px">${esc(p.client)}</div>
              </div>
              ${UI.statusBadge(p.status)}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px">
              <div><div style="color:var(--text-3);margin-bottom:5px">پیشرفت</div><b>${fmtNum(p.progress)}٪</b>${UI.progressBar(p.progress)}</div>
              <div><div style="color:var(--text-3);margin-bottom:5px">مصرف زمان</div><b>${fmtNum(timePct)}٪</b>${UI.progressBar(Math.min(timePct, 100), timePct > p.progress + 10 ? 'warning' : 'success')}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:14px;font-size:12px;padding-top:12px;border-top:1px dashed var(--border)">
              <div><div style="color:var(--text-3)">بودجه</div><b>${fmtMoney(p.financialBudget)}</b></div>
              <div><div style="color:var(--text-3)">هزینه</div><b>${fmtMoney(actualCost)}</b></div>
              <div><div style="color:var(--text-3)">تیم</div><b>${fmtNum(team)} نفر</b></div>
            </div>
          </div>
        </div>`;
      }).join('');

      const tableView = list.map(p => {
        const actualHours = Metrics.projectActualHours(p.id);
        const timePct = Math.round((actualHours / (p.timeBudget || 1)) * 100);
        const actualCost = Metrics.projectActualCost(p.id);
        const variance = (p.financialBudget || 0) - actualCost;
        const team = s.assignments.filter(a => a.projectId === p.id).length;
        const pm = s.employees.find(e => e.id === p.pmId);
        return `<tr class="clickable" data-pid="${p.id}">
          <td><div style="font-family:monospace;font-size:11px;color:var(--text-3)">${esc(p.code)}</div><div style="font-weight:600;font-size:13px;margin-top:2px">${esc(p.name)}</div></td>
          <td>${esc(p.client)}</td>
          <td>${pm ? esc(pm.firstName + ' ' + pm.lastName) : '—'}</td>
          <td>${UI.statusBadge(p.status)}</td>
          <td style="min-width:120px"><b>${fmtNum(p.progress)}٪</b>${UI.progressBar(p.progress)}</td>
          <td>${fmtNum(timePct)}٪</td>
          <td>${fmtMoney(actualCost)}</td>
          <td style="color:var(--${variance >= 0 ? 'success' : 'danger'})"><b>${fmtMoney(variance)}</b></td>
          <td>${fmtNum(team)}</td>
        </tr>`;
      }).join('');

      return `
        <div class="page-head">
          <div><h1>پروژه‌ها</h1><p>${fmtNum(list.length)} پروژه — مدیریت پرتفوی</p></div>
          <div class="page-actions">
            <button class="btn btn-sm" id="view-toggle">${state.view === 'table' ? icon('grid') + ' نمایش کارتی' : icon('layers') + ' نمایش جدولی'}</button>
            <button class="btn btn-sm btn-primary" id="btn-add-project">${icon('plus')} پروژه جدید</button>
          </div>
        </div>

        <div class="grid grid-4 mb-16">
          <div class="card"><div class="card-body"><div style="font-size:12px;color:var(--text-3)">کل پروژه‌ها</div><div style="font-size:22px;font-weight:700">${fmtNum(s.projects.length)}</div></div></div>
          <div class="card"><div class="card-body"><div style="font-size:12px;color:var(--text-3)">فعال</div><div style="font-size:22px;font-weight:700;color:var(--success)">${fmtNum(s.projects.filter(p => p.status === 'On Track').length)}</div></div></div>
          <div class="card"><div class="card-body"><div style="font-size:12px;color:var(--text-3)">در ریسک</div><div style="font-size:22px;font-weight:700;color:var(--warning)">${fmtNum(s.projects.filter(p => p.status === 'At Risk').length)}</div></div></div>
          <div class="card"><div class="card-body"><div style="font-size:12px;color:var(--text-3)">تأخیر / تکمیل</div><div style="font-size:22px;font-weight:700;color:var(--danger)">${fmtNum(s.projects.filter(p => p.status === 'Delayed').length)} / <span style="color:var(--primary)">${fmtNum(s.projects.filter(p => p.status === 'Completed').length)}</span></div></div></div>
        </div>

        <div class="card mb-16">
          <div class="card-body">
            <div class="filter-bar">
              <select class="select" id="p-status"><option value="">همه وضعیت‌ها</option>${s.projectStatuses.map(o => `<option ${state.status === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
              <select class="select" id="p-client"><option value="">همه مشتریان</option>${clients.map(o => `<option ${state.client === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
            </div>
          </div>
        </div>

        ${state.view === 'card'
          ? `<div class="grid grid-2">${cardView || `<div class="empty"><p>پروژه‌ای یافت نشد.</p></div>`}</div>`
          : `<div class="card"><div class="card-body tight"><div class="table-wrap">
              <table class="tbl">
                <thead><tr><th>پروژه</th><th>مشتری</th><th>PM</th><th>وضعیت</th><th>پیشرفت</th><th>مصرف زمان</th><th>هزینه واقعی</th><th>انحراف بودجه</th><th>تیم</th></tr></thead>
                <tbody>${tableView || `<tr><td colspan="9"><div class="tbl-empty">پروژه‌ای یافت نشد.</div></td></tr>`}</tbody>
              </table>
            </div></div></div>`}
      `;
    },

    projectDetail(id) {
      const s = Store.state;
      const p = s.projects.find(x => x.id === id);
      if (!p) return `<div class="empty"><h4>پروژه یافت نشد</h4></div>`;

      const pm = s.employees.find(e => e.id === p.pmId);
      const actualHours = Metrics.projectActualHours(p.id);
      const timePct = Math.round((actualHours / (p.timeBudget || 1)) * 100);
      const actualCost = Metrics.projectActualCost(p.id);
      const budgetPct = Math.round((actualCost / (p.financialBudget || 1)) * 100);
      const team = s.assignments.filter(a => a.projectId === p.id);
      const tasks = s.tasks.filter(t => t.projectId === p.id);
      const alerts = Alerts.derive().filter(a => a.projectId === p.id);

      // Health explanation
      const reasons = [];
      if (timePct - p.progress > 10) reasons.push(`مصرف زمان ${fmtNum(timePct)}٪ در مقابل پیشرفت ${fmtNum(p.progress)}٪`);
      if (budgetPct - p.progress > 10) reasons.push(`مصرف بودجه ${fmtNum(budgetPct)}٪ در مقابل پیشرفت ${fmtNum(p.progress)}٪`);
      if (p.endDate && new Date(p.endDate) < new Date() && p.status !== 'Completed') reasons.push('از مهلت پروژه عبور شده است');
      if (tasks.filter(t => t.status === 'Blocked').length) reasons.push(`${fmtNum(tasks.filter(t => t.status === 'Blocked').length)} تسک مسدود`);
      if (!reasons.length) reasons.push('همه شاخص‌های اصلی در محدوده قابل قبول قرار دارند');

      const teamRows = team.map(a => {
        const e = s.employees.find(x => x.id === a.employeeId);
        return `<tr>
          <td>${e ? `<div class="emp-cell">${UI.avatar(e, 'sm')}<div><div class="emp-name">${esc(e.firstName + ' ' + e.lastName)}</div><div class="emp-role">${esc(e.position)}</div></div></div>` : '—'}</td>
          <td>${esc(a.role)}</td>
          <td>${fmtNum(a.allocation)}٪</td>
          <td>${fmtNum(a.plannedHours)} ساعت</td>
          <td>${fmtNum(a.actualHours)} ساعت</td>
          <td>${UI.statusBadge(a.status)}</td>
        </tr>`;
      }).join('');

      const taskRows = tasks.map(t => {
        const emp = s.employees.find(e => e.id === t.assigneeId);
        return `<tr>
          <td><span style="font-family:monospace;font-size:11px;color:var(--text-3)">${esc(t.code)}</span></td>
          <td>${esc(t.title)}</td>
          <td>${emp ? esc(emp.firstName + ' ' + emp.lastName) : '—'}</td>
          <td>${UI.statusBadge(t.status)}</td>
          <td>${UI.priorityBadge(t.priority)}</td>
          <td>${fmtNum(t.estimate)} / ${fmtNum(t.actual)}</td>
          <td>${fmtNum(t.progress)}٪</td>
        </tr>`;
      }).join('');

      const healthBadge = p.status === 'On Track' || p.status === 'Completed' ? 'success' : p.status === 'At Risk' ? 'warning' : 'danger';

      return `
        <div class="page-head">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
              <a href="#/projects" class="btn btn-sm btn-ghost">${icon('chevron')} بازگشت</a>
              <span class="badge outline" style="font-family:monospace">${esc(p.code)}</span>
            </div>
            <h1>${esc(p.name)}</h1>
            <p>مشتری: ${esc(p.client)} · PM: ${pm ? esc(pm.firstName + ' ' + pm.lastName) : '—'} · ${jalali(p.startDate)} تا ${jalali(p.endDate)}</p>
          </div>
          <div class="page-actions">
            ${UI.statusBadge(p.status)}
            <span class="badge ${healthBadge}">Health: ${esc(p.health)}</span>
          </div>
        </div>

        <div class="grid grid-4 mb-16">
          <div class="card"><div class="card-body">
            <div style="font-size:12px;color:var(--text-3)">پیشرفت</div>
            <div style="font-size:24px;font-weight:700">${fmtNum(p.progress)}٪</div>
            ${UI.progressBar(p.progress)}
          </div></div>
          <div class="card"><div class="card-body">
            <div style="font-size:12px;color:var(--text-3)">مصرف زمان</div>
            <div style="font-size:24px;font-weight:700">${fmtNum(timePct)}٪</div>
            <div style="font-size:11.5px;color:var(--text-3);margin-top:4px">${fmtNum(actualHours)} از ${fmtNum(p.timeBudget)} ساعت</div>
          </div></div>
          <div class="card"><div class="card-body">
            <div style="font-size:12px;color:var(--text-3)">هزینه واقعی</div>
            <div style="font-size:24px;font-weight:700">${fmtMoney(actualCost)}</div>
            <div style="font-size:11.5px;color:var(--text-3);margin-top:4px">از ${fmtMoney(p.financialBudget)}</div>
          </div></div>
          <div class="card"><div class="card-body">
            <div style="font-size:12px;color:var(--text-3)">تیم</div>
            <div style="font-size:24px;font-weight:700">${fmtNum(team.length)}</div>
            <div style="font-size:11.5px;color:var(--text-3);margin-top:4px">نفر تخصیص‌یافته</div>
          </div></div>
        </div>

        <div class="grid grid-dash mb-16">
          <div class="card">
            <div class="card-head"><h3>Health توضیح‌پذیر</h3><p>دلایل وضعیت فعلی پروژه</p></div>
            <div class="card-body">
              <ul style="margin:0;padding-inline-start:18px;font-size:13px;color:var(--text-2);line-height:2">
                ${reasons.map(r => `<li>${esc(r)}</li>`).join('')}
              </ul>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>هشدارها</h3></div>
            <div class="card-body">
              ${alerts.length ? alerts.map(a => `<div class="stat-line"><span>${esc(a.title)}</span><span class="badge ${a.severity === 'high' ? 'danger' : 'warning'}">${esc(a.severity)}</span></div>`).join('') : `<div class="empty" style="padding:20px"><p>هشداری وجود ندارد.</p></div>`}
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-head"><h3>محاسبه پیشرفت</h3></div>
          <div class="card-body">
            <div class="grid grid-3">
              <div class="kv"><span>پیشرفت برنامه‌ای</span><span>${fmtNum(Math.round((new Date() - new Date(p.startDate)) / (new Date(p.endDate) - new Date(p.startDate)) * 100))}٪</span></div>
              <div class="kv"><span>پیشرفت واقعی</span><span><b>${fmtNum(p.progress)}٪</b></span></div>
              <div class="kv"><span>مصرف زمان</span><span>${fmtNum(timePct)}٪</span></div>
              <div class="kv"><span>مصرف بودجه</span><span>${fmtNum(budgetPct)}٪</span></div>
              <div class="kv"><span>تسک‌های تکمیل‌شده</span><span>${fmtNum(tasks.filter(t => t.status === 'Done').length)} از ${fmtNum(tasks.length)}</span></div>
              <div class="kv"><span>انحراف</span><span style="color:var(--${timePct - p.progress > 10 ? 'danger' : 'success'})">${fmtNum(timePct - p.progress)} واحد</span></div>
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-head"><h3>تیم پروژه</h3><span class="badge outline">${fmtNum(team.length)} نفر</span></div>
          <div class="card-body tight">
            <div class="table-wrap">
              <table class="tbl">
                <thead><tr><th>کارمند</th><th>نقش</th><th>تخصیص</th><th>ساعت برنامه‌ای</th><th>ساعت واقعی</th><th>وضعیت</th></tr></thead>
                <tbody>${teamRows || `<tr><td colspan="6"><div class="tbl-empty">تیمی اختصاص نیافته است.</div></td></tr>`}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>تسک‌ها</h3><span class="badge outline">${fmtNum(tasks.length)} تسک</span></div>
          <div class="card-body tight">
            <div class="table-wrap">
              <table class="tbl">
                <thead><tr><th>کد</th><th>عنوان</th><th>مسئول</th><th>وضعیت</th><th>اولویت</th><th>تخمین / واقعی</th><th>پیشرفت</th></tr></thead>
                <tbody>${taskRows || `<tr><td colspan="7"><div class="tbl-empty">تسکی ثبت نشده است.</div></td></tr>`}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    tasks() {
      const s = Store.state;
      const cols = s.taskStatuses;
      const tasksByStatus = {};
      cols.forEach(c => tasksByStatus[c] = s.tasks.filter(t => t.status === c));

      const colHtml = cols.map(c => {
        const items = tasksByStatus[c];
        const cards = items.map(t => {
          const emp = s.employees.find(e => e.id === t.assigneeId);
          const prj = s.projects.find(p => p.id === t.projectId);
          return `<div class="kcard" draggable="true" data-task="${t.id}">
            <div class="kc-code">${esc(t.code)} · ${esc(prj ? prj.code : '')}</div>
            <div class="kc-title">${esc(t.title)}</div>
            <div class="kc-meta">
              <span class="prio">${UI.priorityBadge(t.priority)}</span>
              ${emp ? UI.avatar(emp, 'sm') : ''}
            </div>
          </div>`;
        }).join('');
        return `<div class="kcol" data-status="${c}">
          <div class="kcol-head"><b>${esc(c)}</b><span class="kc">${fmtNum(items.length)}</span></div>
          <div class="kcol-body" data-drop="${c}">${cards || `<div style="text-align:center;color:var(--text-3);font-size:11.5px;padding:16px">خالی</div>`}</div>
        </div>`;
      }).join('');

      return `
        <div class="page-head">
          <div><h1>تسک‌ها / WBS</h1><p>مدیریت تسک‌ها با Kanban Board — Drag & Drop برای تغییر وضعیت</p></div>
          <div class="page-actions">
            <button class="btn btn-sm btn-primary" id="btn-add-task">${icon('plus')} تسک جدید</button>
          </div>
        </div>
        <div class="kanban">${colHtml}</div>
      `;
    },

    timesheets() {
      const s = Store.state;
      const params = parseQuery();
      const statusFilter = params.status || '';
      let entries = s.timeEntries.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
      if (statusFilter) entries = entries.filter(e => e.status === statusFilter);
      entries = entries.slice(0, 80);

      const rows = entries.map(t => {
        const e = s.employees.find(x => x.id === t.employeeId);
        const p = s.projects.find(x => x.id === t.projectId);
        return `<tr>
          <td>${e ? `<div class="emp-cell">${UI.avatar(e, 'sm')}<div><div class="emp-name">${esc(e.firstName + ' ' + e.lastName)}</div><div class="emp-role">${esc(e.position)}</div></div></div>` : '—'}</td>
          <td>${p ? esc(p.name) : '—'}</td>
          <td>${jalali(t.date)}</td>
          <td><b>${fmtNum(t.hours)}</b></td>
          <td>${UI.statusBadge(t.status)}</td>
          <td>${t.status === 'Submitted' ? `<button class="btn btn-sm btn-success" data-approve="${t.id}">${icon('check')} تأیید</button>` : '—'}</td>
        </tr>`;
      }).join('');

      const totalHours = entries.reduce((a, b) => a + b.hours, 0);
      const approvedHours = entries.filter(e => e.status === 'Approved').reduce((a, b) => a + b.hours, 0);

      return `
        <div class="page-head">
          <div><h1>زمان و Timesheet</h1><p>ثبت و تأیید ساعات کار</p></div>
          <div class="page-actions">
            <button class="btn btn-sm" id="btn-export-ts">${icon('download')} خروجی CSV</button>
          </div>
        </div>

        <div class="grid grid-3 mb-16">
          <div class="card"><div class="card-body"><div style="font-size:12px;color:var(--text-3)">کل ساعات</div><div style="font-size:22px;font-weight:700">${fmtNum(totalHours)}</div></div></div>
          <div class="card"><div class="card-body"><div style="font-size:12px;color:var(--text-3)">تأییدشده</div><div style="font-size:22px;font-weight:700;color:var(--success)">${fmtNum(approvedHours)}</div></div></div>
          <div class="card"><div class="card-body"><div style="font-size:12px;color:var(--text-3)">منتظر تأیید</div><div style="font-size:22px;font-weight:700;color:var(--warning)">${fmtNum(s.timeEntries.filter(e => e.status === 'Submitted').length)}</div></div></div>
        </div>

        <div class="card mb-16">
          <div class="card-body">
            <div class="filter-bar">
              <select class="select" id="ts-status">
                <option value="">همه وضعیت‌ها</option>
                ${['Draft','Submitted','Approved','Rejected'].map(o => `<option ${statusFilter === o ? 'selected' : ''}>${o}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body tight">
            <div class="table-wrap">
              <table class="tbl">
                <thead><tr><th>کارمند</th><th>پروژه</th><th>تاریخ</th><th>ساعت</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                <tbody>${rows || `<tr><td colspan="6"><div class="tbl-empty">رکوردی یافت نشد.</div></td></tr>`}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    budget() {
      const s = Store.state;
      const totalBudget = s.projects.reduce((a, p) => a + p.financialBudget, 0);
      const totalCost = s.projects.reduce((a, p) => a + Metrics.projectActualCost(p.id), 0);
      const variance = totalBudget - totalCost;

      const rows = s.projects.map(p => {
        const cost = Metrics.projectActualCost(p.id);
        const var_ = (p.financialBudget || 0) - cost;
        const pct = Math.round((cost / (p.financialBudget || 1)) * 100);
        return `<tr>
          <td><div style="font-family:monospace;font-size:11px;color:var(--text-3)">${esc(p.code)}</div><div style="font-weight:600;font-size:13px">${esc(p.name)}</div></td>
          <td>${fmtMoney(p.financialBudget)}</td>
          <td>${fmtMoney(cost)}</td>
          <td style="color:var(--${var_ >= 0 ? 'success' : 'danger'})"><b>${fmtMoney(var_)}</b></td>
          <td style="min-width:140px">
            <div style="display:flex;align-items:center;gap:8px">
              ${UI.progressBar(Math.min(pct, 100), pct > 100 ? 'danger' : pct > 85 ? 'warning' : 'success')}
              <span style="font-size:11.5px">${fmtNum(pct)}٪</span>
            </div>
          </td>
          <td>${UI.statusBadge(p.status)}</td>
        </tr>`;
      }).join('');

      return `
        <div class="page-head"><div><h1>بودجه و هزینه</h1><p>تحلیل مالی پرتفوی پروژه‌ها</p></div></div>

        <div class="grid grid-4 mb-16">
          <div class="card"><div class="card-body"><div style="font-size:12px;color:var(--text-3)">بودجه کل</div><div style="font-size:22px;font-weight:700">${fmtMoney(totalBudget)}</div></div></div>
          <div class="card"><div class="card-body"><div style="font-size:12px;color:var(--text-3)">هزینه واقعی</div><div style="font-size:22px;font-weight:700">${fmtMoney(totalCost)}</div></div></div>
          <div class="card"><div class="card-body"><div style="font-size:12px;color:var(--text-3)">انحراف</div><div style="font-size:22px;font-weight:700;color:var(--${variance >= 0 ? 'success' : 'danger'})">${fmtMoney(variance)}</div></div></div>
          <div class="card"><div class="card-body"><div style="font-size:12px;color:var(--text-3)">درصد مصرف</div><div style="font-size:22px;font-weight:700">${fmtNum(Math.round(totalCost / (totalBudget || 1) * 100))}٪</div></div></div>
        </div>

        <div class="card">
          <div class="card-head"><h3>جزئیات بودجه پروژه‌ها</h3><p>هزینه نیروی انسانی از ساعات تأییدشده × نرخ محاسبه می‌شود</p></div>
          <div class="card-body tight">
            <div class="table-wrap">
              <table class="tbl">
                <thead><tr><th>پروژه</th><th>بودجه</th><th>هزینه واقعی</th><th>انحراف</th><th>مصرف</th><th>وضعیت</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    alerts() {
      const all = Alerts.derive();
      const active = all.filter(a => !isAlertDismissed(a.id));
      const dismissed = all.filter(a => isAlertDismissed(a.id));

      const sevMap = { high: 'danger', medium: 'warning', low: 'info' };
      const rows = active.map(a => `
        <div class="card mb-8" style="border-inline-start:3px solid var(--${sevMap[a.severity]})">
          <div class="card-body" style="padding:14px 16px">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:12px">
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span class="badge ${sevMap[a.severity]}">${esc(a.severity)}</span>
                  <span class="badge outline">${esc(a.rule)}</span>
                </div>
                <div style="font-weight:600;font-size:13.5px;margin-bottom:4px">${esc(a.title)}</div>
                <div style="font-size:12.5px;color:var(--text-2);margin-bottom:8px">${esc(a.message)}</div>
                <div style="font-size:11.5px;color:var(--text-3)">
                  دلایل: ${a.reason.map(r => esc(r)).join(' · ')}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px">
                ${a.projectId ? `<button class="btn btn-sm" data-go="#/projects/${a.projectId}">مشاهده پروژه</button>` : ''}
                ${a.employeeId ? `<button class="btn btn-sm" data-go="#/employees/${a.employeeId}">مشاهده کارمند</button>` : ''}
                <button class="btn btn-sm btn-ghost" data-dismiss="${a.id}">نادیده گرفتن</button>
              </div>
            </div>
          </div>
        </div>
      `).join('');

      return `
        <div class="page-head">
          <div><h1>هشدارها</h1><p>${fmtNum(active.length)} هشدار فعال — تولیدشده از قواعد سیستم</p></div>
        </div>
        ${active.length ? rows : `<div class="empty"><div class="emp-icon">${icon('check')}</div><h4>هشدار فعالی وجود ندارد</h4><p>همه شاخص‌ها در محدوده سالم هستند.</p></div>`}
        ${dismissed.length ? `<div style="margin-top:20px"><h3 style="font-size:13px;color:var(--text-3);margin-bottom:10px">نادیده گرفته‌شده (${fmtNum(dismissed.length)})</h3>${dismissed.map(a => `<div class="stat-line" style="opacity:.6"><span>${esc(a.title)}</span><span class="badge outline">${esc(a.rule)}</span></div>`).join('')}</div>` : ''}
      `;
    },

    reports() {
      const s = Store.state;
      const metrics = [
        { id: 'r1', title: 'وضعیت کارکنان', desc: 'توزیع کارکنان بر اساس وضعیت، دفتر و واحد', hash: '#/employees' },
        { id: 'r2', title: 'وضعیت پروژه‌ها', desc: 'خلاصه وضعیت و سلامت پروژه‌ها', hash: '#/projects' },
        { id: 'r3', title: 'ظرفیت منابع', desc: 'تحلیل تخصیص و ظرفیت', hash: '#/capacity' },
        { id: 'r4', title: 'مصرف زمان', desc: 'گزارش ساعات کار', hash: '#/timesheets' },
        { id: 'r5', title: 'بودجه و هزینه', desc: 'تحلیل مالی پروژه‌ها', hash: '#/budget' },
        { id: 'r6', title: 'جذب و استخدام', desc: 'قیف جذب و کاندیدها', hash: '#/recruitment' },
        { id: 'r7', title: 'پروژه‌های پرریسک', desc: 'پروژه‌های دارای هشدار', hash: '#/alerts' },
        { id: 'r8', title: 'تخصیص منابع', desc: 'Matrix تخصیص', hash: '#/capacity' }
      ];

      return `
        <div class="page-head"><div><h1>گزارش‌ها</h1><p>گزارش‌های تحلیلی از داده‌های سازمان</p></div></div>
        <div class="grid grid-3">${metrics.map(r => `
          <div class="card clickable" style="cursor:pointer" data-go="${r.hash}">
            <div class="card-body">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
                <div style="width:36px;height:36px;border-radius:9px;background:var(--primary-soft);color:var(--primary);display:grid;place-items:center">${icon('chart')}</div>
                <b style="font-size:14px">${esc(r.title)}</b>
              </div>
              <div style="font-size:12.5px;color:var(--text-2);margin-bottom:12px">${esc(r.desc)}</div>
              <button class="btn btn-sm btn-block">مشاهده گزارش</button>
            </div>
          </div>
        `).join('')}</div>
      `;
    },

    assistant() {
      const suggestions = [
        'کدام پروژه‌ها نیاز به توجه دارند؟',
        'کدام کارکنان بیش‌ازحد تخصیص داده شده‌اند؟',
        'چه کسانی آماده تخصیص هستند؟',
        'بیشترین انحراف بودجه مربوط به کدام پروژه است؟',
        'این هفته چه اقداماتی باید انجام شوند؟',
        'وضعیت کلی سازمان چگونه است؟'
      ];

      return `
        <div class="page-head">
          <div><h1>دستیار هوشمند</h1><p>پاسخ به سؤالات مدیریتی بر پایه داده‌های سامانه</p></div>
        </div>
        <div class="grid grid-dash">
          <div class="card">
            <div class="card-head"><h3>گفتگو</h3><p>پاسخ‌ها از داده‌های Demo تولید می‌شوند</p></div>
            <div class="card-body" id="chat-body" style="min-height:360px;max-height:520px;overflow-y:auto;display:flex;flex-direction:column;gap:14px">
              <div style="display:flex;gap:10px">
                <div class="avatar sm" style="background:var(--primary)">${icon('sparkles')}</div>
                <div style="background:var(--surface-2);padding:12px 14px;border-radius:10px;font-size:13px;max-width:80%">
                  سلام! من دستیار هوشمند سازمان هستم. می‌توانید درباره وضعیت پروژه‌ها، ظرفیت کارکنان، بودجه و اقدامات فوری سؤال بپرسید.
                </div>
              </div>
            </div>
            <div class="card-body" style="border-top:1px solid var(--border);padding-top:14px">
              <div style="display:flex;gap:8px">
                <input class="input" id="chat-input" placeholder="سؤال خود را بنویسید..." style="flex:1">
                <button class="btn btn-primary" id="chat-send">ارسال</button>
              </div>
            </div>
          </div>
          <div>
            <div class="card">
              <div class="card-head"><h3>سؤالات پیشنهادی</h3></div>
              <div class="card-body tight">
                ${suggestions.map(s => `<div class="stat-line clickable" style="cursor:pointer" data-q="${esc(s)}">${esc(s)}</div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    },

    settings() {
      const s = Store.state;
      const st = s.settings;
      return `
        <div class="page-head"><div><h1>تنظیمات</h1><p>پیکربندی سامانه</p></div></div>

        <div class="grid grid-2 mb-16">
          <div class="card">
            <div class="card-head"><h3>عمومی</h3></div>
            <div class="card-body">
              <label class="field"><span>نام شرکت</span><input class="input" id="set-company" value="${esc(st.companyName)}"></label>
              <label class="field"><span>واحد پول</span><select class="select" id="set-currency"><option ${st.currency === 'USD' ? 'selected' : ''}>USD</option><option ${st.currency === 'IRR' ? 'selected' : ''}>IRR</option><option ${st.currency === 'AED' ? 'selected' : ''}>AED</option></select></label>
              <label class="field"><span>منطقه زمانی</span><select class="select" id="set-tz"><option>Asia/Tehran</option><option>Asia/Dubai</option></select></label>
              <label class="field"><span>قالب تاریخ</span><select class="select" id="set-datefmt"><option value="jalali" ${st.dateFormat === 'jalali' ? 'selected' : ''}>شمسی</option><option value="gregorian" ${st.dateFormat === 'gregorian' ? 'selected' : ''}>میلادی</option></select></label>
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h3>ظاهر</h3></div>
            <div class="card-body">
              <label class="field"><span>تم</span>
                <div style="display:flex;gap:8px">
                  <button class="btn ${Store.state.ui.theme === 'light' ? 'btn-primary' : ''}" data-theme-set="light">${icon('sun')} روشن</button>
                  <button class="btn ${Store.state.ui.theme === 'dark' ? 'btn-primary' : ''}" data-theme-set="dark">${icon('moon')} تیره</button>
                </div>
              </label>
              <label class="field"><span>حالت Sidebar</span>
                <div style="display:flex;gap:8px">
                  <button class="btn" id="sb-expand">کامل</button>
                  <button class="btn" id="sb-collapse">جمع‌شده</button>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-head"><h3>مدیریت کارت‌های داشبورد</h3><p>کارت‌های بالای داشبورد را سفارشی کنید</p></div>
          <div class="card-body">
            <button class="btn btn-primary btn-sm" id="btn-manage-kpi">${icon('sliders')} مدیریت کارت‌ها</button>
            <button class="btn btn-sm" id="btn-reset-kpi">بازگردانی پیش‌فرض</button>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-head"><h3>آستانه هشدارها</h3></div>
          <div class="card-body">
            <div class="grid grid-2">
              <label class="field"><span>انحراف زمان (درصد)</span><input type="number" class="input" id="th-time" value="${st.alertThresholds.timeOverrunPct}"></label>
              <label class="field"><span>انحراف بودجه (درصد)</span><input type="number" class="input" id="th-budget" value="${st.alertThresholds.budgetOverrunPct}"></label>
              <label class="field"><span>آستانه Overallocation</span><input type="number" class="input" id="th-over" value="${st.alertThresholds.overallocationPct}"></label>
              <label class="field"><span>عدم پیشرفت (روز)</span><input type="number" class="input" id="th-noprog" value="${st.alertThresholds.noProgressDays}"></label>
            </div>
            <button class="btn btn-primary btn-sm" id="btn-save-th">ذخیره</button>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>پشتیبان‌گیری</h3><p>خروجی و بازنشانی داده‌های Demo</p></div>
          <div class="card-body">
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-sm" id="btn-export-json">${icon('download')} خروجی JSON</button>
              <button class="btn btn-sm btn-danger" id="btn-reset-all">${icon('trash')} بازنشانی کامل Demo</button>
            </div>
          </div>
        </div>
      `;
    },

    users() {
      const s = Store.state;
      const roles = ['CEO','Admin','HR','Project Manager','Finance','Employee'];
      const permissions = [
        'View Employees','Edit Employees','View Payroll','Manage Recruitment',
        'Create Project','Edit Project','Manage Assignment','Approve Timesheet',
        'View Finance','Manage Dashboard','View Audit'
      ];

      const rolePerm = {
        'CEO':            ['View Employees','Edit Employees','View Payroll','Manage Recruitment','Create Project','Edit Project','Manage Assignment','Approve Timesheet','View Finance','Manage Dashboard','View Audit'],
        'Admin':          ['View Employees','Edit Employees','Create Project','Edit Project','Manage Assignment','Manage Dashboard','View Audit'],
        'HR':             ['View Employees','Edit Employees','View Payroll','Manage Recruitment'],
        'Project Manager':['View Employees','Create Project','Edit Project','Manage Assignment','Approve Timesheet'],
        'Finance':        ['View Employees','View Payroll','View Finance','Approve Timesheet'],
        'Employee':       []
      };

      const userRows = s.users.map(u => `<tr>
        <td><div style="display:flex;align-items:center;gap:10px">${UI.avatar({ id: u.id, firstName: u.name.split(' ')[0], lastName: '', color: u.color }, 'sm')}<div><div style="font-weight:600;font-size:13px">${esc(u.name)}</div><div style="font-size:11.5px;color:var(--text-3)">@${esc(u.username)}</div></div></div></td>
        <td><span class="badge primary">${esc(u.role)}</span></td>
        <td>${esc(u.dataScope)}</td>
        <td>${esc(u.email)}</td>
      </tr>`).join('');

      return `
        <div class="page-head"><div><h1>کاربران و نقش‌ها</h1><p>مدیریت دسترسی‌ها و مجوزها</p></div></div>

        <div class="card mb-16">
          <div class="card-head"><h3>کاربران</h3><span class="badge outline">${fmtNum(s.users.length)}</span></div>
          <div class="card-body tight">
            <div class="table-wrap"><table class="tbl">
              <thead><tr><th>کاربر</th><th>نقش</th><th>حوزه دسترسی</th><th>ایمیل</th></tr></thead>
              <tbody>${userRows}</tbody>
            </table></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>ماتریس مجوزها</h3></div>
          <div class="card-body tight">
            <div class="table-wrap"><table class="tbl">
              <thead><tr><th>مجوز</th>${roles.map(r => `<th style="text-align:center">${esc(r)}</th>`).join('')}</tr></thead>
              <tbody>${permissions.map(p => `<tr>
                <td style="font-weight:600;font-size:12.5px">${esc(p)}</td>
                ${roles.map(r => `<td style="text-align:center">${rolePerm[r].includes(p) ? `<span style="color:var(--success)">${icon('check')}</span>` : `<span style="color:var(--text-3)">—</span>`}</td>`).join('')}
              </tr>`).join('')}</tbody>
            </table></div>
          </div>
        </div>
      `;
    },

    audit() {
      const s = Store.state;
      const rows = s.auditLog.slice(0, 100).map(l => `<tr>
        <td style="font-size:12px">${esc(l.actor)}<div style="font-size:11px;color:var(--text-3)">${esc(l.role)}</div></td>
        <td style="font-size:12px;white-space:nowrap">${jalali(l.timestamp, true)}</td>
        <td>${esc(l.action)}</td>
        <td><span class="badge outline">${esc(l.entity)}</span> <span style="font-family:monospace;font-size:11px;color:var(--text-3)">${esc(l.entityId)}</span></td>
        <td style="font-size:12px">${esc(l.source)}</td>
        <td style="font-size:12px;color:var(--text-3)">${esc(l.reason || '—')}</td>
        <td style="font-size:12px"><span style="color:var(--text-3)">${esc(l.before)}</span> → <b>${esc(l.after)}</b></td>
      </tr>`).join('');

      return `
        <div class="page-head"><div><h1>Audit Log</h1><p>ثبت تمام تغییرات مهم سامانه</p></div></div>
        <div class="card"><div class="card-body tight">
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>کاربر</th><th>زمان</th><th>عملیات</th><th>موجودیت</th><th>منبع</th><th>دلیل</th><th>قبل → بعد</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="7"><div class="tbl-empty">رکوردی ثبت نشده است.</div></td></tr>`}</tbody>
          </table></div>
        </div></div>
      `;
    },

    search() {
      return `<div class="page-head"><div><h1>جستجو</h1><p>${GlobalSearch.query ? 'نتایج برای: ' + esc(GlobalSearch.query) : 'جستجوی سراسری'}</p></div></div>${renderSearchResults()}`;
    },

    notFound() {
      return `<div class="empty"><div class="emp-icon">${icon('alert')}</div><h4>صفحه یافت نشد</h4><p>مسیر مورد نظر وجود ندارد.</p><a href="#/dashboard" class="btn btn-primary" style="margin-top:12px">بازگشت به داشبورد</a></div>`;
    }
  };

  /* =============================================================
     16. KPI CARD RENDERING
     ============================================================= */
  function renderKpiCard(card) {
    const value = Metrics.compute(card.metric);
    const formatted = Metrics.formatValue(value, card.format);
    const delta = Math.round((Math.random() - 0.4) * 12); // simulated delta
    const deltaCls = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const deltaIcon = delta > 0 ? icon('arrowUp') : delta < 0 ? icon('arrowDown') : '';

    let chart = '';
    if (card.chartVisible) {
      if (card.chartType === 'sparkline') {
        const values = Array.from({ length: 12 }, (_, i) => value * (0.7 + Math.sin(i / 2) * 0.15 + Math.random() * 0.2));
        chart = Charts.sparkline(values, 'var(--' + (card.color || 'primary') + ')');
      } else if (card.chartType === 'bar') {
        const values = Array.from({ length: 8 }, () => Math.random() * value);
        chart = Charts.bars(values, 'var(--' + (card.color || 'primary') + ')');
      } else if (card.chartType === 'progress') {
        chart = `<div class="k-bar"><i style="width:${Math.min(value, 100)}%;background:var(--${card.color || 'primary'})"></i></div>`;
      }
    }

    return `<div class="kpi" data-color="${card.color || 'primary'}" data-metric="${card.metric}" data-drill="${card.drilldown || ''}" title="${esc(card.title)}">
      <div class="k-top">
        <div class="k-title">${esc(card.title)}</div>
        <div class="k-icon">${icon(card.icon || 'grid')}</div>
      </div>
      <div class="k-value">${formatted}</div>
      <div class="k-delta ${deltaCls}">${deltaIcon} ${fmtNum(Math.abs(delta))}٪ نسبت به دوره قبل</div>
      ${chart ? `<div class="k-chart">${chart}</div>` : ''}
    </div>`;
  }

  /* =============================================================
     17. KPI MANAGEMENT MODAL
     ============================================================= */
  function openKpiManager() {
    const s = Store.state;
    const metricsList = [
      { id: 'activeEmployees', label: 'کارکنان فعال' },
      { id: 'activeProjects', label: 'پروژه‌های فعال' },
      { id: 'availableEmployees', label: 'آماده تخصیص' },
      { id: 'utilization', label: 'ظرفیت مصرف‌شده' },
      { id: 'actualHours', label: 'ساعات تأییدشده' },
      { id: 'portfolioBudget', label: 'ارزش پرتفوی' },
      { id: 'atRiskProjects', label: 'پروژه‌های پرریسک' },
      { id: 'overallocated', label: 'کارکنان Overallocated' },
      { id: 'pendingTimesheets', label: 'Timesheet منتظر' },
      { id: 'candidates', label: 'کاندیدهای فعال' },
      { id: 'avgProgress', label: 'میانگین پیشرفت' }
    ];
    const icons = ['users','folder','userCheck','gauge','clock','dollar','alert','chart','calendar','award','layers'];
    const formats = ['number','percent','money','hours'];
    const chartTypes = ['sparkline','bar','progress','none'];

    const renderList = () => s.kpiCards.slice().sort((a, b) => a.order - b.order).map((c, idx) => `
      <div class="card mb-8" draggable="true" data-kid="${c.id}" style="cursor:grab">
        <div class="card-body" style="padding:12px 14px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span style="color:var(--text-3);cursor:grab">⋮⋮</span>
            <input class="input" style="flex:1" value="${esc(c.title)}" data-kfield="title" data-kid="${c.id}">
            <label class="checkbox"><input type="checkbox" ${c.visible ? 'checked' : ''} data-kfield="visible" data-kid="${c.id}"> نمایش</label>
            <button class="btn btn-sm btn-ghost" data-kdel="${c.id}">${icon('trash')}</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">
            <select class="select" data-kfield="metric" data-kid="${c.id}">${metricsList.map(m => `<option value="${m.id}" ${c.metric === m.id ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
            <select class="select" data-kfield="icon" data-kid="${c.id}">${icons.map(ic => `<option value="${ic}" ${c.icon === ic ? 'selected' : ''}>${ic}</option>`).join('')}</select>
            <select class="select" data-kfield="format" data-kid="${c.id}">${formats.map(f => `<option value="${f}" ${c.format === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
            <select class="select" data-kfield="chartType" data-kid="${c.id}">${chartTypes.map(f => `<option value="${f}" ${c.chartType === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
          </div>
        </div>
      </div>
    `).join('');

    Modal.open({
      title: 'مدیریت کارت‌های داشبورد',
      wide: true,
      body: `
        <p style="font-size:12.5px;color:var(--text-3);margin:0 0 14px">با کشیدن و رها کردن، ترتیب کارت‌ها را تغییر دهید. تغییرات بلافاصله ذخیره می‌شوند.</p>
        <div id="kpi-list">${renderList()}</div>
        <button class="btn btn-sm btn-block mt-16" id="kpi-add">${icon('plus')} افزودن کارت جدید</button>
      `,
      footer: `<button class="btn" data-close>بستن</button><button class="btn btn-primary" id="kpi-done">ذخیره و بازگشت</button>`,
      onMount: (modal, close) => {
        const bind = () => {
          modal.querySelectorAll('[data-kfield]').forEach(inp => {
            inp.addEventListener('change', () => {
              const id = inp.dataset.kid, f = inp.dataset.kfield;
              const c = s.kpiCards.find(x => x.id === id);
              if (!c) return;
              if (inp.type === 'checkbox') c[f] = inp.checked;
              else c[f] = inp.value;
              Store.save();
            });
          });
          modal.querySelectorAll('[data-kdel]').forEach(btn => {
            btn.addEventListener('click', () => {
              const id = btn.dataset.kdel;
              s.kpiCards = s.kpiCards.filter(x => x.id !== id);
              Store.save();
              modal.querySelector('#kpi-list').innerHTML = renderList();
              bind();
              Router.resolve();
            });
          });
        };
        bind();

        // drag & drop
        let dragId = null;
        const list = modal.querySelector('#kpi-list');
        list.addEventListener('dragstart', e => {
          const card = e.target.closest('[data-kid]');
          if (!card) return;
          dragId = card.dataset.kid;
          card.style.opacity = '.4';
        });
        list.addEventListener('dragend', e => {
          const card = e.target.closest('[data-kid]');
          if (card) card.style.opacity = '1';
        });
        list.addEventListener('dragover', e => {
          e.preventDefault();
          const over = e.target.closest('[data-kid]');
          if (!over) return;
          const overId = over.dataset.kid;
          if (overId === dragId) return;
          const from = s.kpiCards.find(c => c.id === dragId);
          const to = s.kpiCards.find(c => c.id === overId);
          if (!from || !to) return;
          const tmp = from.order; from.order = to.order; to.order = tmp;
          Store.save();
          list.innerHTML = renderList();
          bind();
        });

        modal.querySelector('#kpi-add').addEventListener('click', () => {
          s.kpiCards.push({
            id: 'k' + Date.now(), title: 'کارت جدید', metric: 'activeEmployees',
            visible: true, order: s.kpiCards.length + 1,
            chartType: 'sparkline', chartVisible: true, icon: 'grid', format: 'number',
            comparePeriod: 'prev', drilldown: '', color: 'primary'
          });
          Store.save();
          list.innerHTML = renderList();
          bind();
        });

        modal.querySelector('#kpi-done').addEventListener('click', () => { close(); Router.resolve(); });
        modal.querySelector('[data-close]').addEventListener('click', () => { close(); Router.resolve(); });
      }
    });
  }

  /* =============================================================
     18. EMPLOYEE DETAIL DRAWER
     ============================================================= */
  function openEmployeeDrawer(id) {
    const s = Store.state;
    const e = s.employees.find(x => x.id === id);
    if (!e) return;
    const manager = s.employees.find(x => x.id === e.managerId);
    const assignments = s.assignments.filter(a => a.employeeId === id);
    const timeEntries = s.timeEntries.filter(t => t.employeeId === id);
    const approvedHours = timeEntries.filter(t => t.status === 'Approved').reduce((a, b) => a + b.hours, 0);
    const submittedHours = timeEntries.filter(t => t.status === 'Submitted').reduce((a, b) => a + b.hours, 0);
    const draftHours = timeEntries.filter(t => t.status === 'Draft').reduce((a, b) => a + b.hours, 0);
    const alloc = Metrics.totalAllocation(id);

    const tabs = ['Overview','Employment','Skills','Projects','Capacity','Time','Payroll','History'];
    let activeTab = 'Overview';

    const renderTab = (tab) => {
      switch (tab) {
        case 'Overview':
          return `
            <div class="kv"><span>نام و نام خانوادگی</span><span><b>${esc(e.firstName + ' ' + e.lastName)}</b></span></div>
            <div class="kv"><span>سمت</span><span>${esc(e.position)}</span></div>
            <div class="kv"><span>واحد سازمانی</span><span>${esc(e.orgUnit)}</span></div>
            <div class="kv"><span>دفتر</span><span>${esc(e.office)} — ${esc(e.country)}</span></div>
            <div class="kv"><span>وضعیت</span><span>${UI.statusBadge(e.status)}</span></div>
            <div class="kv"><span>نوع استخدام</span><span>${esc(e.employmentType)}</span></div>
            <div class="kv"><span>مدیر مستقیم</span><span>${manager ? esc(manager.firstName + ' ' + manager.lastName) : '—'}</span></div>
            <div class="kv"><span>کد پرسنلی</span><span>${esc(e.personnelCode)}</span></div>
            <div class="kv"><span>کد ملی</span><span>${esc(e.nationalId)}</span></div>
            <div class="kv"><span>ایمیل</span><span>${esc(e.email)}</span></div>
            <div class="kv"><span>تلفن</span><span>${esc(e.phone)}</span></div>
            <div class="kv"><span>مجموع تخصیص</span><span><b>${fmtNum(alloc)}٪</b></span></div>
          `;
        case 'Employment':
          return `
            <div class="kv"><span>تاریخ شروع</span><span>${jalali(e.startDate)}</span></div>
            <div class="kv"><span>تاریخ پایان</span><span>${e.endDate ? jalali(e.endDate) : '—'}</span></div>
            <div class="kv"><span>نوع استخدام</span><span>${esc(e.employmentType)}</span></div>
            <div class="kv"><span>سابقه در سازمان</span><span>${fmtNum(Math.round((new Date() - new Date(e.startDate)) / (365 * 86400000)))} سال</span></div>
            <div class="kv"><span>ساعت کاری هفتگی</span><span>${fmtNum(e.weeklyCapacity)} ساعت</span></div>
          `;
        case 'Skills':
          return e.skills.length ? e.skills.map(sk => `
            <div class="stat-line">
              <span>${esc(sk.name)}</span>
              <span><b>سطح ${fmtNum(sk.level)}/۵</b> · ${fmtNum(sk.exp)} سال</span>
            </div>
          `).join('') : '<div class="empty"><p>مهارتی ثبت نشده است.</p></div>';
        case 'Projects':
          return assignments.length ? `
            <div class="table-wrap"><table class="tbl">
              <thead><tr><th>پروژه</th><th>نقش</th><th>تخصیص</th><th>شروع</th><th>پایان</th><th>وضعیت</th></tr></thead>
              <tbody>${assignments.map(a => {
                const p = s.projects.find(x => x.id === a.projectId);
                return `<tr><td>${p ? esc(p.name) : '—'}</td><td>${esc(a.role)}</td><td>${fmtNum(a.allocation)}٪</td><td>${jalali(a.start)}</td><td>${jalali(a.end)}</td><td>${UI.statusBadge(a.status)}</td></tr>`;
              }).join('')}</tbody>
            </table></div>` : '<div class="empty"><p>در پروژه‌ای تخصیص نیافته است.</p></div>';
        case 'Capacity': {
          const remaining = Math.max(0, 100 - alloc);
          const cls = alloc > 100 ? 'danger' : alloc > 85 ? 'warning' : 'success';
          return `
            <div class="kv"><span>ظرفیت هفتگی</span><span>${fmtNum(e.weeklyCapacity)} ساعت</span></div>
            <div class="kv"><span>تخصیص‌یافته</span><span><b>${fmtNum(alloc)}٪</b></span></div>
            <div class="kv"><span>آزاد</span><span>${fmtNum(remaining)}٪</span></div>
            <div style="margin-top:12px">${UI.progressBar(Math.min(alloc, 100), cls)}</div>
            <div style="text-align:center;margin-top:10px">
              <span class="badge ${cls}">${alloc > 100 ? 'Overallocated' : alloc > 85 ? 'Warning' : 'Safe'}</span>
            </div>
          `;
        }
        case 'Time':
          return `
            <div class="kv"><span>ساعات تأییدشده</span><span><b>${fmtNum(approvedHours)}</b></span></div>
            <div class="kv"><span>ساعات منتظر تأیید</span><span>${fmtNum(submittedHours)}</span></div>
            <div class="kv"><span>ساعات پیش‌نویس</span><span>${fmtNum(draftHours)}</span></div>
            <div class="kv"><span>مجموع</span><span><b>${fmtNum(approvedHours + submittedHours + draftHours)} ساعت</b></span></div>
          `;
        case 'Payroll': {
          const p = e.payroll;
          const totalBenefits = p.taxableBenefits + p.nonTaxableBenefits;
          const net = p.baseSalary + totalBenefits - p.deductions;
          return `
            <div class="kv"><span>روزهای کارکرد</span><span>${fmtNum(p.daysWorked)}</span></div>
            <div class="kv"><span>حقوق پایه</span><span>${fmtMoney(p.baseSalary)}</span></div>
            <div class="kv"><span>مزایای مشمول</span><span>${fmtMoney(p.taxableBenefits)}</span></div>
            <div class="kv"><span>مزایای غیرمشمول</span><span>${fmtMoney(p.nonTaxableBenefits)}</span></div>
            <div class="kv"><span>جمع مزایا</span><span>${fmtMoney(totalBenefits)}</span></div>
            <div class="kv"><span>کسورات</span><span style="color:var(--danger)">${fmtMoney(p.deductions)}</span></div>
            <div class="stat-line" style="border-top:2px solid var(--border);margin-top:8px;padding-top:12px">
              <span style="font-weight:600">خالص پرداختنی</span>
              <span style="font-size:16px;font-weight:700;color:var(--primary)">${fmtMoney(net)}</span>
            </div>
          `;
        }
        case 'History': {
          const events = [
            { date: e.startDate, title: 'شروع به کار', type: 'success' },
            { date: daysBefore(e.startDate, 30), title: 'طی مراحل مصاحبه', type: '' },
            { date: daysBefore(e.startDate, 45), title: 'ثبت به عنوان کاندید', type: '' }
          ];
          assignments.forEach(a => {
            events.push({ date: a.start, title: `تخصیص به ${s.projects.find(p => p.id === a.projectId)?.name || 'پروژه'}`, type: 'success' });
          });
          events.sort((a, b) => new Date(b.date) - new Date(a.date));
          return `<div class="timeline">${events.map(ev => `
            <div class="tl-item ${ev.type}">
              <div class="tl-time">${jalali(ev.date)}</div>
              <div class="tl-title">${esc(ev.title)}</div>
            </div>
          `).join('')}</div>`;
        }
        default: return '';
      }
    };

    Drawer.open({
      title: e.firstName + ' ' + e.lastName,
      subtitle: `${esc(e.position)} · ${esc(e.office)}`,
      body: `
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          ${UI.avatar(e, 'lg')}
          <div>
            <div style="font-weight:700;font-size:16px">${esc(e.firstName + ' ' + e.lastName)}</div>
            <div style="color:var(--text-3);font-size:12.5px;margin-top:2px">${esc(e.position)}</div>
            <div style="margin-top:6px">${UI.statusBadge(e.status)} <span class="badge outline">${esc(e.office)}</span></div>
          </div>
        </div>
        <div class="tabs" id="emp-tabs">
          ${tabs.map(t => `<div class="tab ${t === activeTab ? 'active' : ''}" data-tab="${t}">${esc(t)}</div>`).join('')}
        </div>
        <div id="emp-tab-body" style="margin-top:18px">${renderTab(activeTab)}</div>
      `,
      footer: `<button class="btn" data-close2>بستن</button><button class="btn btn-primary" id="emp-edit">${icon('edit')} ویرایش</button>`,
      onMount: (el, close) => {
        el.querySelectorAll('[data-tab]').forEach(t => t.addEventListener('click', () => {
          activeTab = t.dataset.tab;
          el.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === activeTab));
          el.querySelector('#emp-tab-body').innerHTML = renderTab(activeTab);
        }));
        el.querySelector('[data-close2]').addEventListener('click', close);
        el.querySelector('#emp-edit').addEventListener('click', () => { close(); openEmployeeEditModal(id); });
      }
    });
  }

  function daysBefore(iso, n) {
    const d = new Date(iso); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
  }

  function openEmployeeEditModal(id) {
    const s = Store.state;
    const e = s.employees.find(x => x.id === id);
    if (!e) return;
    Modal.open({
      title: 'ویرایش کارمند',
      body: `
        <div class="grid grid-2">
          <label class="field"><span>نام</span><input class="input" id="e-first" value="${esc(e.firstName)}"></label>
          <label class="field"><span>نام خانوادگی</span><input class="input" id="e-last" value="${esc(e.lastName)}"></label>
          <label class="field"><span>سمت</span><input class="input" id="e-pos" value="${esc(e.position)}"></label>
          <label class="field"><span>واحد سازمانی</span><input class="input" id="e-org" value="${esc(e.orgUnit)}"></label>
          <label class="field"><span>دفتر</span><select class="select" id="e-office">${s.offices.map(o => `<option ${e.office === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>
          <label class="field"><span>وضعیت</span><select class="select" id="e-status">${s.employeeStatuses.map(o => `<option ${e.status === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>
          <label class="field"><span>نوع استخدام</span><select class="select" id="e-type">${s.employmentTypes.map(o => `<option ${e.employmentType === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>
          <label class="field"><span>ساعت کاری هفتگی</span><input type="number" class="input" id="e-cap" value="${e.weeklyCapacity}"></label>
          <label class="field"><span>نرخ ساعتی ($)</span><input type="number" class="input" id="e-rate" value="${e.hourlyCost}"></label>
          <label class="field"><span>ایمیل</span><input class="input" id="e-email" value="${esc(e.email)}"></label>
          <label class="field"><span>تلفن</span><input class="input" id="e-phone" value="${esc(e.phone)}"></label>
        </div>
      `,
      footer: `<button class="btn" data-close3>انصراف</button><button class="btn btn-primary" id="e-save">ذخیره تغییرات</button>`,
      onMount: (el, close) => {
        el.querySelector('[data-close3]').addEventListener('click', close);
        el.querySelector('#e-save').addEventListener('click', () => {
          const before = { status: e.status, position: e.position, office: e.office };
          e.firstName = el.querySelector('#e-first').value;
          e.lastName = el.querySelector('#e-last').value;
          e.position = el.querySelector('#e-pos').value;
          e.orgUnit = el.querySelector('#e-org').value;
          e.office = el.querySelector('#e-office').value;
          e.status = el.querySelector('#e-status').value;
          e.employmentType = el.querySelector('#e-type').value;
          e.weeklyCapacity = Number(el.querySelector('#e-cap').value);
          e.hourlyCost = Number(el.querySelector('#e-rate').value);
          e.email = el.querySelector('#e-email').value;
          e.phone = el.querySelector('#e-phone').value;
          pushAudit('ویرایش کارمند', 'Employee', e.id,
            `وضعیت: ${before.status}`, `وضعیت: ${e.status}`, 'ویرایش دستی از UI');
          Store.save();
          close();
          Router.resolve();
          UI.toast('تغییرات ذخیره شد', 'success');
        });
      }
    });
  }

  /* =============================================================
     19. TASK BOARD DRAG & DROP
     ============================================================= */
  function initTaskBoard() {
    const cards = $$('.kcard');
    const cols = $$('.kcol-body');
    let dragId = null;

    cards.forEach(c => {
      c.addEventListener('dragstart', e => {
        dragId = c.dataset.task;
        c.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      c.addEventListener('dragend', () => c.classList.remove('dragging'));
    });

    cols.forEach(col => {
      col.addEventListener('dragover', e => {
        e.preventDefault();
        col.parentElement.classList.add('drag-over');
      });
      col.addEventListener('dragleave', () => col.parentElement.classList.remove('drag-over'));
      col.addEventListener('drop', e => {
        e.preventDefault();
        col.parentElement.classList.remove('drag-over');
        if (!dragId) return;
        const newStatus = col.dataset.drop;
        const task = Store.state.tasks.find(t => t.id === dragId);
        if (!task || task.status === newStatus) return;
        const before = task.status;
        task.status = newStatus;
        task.history = task.history || [];
        task.history.push({ date: todayISO(), status: newStatus, by: Store.state.session.name });
        pushAudit('تغییر وضعیت تسک', 'Task', task.id, before, newStatus, 'Drag & Drop در Kanban');
        Store.save();
        Router.resolve();
        UI.toast(`وضعیت تسک به «${newStatus}» تغییر کرد`, 'success');
      });
    });
  }

  /* =============================================================
     20. ROUTER
     ============================================================= */
  const Router = {
    routes: [
      { pattern: '/dashboard', handler: () => Pages.dashboard() },
      { pattern: '/employees', handler: () => Pages.employees() },
      { pattern: '/recruitment', handler: () => Pages.recruitment() },
      { pattern: '/interviews', handler: () => Pages.interviews() },
      { pattern: '/skills', handler: () => Pages.skills() },
      { pattern: '/capacity', handler: () => Pages.capacity() },
      { pattern: '/projects', handler: () => Pages.projects() },
      { pattern: '/projects/:id', handler: (p) => Pages.projectDetail(p.id) },
      { pattern: '/tasks', handler: () => Pages.tasks() },
      { pattern: '/timesheets', handler: () => Pages.timesheets() },
      { pattern: '/budget', handler: () => Pages.budget() },
      { pattern: '/reports', handler: () => Pages.reports() },
      { pattern: '/alerts', handler: () => Pages.alerts() },
      { pattern: '/assistant', handler: () => Pages.assistant() },
      { pattern: '/settings', handler: () => Pages.settings() },
      { pattern: '/users', handler: () => Pages.users() },
      { pattern: '/audit', handler: () => Pages.audit() },
      { pattern: '/search', handler: () => Pages.search() }
    ],
    resolve() {
      const hash = location.hash.replace(/^#/, '') || '/dashboard';
      const parts = hash.split('/').filter(Boolean);
      for (const r of this.routes) {
        const rp = r.pattern.split('/').filter(Boolean);
        if (rp.length !== parts.length) continue;
        const params = {};
        let ok = true;
        for (let i = 0; i < rp.length; i++) {
          if (rp[i].startsWith(':')) params[rp[i].slice(1)] = decodeURIComponent(parts[i]);
          else if (rp[i] !== parts[i]) { ok = false; break; }
        }
        if (ok) {
          const html = r.handler(params, hash);
          if (html === null) return;
          $('#content').innerHTML = html;
          renderSidebar();
          renderHeader();
          bindPageEvents(hash);
          window.scrollTo(0, 0);
          return;
        }
      }
      $('#content').innerHTML = Pages.notFound();
    },
    init() {
      window.addEventListener('hashchange', () => this.resolve());
    }
  };

  function parseQuery() {
    const hash = location.hash;
    const qi = hash.indexOf('?');
    if (qi < 0) return {};
    const qs = hash.slice(qi + 1);
    const out = {};
    qs.split('&').forEach(p => {
      const [k, v] = p.split('=');
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return out;
  }

  function bindPageEvents(hash) {
    // Generic click-to-navigate
    $$('[data-go]').forEach(el => el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      location.hash = el.dataset.go;
    }));

    // KPI cards drilldown
    $$('.kpi').forEach(el => el.addEventListener('click', () => {
      if (el.dataset.drill) location.hash = el.dataset.drill;
    }));

    // Dashboard
    const btnManage = $('#btn-manage-cards'); if (btnManage) btnManage.addEventListener('click', openKpiManager);
    const btnExportDash = $('#btn-export-dash'); if (btnExportDash) btnExportDash.addEventListener('click', () => exportJSON('dashboard', {
      metrics: Store.state.kpiCards.map(c => ({ title: c.title, metric: c.metric, value: Metrics.compute(c.metric) }))
    }));

    // Employees
    const empQ = $('#f-q');
    if (empQ) {
      const apply = () => {
        const params = new URLSearchParams();
        const v = (id) => ($(id) ? $(id).value : '');
        if (v('#f-q')) params.set('q', v('#f-q'));
        if (v('#f-office')) params.set('office', v('#f-office'));
        if (v('#f-org')) params.set('org', v('#f-org'));
        if (v('#f-status')) params.set('status', v('#f-status'));
        if (v('#f-type')) params.set('type', v('#f-type'));
        const qs = params.toString();
        location.hash = '#/employees' + (qs ? '?' + qs : '');
      };
      ['#f-q','#f-office','#f-org','#f-status','#f-type'].forEach(sel => {
        const el = $(sel); if (!el) return;
        el.addEventListener(sel === '#f-q' ? 'input' : 'change', () => {
          clearTimeout(window.__empTimer);
          window.__empTimer = setTimeout(apply, sel === '#f-q' ? 300 : 0);
        });
      });
      const clr = $('#f-clear'); if (clr) clr.addEventListener('click', () => location.hash = '#/employees');
    }
    $$('[data-page]').forEach(b => b.addEventListener('click', () => {
      const params = parseQuery();
      const q = new URLSearchParams(params);
      q.set('page', b.dataset.page);
      location.hash = '#/employees?' + q.toString();
    }));
    $$('tr[data-id]').forEach(tr => tr.addEventListener('click', (ev) => {
      if (ev.target.closest('button')) return;
      openEmployeeDrawer(tr.dataset.id);
    }));
    $$('[data-view]').forEach(b => b.addEventListener('click', (ev) => { ev.stopPropagation(); openEmployeeDrawer(b.dataset.view); }));
    $$('[data-edit]').forEach(b => b.addEventListener('click', (ev) => { ev.stopPropagation(); openEmployeeEditModal(b.dataset.edit); }));
    const btnAddEmp = $('#btn-add-emp'); if (btnAddEmp) btnAddEmp.addEventListener('click', openAddEmployeeModal);
    const btnExpEmp = $('#btn-export-emp'); if (btnExpEmp) btnExpEmp.addEventListener('click', () => exportCSV('employees', Store.state.employees));

    // Projects
    const pStatus = $('#p-status'); if (pStatus) pStatus.addEventListener('change', () => {
      const params = new URLSearchParams(parseQuery()); params.set('status', pStatus.value);
      location.hash = '#/projects?' + params.toString();
    });
    const pClient = $('#p-client'); if (pClient) pClient.addEventListener('change', () => {
      const params = new URLSearchParams(parseQuery()); params.set('client', pClient.value);
      location.hash = '#/projects?' + params.toString();
    });
    const vt = $('#view-toggle'); if (vt) vt.addEventListener('click', () => {
      const params = new URLSearchParams(parseQuery());
      params.set('view', params.get('view') === 'card' ? 'table' : 'card');
      location.hash = '#/projects?' + params.toString();
    });
    $$('[data-pid]').forEach(el => el.addEventListener('click', () => { location.hash = '#/projects/' + el.dataset.pid; }));
    const btnAddProject = $('#btn-add-project'); if (btnAddProject) btnAddProject.addEventListener('click', () => UI.toast('در نسخه نمایشی، افزودن پروژه از طریق API واقعی انجام می‌شود.', 'info'));

    // Tasks
    if (hash.startsWith('/tasks')) initTaskBoard();
    const btnAddTask = $('#btn-add-task'); if (btnAddTask) btnAddTask.addEventListener('click', () => UI.toast('در نسخه نمایشی، افزودن تسک از طریق API واقعی انجام می‌شود.', 'info'));

    // Timesheets
    const tsStatus = $('#ts-status'); if (tsStatus) tsStatus.addEventListener('change', () => {
      location.hash = '#/timesheets' + (tsStatus.value ? '?status=' + tsStatus.value : '');
    });
    $$('[data-approve]').forEach(b => b.addEventListener('click', () => {
      const t = Store.state.timeEntries.find(x => x.id === b.dataset.approve);
      if (!t) return;
      const before = t.status;
      t.status = 'Approved';
      pushAudit('تأیید Timesheet', 'TimeEntry', t.id, before, 'Approved', 'تأیید دستی');
      Store.save();
      Router.resolve();
      UI.toast('Timesheet تأیید شد', 'success');
    }));
    const btnExpTs = $('#btn-export-ts'); if (btnExpTs) btnExpTs.addEventListener('click', () => exportCSV('timesheets', Store.state.timeEntries));

    // Recruitment
    const btnAddCand = $('#btn-add-cand'); if (btnAddCand) btnAddCand.addEventListener('click', () => UI.toast('در نسخه نمایشی، افزودن کاندید از طریق API واقعی انجام می‌شود.', 'info'));
    $$('tr[data-cid]').forEach(tr => tr.addEventListener('click', () => openCandidateDrawer(tr.dataset.cid)));

    // Alerts
    $$('[data-dismiss]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.dismiss;
      Store.state.alertState[id] = Store.state.alertState[id] || {};
      Store.state.alertState[id].dismissed = true;
      Store.save();
      Router.resolve();
      UI.toast('هشدار نادیده گرفته شد', 'success');
    }));

    // Assistant
    initAssistant();

    // Settings
    initSettings();
  }

  /* =============================================================
     21. ADD EMPLOYEE
     ============================================================= */
  function openAddEmployeeModal() {
    const s = Store.state;
    Modal.open({
      title: 'افزودن کارمند',
      body: `
        <div class="grid grid-2">
          <label class="field"><span>نام</span><input class="input" id="n-first"></label>
          <label class="field"><span>نام خانوادگی</span><input class="input" id="n-last"></label>
          <label class="field"><span>سمت</span><input class="input" id="n-pos" placeholder="مثلاً Python Engineer"></label>
          <label class="field"><span>واحد سازمانی</span><select class="select" id="n-org">${s.orgUnits.map(o => `<option>${esc(o)}</option>`).join('')}</select></label>
          <label class="field"><span>دفتر</span><select class="select" id="n-office">${s.offices.map(o => `<option>${esc(o)}</option>`).join('')}</select></label>
          <label class="field"><span>نوع استخدام</span><select class="select" id="n-type">${s.employmentTypes.map(o => `<option>${esc(o)}</option>`).join('')}</select></label>
          <label class="field"><span>وضعیت</span><select class="select" id="n-status">${s.employeeStatuses.map(o => `<option>${esc(o)}</option>`).join('')}</select></label>
          <label class="field"><span>ظرفیت هفتگی</span><input type="number" class="input" id="n-cap" value="40"></label>
          <label class="field"><span>نرخ ساعتی ($)</span><input type="number" class="input" id="n-rate" value="15"></label>
          <label class="field"><span>ایمیل</span><input class="input" id="n-email"></label>
        </div>
      `,
      footer: `<button class="btn" data-close>انصراف</button><button class="btn btn-primary" id="n-save">افزودن</button>`,
      onMount: (el, close) => {
        el.querySelector('[data-close]').addEventListener('click', close);
        el.querySelector('#n-save').addEventListener('click', () => {
          const first = el.querySelector('#n-first').value.trim();
          const last = el.querySelector('#n-last').value.trim();
          if (!first || !last) { UI.toast('نام و نام خانوادگی الزامی است', 'danger'); return; }
          const newId = 'E-' + String(s.employees.length + 1).padStart(3, '0');
          const emp = {
            id: newId, personnelCode: String(1000 + s.employees.length + 1), nationalId: '—',
            firstName: first, lastName: last,
            email: el.querySelector('#n-email').value || (first + '.' + last + '@parsai.ir'),
            phone: '—',
            office: el.querySelector('#n-office').value,
            country: el.querySelector('#n-office').value === 'دبی' ? 'امارات' : 'ایران',
            orgUnit: el.querySelector('#n-org').value,
            position: el.querySelector('#n-pos').value || '—',
            employmentType: el.querySelector('#n-type').value,
            startDate: todayISO(), endDate: null,
            status: el.querySelector('#n-status').value,
            managerId: null,
            weeklyCapacity: Number(el.querySelector('#n-cap').value) || 40,
            hourlyCost: Number(el.querySelector('#n-rate').value) || 15,
            skills: [],
            payroll: { daysWorked: 0, baseSalary: 0, taxableBenefits: 0, nonTaxableBenefits: 0, deductions: 0 }
          };
          s.employees.push(emp);
          pushAudit('افزودن کارمند', 'Employee', emp.id, '—', first + ' ' + last, 'ایجاد دستی');
          Store.save();
          close();
          Router.resolve();
          UI.toast('کارمند جدید اضافه شد', 'success');
        });
      }
    });
  }

  /* =============================================================
     22. CANDIDATE DRAWER
     ============================================================= */
  function openCandidateDrawer(id) {
    const s = Store.state;
    const c = s.candidates.find(x => x.id === id);
    if (!c) return;
    const ivs = s.interviews.filter(i => i.candidateId === id);
    Drawer.open({
      title: c.name,
      subtitle: c.position + ' · ' + c.source,
      body: `
        <div class="kv"><span>وضعیت</span><span>${UI.statusBadge(c.status)}</span></div>
        <div class="kv"><span>تماس</span><span>${esc(c.contact)}</span></div>
        <div class="kv"><span>موقعیت</span><span>${esc(c.position)}</span></div>
        <div class="kv"><span>منبع</span><span>${esc(c.source)}</span></div>
        <div class="kv"><span>تاریخ ایجاد</span><span>${jalali(c.createdDate)}</span></div>
        <div class="kv"><span>مهارت‌ها</span><span>${c.skills.map(s => `<span class="chip">${esc(s)}</span>`).join(' ')}</span></div>

        <h4 style="margin:20px 0 10px;font-size:14px">مصاحبه‌ها</h4>
        ${ivs.length ? ivs.map(i => `
          <div class="card mb-8"><div class="card-body" style="padding:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <b>${esc(i.type)}</b>
              <span class="badge ${i.result === 'Pass' ? 'success' : 'danger'}">${fmtNum(i.score)}</span>
            </div>
            <div style="font-size:11.5px;color:var(--text-3);margin-bottom:6px">${jalali(i.date)}</div>
            <div style="font-size:12.5px">${esc(i.notes || '—')}</div>
          </div></div>
        `).join('') : '<p style="color:var(--text-3);font-size:12.5px">مصاحبه‌ای ثبت نشده است.</p>'}
      `,
      footer: `<button class="btn" data-close>بستن</button>`,
      onMount: (el, close) => el.querySelector('[data-close]').addEventListener('click', close)
    });
  }

  /* =============================================================
     23. ASSISTANT
     ============================================================= */
  function initAssistant() {
    const input = $('#chat-input');
    const send = $('#chat-send');
    const body = $('#chat-body');
    if (!input || !send) return;

    const ask = (q) => {
      if (!q.trim()) return;
      body.insertAdjacentHTML('beforeend', `
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <div style="background:var(--primary);color:#fff;padding:12px 14px;border-radius:10px;font-size:13px;max-width:80%">${esc(q)}</div>
        </div>
      `);
      body.scrollTop = body.scrollHeight;

      setTimeout(() => {
        const answer = generateAnswer(q);
        body.insertAdjacentHTML('beforeend', `
          <div style="display:flex;gap:10px">
            <div class="avatar sm" style="background:var(--primary)">${icon('sparkles')}</div>
            <div style="background:var(--surface-2);padding:12px 14px;border-radius:10px;font-size:13px;max-width:80%;line-height:1.8">${answer}</div>
          </div>
        `);
        body.scrollTop = body.scrollHeight;
      }, 420);
    };

    send.addEventListener('click', () => { ask(input.value); input.value = ''; });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { ask(input.value); input.value = ''; } });
    $$('[data-q]').forEach(el => el.addEventListener('click', () => ask(el.dataset.q)));
  }

  function generateAnswer(q) {
    const s = Store.state;
    const lq = q.toLowerCase();

    if (lq.includes('توجه') || lq.includes('ریسک') || lq.includes('تأخیر')) {
      const risky = s.projects.filter(p => ['At Risk','Delayed'].includes(p.status));
      if (!risky.length) return 'در حال حاضر هیچ پروژه‌ای در وضعیت ریسک یا تأخیر نیست.';
      return `پروژه‌های نیازمند توجه:<br><ul style="margin:8px 0;padding-inline-start:18px">${risky.map(p => {
        const h = Metrics.projectActualHours(p.id);
        const tp = Math.round((h / (p.timeBudget || 1)) * 100);
        return `<li><b>${esc(p.name)}</b> — وضعیت: ${esc(p.status)} · پیشرفت ${fmtNum(p.progress)}٪ در مقابل مصرف زمان ${fmtNum(tp)}٪</li>`;
      }).join('')}</ul>`;
    }
    if (lq.includes('بیش‌ازحد') || lq.includes('overalloc')) {
      const over = s.employees.filter(e => e.status === 'Active' && Metrics.totalAllocation(e.id) > 100);
      if (!over.length) return 'هیچ کارمندی بیش‌ازحد تخصیص داده نشده است.';
      return `کارکنان با تخصیص بیش از ۱۰۰٪:<br><ul style="margin:8px 0;padding-inline-start:18px">${over.map(e => `<li><b>${esc(e.firstName + ' ' + e.lastName)}</b> — ${fmtNum(Metrics.totalAllocation(e.id))}٪</li>`).join('')}</ul>`;
    }
    if (lq.includes('آماده تخصیص') || lq.includes('آزاد')) {
      const avail = s.employees.filter(e => e.status === 'Active' && Metrics.totalAllocation(e.id) < 80);
      if (!avail.length) return 'در حال حاضر هیچ کارمند آزادی برای تخصیص وجود ندارد.';
      return `کارکنان آماده تخصیص:<br><ul style="margin:8px 0;padding-inline-start:18px">${avail.map(e => `<li><b>${esc(e.firstName + ' ' + e.lastName)}</b> — ${esc(e.position)} — آزاد: ${fmtNum(100 - Metrics.totalAllocation(e.id))}٪</li>`).join('')}</ul>`;
    }
    if (lq.includes('بودجه') || lq.includes('انحراف')) {
      const projects = s.projects.map(p => {
        const cost = Metrics.projectActualCost(p.id);
        const budget = p.financialBudget || 1;
        return { p, overrun: (cost / budget) * 100 - p.progress };
      }).sort((a, b) => b.overrun - a.overrun);
      const worst = projects[0];
      if (!worst || worst.overrun <= 0) return 'هیچ پروژه‌ای انحراف بودجه منفی قابل توجهی ندارد.';
      return `بیشترین انحراف بودجه مربوط به <b>${esc(worst.p.name)}</b> است.<br>مصرف بودجه ${fmtNum(Math.round((Metrics.projectActualCost(worst.p.id) / (worst.p.financialBudget || 1)) * 100))}٪ در مقابل پیشرفت ${fmtNum(worst.p.progress)}٪.`;
    }
    if (lq.includes('اقدام') || lq.includes('این هفته')) {
      const items = [];
      const risky = s.projects.filter(p => ['At Risk','Delayed'].includes(p.status)).length;
      const over = s.employees.filter(e => e.status === 'Active' && Metrics.totalAllocation(e.id) > 100).length;
      const ts = s.timeEntries.filter(t => t.status === 'Submitted').length;
      const cand = s.candidates.filter(c => ['Decision','Evaluation'].includes(c.status)).length;
      if (risky) items.push(`${fmtNum(risky)} پروژه نیازمند بررسی`);
      if (over) items.push(`${fmtNum(over)} کارمند Overallocated`);
      if (ts) items.push(`${fmtNum(ts)} Timesheet منتظر تأیید`);
      if (cand) items.push(`${fmtNum(cand)} کاندید منتظر تصمیم`);
      return items.length ? `اقدامات پیشنهادی این هفته:<br><ul style="margin:8px 0;padding-inline-start:18px">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : 'در حال حاضر اقدام فوری لازم نیست.';
    }
    if (lq.includes('وضعیت کلی') || lq.includes('سازمان')) {
      const active = s.employees.filter(e => e.status === 'Active').length;
      const proj = s.projects.filter(p => p.status !== 'Completed').length;
      const util = Metrics.avgUtilization();
      const alerts = Alerts.derive().filter(a => !isAlertDismissed(a.id)).length;
      return `وضعیت کلی سازمان:<br>
        • کارکنان فعال: <b>${fmtNum(active)}</b><br>
        • پروژه‌های در جریان: <b>${fmtNum(proj)}</b><br>
        • میانگین مصرف ظرفیت: <b>${fmtNum(util)}٪</b><br>
        • هشدارهای فعال: <b>${fmtNum(alerts)}</b>`;
    }
    return 'متأسفانه در نسخه نمایشی، پاسخ این پرسش آماده نشده است. لطفاً از سؤالات پیشنهادی استفاده کنید.';
  }

  /* =============================================================
     24. SETTINGS
     ============================================================= */
  function initSettings() {
    const company = $('#set-company');
    if (company) company.addEventListener('change', () => { Store.state.settings.companyName = company.value; Store.save(); renderSidebar(); UI.toast('نام شرکت ذخیره شد', 'success'); });
    const curr = $('#set-currency'); if (curr) curr.addEventListener('change', () => { Store.state.settings.currency = curr.value; Store.save(); });
    const tz = $('#set-tz'); if (tz) tz.addEventListener('change', () => { Store.state.settings.timeZone = tz.value; Store.save(); });
    const df = $('#set-datefmt'); if (df) df.addEventListener('change', () => { Store.state.settings.dateFormat = df.value; Store.save(); });

    $$('[data-theme-set]').forEach(b => b.addEventListener('click', () => {
      Store.state.ui.theme = b.dataset.themeSet; Store.save(); applyTheme(); renderHeader();
    }));
    const sbEx = $('#sb-expand'); if (sbEx) sbEx.addEventListener('click', () => { Store.state.ui.sidebarCollapsed = false; Store.save(); $('#app').classList.remove('sidebar-collapsed'); });
    const sbCo = $('#sb-collapse'); if (sbCo) sbCo.addEventListener('click', () => { Store.state.ui.sidebarCollapsed = true; Store.save(); $('#app').classList.add('sidebar-collapsed'); });

    const btnMngKpi = $('#btn-manage-kpi'); if (btnMngKpi) btnMngKpi.addEventListener('click', openKpiManager);
    const btnResetKpi = $('#btn-reset-kpi'); if (btnResetKpi) btnResetKpi.addEventListener('click', () => {
      Store.state.kpiCards = defaultKpiCards(); Store.save(); UI.toast('کارت‌ها به پیش‌فرض بازگشتند', 'success');
    });

    const btnSaveTh = $('#btn-save-th'); if (btnSaveTh) btnSaveTh.addEventListener('click', () => {
      Store.state.settings.alertThresholds = {
        timeOverrunPct: Number($('#th-time').value),
        budgetOverrunPct: Number($('#th-budget').value),
        overallocationPct: Number($('#th-over').value),
        noProgressDays: Number($('#th-noprog').value)
      };
      Store.save();
      UI.toast('آستانه‌ها ذخیره شد', 'success');
    });

    const btnExpJson = $('#btn-export-json'); if (btnExpJson) btnExpJson.addEventListener('click', () => exportJSON('pmo-demo-full', Store.state));
    const btnResetAll = $('#btn-reset-all'); if (btnResetAll) btnResetAll.addEventListener('click', async () => {
      if (await Modal.confirm({ title: 'بازنشانی کامل', message: 'همه تغییرات حذف و داده‌های Demo به حالت اولیه برمی‌گردند. ادامه می‌دهید؟', confirmText: 'بازنشانی', danger: true })) {
        Store.reset();
        applyTheme();
        logout();
      }
    });
  }

  /* =============================================================
     25. EXPORT HELPERS
     ============================================================= */
  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
  function exportCSV(name, rows) {
    if (!rows || !rows.length) return;
    const keys = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object');
    const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))).join('\n');
    downloadFile(`${name}-${Date.now()}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
    UI.toast('خروجی CSV آماده شد', 'success');
  }
  function exportJSON(name, data) {
    downloadFile(`${name}-${Date.now()}.json`, JSON.stringify(data, null, 2), 'application/json');
    UI.toast('خروجی JSON آماده شد', 'success');
  }

  /* =============================================================
     26. START APP
     ============================================================= */
  function startApp() {
    $('#login-screen').classList.add('hidden');
    $('#app').classList.remove('hidden');
    applyTheme();

    const sb = Store.state.ui.sidebarCollapsed;
    $('#app').classList.toggle('sidebar-collapsed', sb);

    if (!location.hash) location.hash = '#/dashboard';
    renderSidebar();
    renderHeader();
    Router.resolve();

    $('#sidebar-backdrop').addEventListener('click', () => {
      $('#sidebar').classList.remove('mobile-open');
      $('#sidebar-backdrop').classList.remove('show');
    });
  }

  function init() {
    Store.init();
    applyTheme();
    const session = Store.state.session;
    if (session && Store.state.users.find(u => u.id === session.id)) {
      startApp();
    } else {
      Store.state.session = null;
      Store.save();
      renderLogin();
    }
    Router.init();
    window.addEventListener('resize', () => renderHeader());
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        const gs = $('#gs-input'); if (gs) gs.focus();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();