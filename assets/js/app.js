/* ============================================================
   app.js — المتحكم الرئيسي (التنقل، الجلسة، التهيئة)
   ============================================================ */
(function () {
  const S = window.Store, U = window.UI, V = window.Views;

  const ROUTES = [
    { key: 'dashboard', icon: '📊', label: 'لوحة المعلومات', title: 'لوحة المعلومات' },
    { key: 'inspections', icon: '📋', label: 'التفتيش الذاتي و GMP', title: 'التفتيش الذاتي و GMP' },
    { key: 'monitor', icon: '📷', label: 'الرصد بالتصوير الذكي', title: 'الرصد بالتصوير الذكي' },
    { key: 'temperature', icon: '🌡️', label: 'مراقبة الحرارة', title: 'مراقبة درجات الحرارة' },
    { key: 'employees', icon: '👥', label: 'العاملون والشهادات', title: 'العاملون والشهادات الصحية' },
    { key: 'workercheck', icon: '🧑‍🔬', label: 'فحص العامل بالتصوير', title: 'فحص نظافة العامل بالذكاء الاصطناعي' },
    { key: 'haccp', icon: '🛡️', label: 'خطة HACCP (CCP)', title: 'خطة الهاسب ونقاط التحكم الحرجة' },
    { key: 'nc', icon: '⚠️', label: 'عدم المطابقة (CAPA)', title: 'عدم المطابقة والإجراءات التصحيحية' },
    { key: 'traceability', icon: '🔖', label: 'تتبّع الدفعات والاستدعاء', title: 'تتبّع الدفعات وسحب المنتج' },
    { key: 'suppliers', icon: '🚚', label: 'الموردون', title: 'اعتماد الموردين' },
    { key: 'cleaning', icon: '🧹', label: 'التنظيف والآفات', title: 'التنظيف ومكافحة الآفات' },
    { key: 'nutrition', icon: '🥗', label: 'حاسبة السعرات والحساسية', title: 'حاسبة السعرات والمكوّنات والحساسية' },
    { key: 'standards', icon: '📚', label: 'المواصفات والمعايير', title: 'المواصفات والمعايير المرجعية' },
    { key: 'reports', icon: '📈', label: 'التقارير والجاهزية', title: 'التقارير وجاهزية التفتيش' },
    { key: 'team', icon: '👤', label: 'الفريق والأدوار', title: 'إدارة الفريق والأدوار' },
    { key: 'billing', icon: '💳', label: 'الاشتراك', title: 'الاشتراك والخطة' },
    { key: 'settings', icon: '⚙️', label: 'الإعدادات', title: 'الإعدادات' },
  ];

  const App = {
    user: null,
    current: 'dashboard',

    init() {
      this.cloud = !!(window.Cloud && window.Cloud.enabled());

      if (this.cloud) {
        // وضع SaaS سحابي: مصادقة حقيقية بدل أدوار العرض
        const roles = document.querySelector('.login-roles');
        if (roles) Cloud.mountAuth(roles, (user) => {
          this.user = user; sessionStorage.setItem('fs_user', JSON.stringify(user)); this.enter();
        });
        // استعادة جلسة سحابية قائمة
        Cloud.currentSession().then(async (session) => {
          if (session) {
            try { await Cloud.bootstrap({}); this.user = { name: session.user.email }; this.enter(); }
            catch (e) { /* يبقى في شاشة الدخول */ }
          }
        });
      } else {
        // وضع العرض المحلي: استعادة جلسة + أزرار الأدوار
        const saved = sessionStorage.getItem('fs_user');
        if (saved) { this.user = JSON.parse(saved); this.enter(); }
        document.querySelectorAll('.role-btn').forEach(btn => {
          btn.onclick = () => {
            this.user = { name: btn.dataset.role, role: btn.dataset.role };
            sessionStorage.setItem('fs_user', JSON.stringify(this.user));
            this.enter();
          };
        });
      }

      U.$('#logout-btn').onclick = async () => {
        sessionStorage.removeItem('fs_user');
        if (this.cloud && window.Cloud) { try { await Cloud.signOut(); } catch (e) {} }
        location.reload();
      };
      U.$('#menu-toggle').onclick = () => {
        const open = U.$('#sidebar').classList.toggle('open');
        U.$('#scrim').classList.toggle('show', open);
      };
      U.$('#scrim').onclick = () => this.closeSidebar();
      // الأيقونات الموحّدة (خروج، قائمة المزيد) — علامة العلامة التجارية صورة الشعار
      const I = window.ICONS;
      U.$('#kebab-btn').innerHTML = I.kebab;
      U.$('#logout-btn').querySelector('.lo-ic').innerHTML = I.logout;
      const kmIcons = U.$('#kebab-menu').querySelectorAll('.km-ic');
      kmIcons[0].innerHTML = I.download; kmIcons[1].innerHTML = I.upload;

      // قائمة "المزيد" المنسدلة
      const kebabBtn = U.$('#kebab-btn'), kebabMenu = U.$('#kebab-menu');
      kebabBtn.onclick = (e) => { e.stopPropagation(); kebabMenu.classList.toggle('hidden'); };
      document.addEventListener('click', () => kebabMenu.classList.add('hidden'));
      kebabMenu.onclick = (e) => e.stopPropagation();

      U.$('#export-btn').onclick = () => { kebabMenu.classList.add('hidden'); this.exportData(); };
      U.$('#import-btn').onclick = () => { kebabMenu.classList.add('hidden'); U.$('#import-file').click(); };
      U.$('#import-file').onchange = (e) => this.importData(e);

      // شريحة التاريخ
      U.$('#today-chip').textContent = '📅 ' + new Date().toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    },

    enter() {
      U.$('#login-screen').classList.add('hidden');
      U.$('#app').classList.remove('hidden');
      // بطاقة المستخدم
      let sub = 'جلسة محلية';
      if (this.cloud && window.Cloud && Cloud.active()) {
        const days = Cloud.trialDaysLeft();
        const roleLbl = (window.Views && Views._roleLbl) ? Views._roleLbl(Cloud.role()) : Cloud.role();
        sub = roleLbl + ' · ' + Cloud.planLimits().label + (Cloud.planKey() === 'trial' && days != null ? ` · ${days} يوم` : '');
      }
      U.$('#user-badge').innerHTML = `<strong>${U.esc(this.user.name)}</strong><small>${U.esc(sub)}</small>`;
      this.buildNav();
      S.load();
      this.go('dashboard');
    },

    buildNav() {
      const m = S.metrics();
      const counts = { nc: m.openNCs, employees: m.expiredCards, temperature: m.tempBreaches };
      U.$('#nav').innerHTML = ROUTES.map(r => {
        const c = counts[r.key];
        return `<button class="nav-item" data-key="${r.key}">
          <span class="ic">${(window.ICONS && window.ICONS[r.key]) || r.icon}</span><span>${r.label}</span>
          ${c ? `<span class="badge-count">${c}</span>` : ''}
        </button>`;
      }).join('');
      U.$('#nav').querySelectorAll('.nav-item').forEach(el => {
        el.onclick = () => { this.go(el.dataset.key); this.closeSidebar(); };
      });
    },

    closeSidebar() {
      U.$('#sidebar').classList.remove('open');
      U.$('#scrim').classList.remove('show');
    },

    go(key) {
      this.current = key;
      this.render();
      U.$('#nav').querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.key === key));
      const route = ROUTES.find(r => r.key === key);
      U.$('#page-title').textContent = route ? route.title : '';
      U.$('#content').scrollTop = 0;
      window.scrollTo(0, 0);
    },

    render() {
      const fn = V[this.current];
      U.$('#content').innerHTML = fn ? fn() : U.empty('الصفحة غير متاحة');
      if (this.current === 'settings') V.bindSettings();
      const bind = V['bind_' + this.current];
      if (typeof bind === 'function') bind();
      this.buildNav(); // تحديث عدّادات التنبيه
      U.$('#nav').querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.key === this.current));
    },

    exportData() {
      const blob = new Blob([S.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'نسخة_احتياطية_سلامة_الغذاء_' + S.todayISO() + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      U.toast('تم تصدير النسخة الاحتياطية', 'ok');
    },

    importData(e) {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { S.importJSON(reader.result); U.toast('تم استيراد البيانات بنجاح', 'ok'); this.render(); }
        catch (err) { U.toast('ملف غير صالح', 'err'); }
        e.target.value = '';
      };
      reader.readAsText(file);
    },
  };

  window.App = App;
  document.addEventListener('DOMContentLoaded', () => App.init());
})();
