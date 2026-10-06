/*
 * Northstar Learning demo authentication.
 * This is deliberately a small, readable browser-only simulation. Anything
 * stored here can be inspected or changed by the person using the browser.
 */
(function () {
  'use strict';

  const USERS_KEY = 'northstar_demo_users_v1';
  const SESSION_KEY = 'northstar_demo_session_v1';
  const SESSION_LENGTH_MS = 12 * 60 * 60 * 1000;
  const PASSWORD_HASH_ITERATIONS = 210000;
  const DEMO_ADMIN_USERNAME = 'admin';
  const DEMO_ADMIN_EMAIL = 'admin@northstar.demo';
  const DEMO_ADMIN_PASSWORD = 'Admin@123';
  const topics = [
    ['01', 'Introduction to C', 'Meet the language, its history, and the shape of a simple program.', '⌘', '5 min'],
    ['02', 'Variables & Data Types', 'Learn how programs name, store, and work with information.', '▣', '8 min'],
    ['03', 'Operators', 'Use arithmetic, comparison, and logical operators in expressions.', '±', '7 min'],
    ['04', 'Conditional Statements', 'Make decisions with if, else, and switch statements.', '⑂', '9 min'],
    ['05', 'Loops', 'Repeat work with while, do-while, and for loops.', '⟳', '8 min'],
    ['06', 'Functions', 'Organize a program into clear, reusable building blocks.', 'ƒ', '10 min'],
    ['07', 'Arrays', 'Keep related values together in indexed collections.', '▥', '9 min'],
    ['08', 'Pointers', 'Explore addresses and indirect access to values.', '⌖', '12 min'],
    ['09', 'Structures', 'Group values of different types into useful records.', '▦', '8 min'],
    ['10', 'File Handling', 'Read from and write to files in a C program.', '▤', '10 min']
  ];

  const app = {
    async init() {
      this.page = document.body.dataset.page;
      this.ready = await this.prepareStorage();
      this.bindSharedEvents();
      if (!this.ready) return;
      if (this.page === 'auth') this.initAuth();
      if (this.page === 'admin') this.initAdmin();
      if (this.page === 'dashboard') this.initDashboard();
    },

    async prepareStorage() {
      if (!window.crypto || !window.crypto.subtle || !window.crypto.getRandomValues) {
        this.showPageError('Secure browser hashing is unavailable. Open this site in a current browser over HTTPS or localhost.');
        return false;
      }
      try {
        const users = this.readUsers();
        if (!users.some(user => user.role === 'admin')) {
          users.push({
            id: this.makeId(),
            fullName: 'Demo Administrator',
            email: DEMO_ADMIN_EMAIL,
            username: DEMO_ADMIN_USERNAME,
            salt: this.randomSalt(),
            passwordHash: '',
            role: 'admin',
            status: 'approved',
            disabled: false,
            registeredAt: new Date().toISOString()
          });
          // Use one salt for the stored hash and its verifier.
          const admin = users[users.length - 1];
          admin.passwordHash = await this.hashPassword(DEMO_ADMIN_PASSWORD, admin.salt);
          this.writeUsers(users);
        }
        return true;
      } catch (error) {
        console.error('Unable to initialize local account storage.', error);
        this.showPageError('This browser could not initialize local account storage. Enable local storage and reload the page.');
        return false;
      }
    },

    showPageError(message) {
      const target = document.querySelector('.auth-card, .admin-login-card, .dashboard-main');
      if (!target) return;
      const note = document.createElement('div');
      note.className = 'form-message is-error page-error';
      note.setAttribute('role', 'alert');
      note.textContent = message;
      target.prepend(note);
    },

    readUsers() {
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Account data is not a list.');
      return parsed;
    },

    writeUsers(users) {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    },

    makeId() {
      if (window.crypto.randomUUID) return window.crypto.randomUUID();
      return Array.from(window.crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
    },

    randomSalt() {
      const bytes = window.crypto.getRandomValues(new Uint8Array(16));
      return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    },

    async hashPassword(password, salt) {
      const saltBytes = Uint8Array.from(salt.match(/.{2}/g), pair => parseInt(pair, 16));
      const key = await window.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
      const digest = await window.crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: PASSWORD_HASH_ITERATIONS, hash: 'SHA-256' }, key, 256);
      return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    },

    getSession() {
      try {
        const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
        if (!session || !session.userId || !session.role || !session.createdAt) return null;
        if (Date.now() - session.createdAt > SESSION_LENGTH_MS) {
          this.clearSession();
          return null;
        }
        return session;
      } catch (_error) {
        this.clearSession();
        return null;
      }
    },

    setSession(user) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, role: user.role, createdAt: Date.now() }));
    },

    clearSession() {
      sessionStorage.removeItem(SESSION_KEY);
    },

    getCurrentUser() {
      const session = this.getSession();
      if (!session) return null;
      return this.readUsers().find(user => user.id === session.userId) || null;
    },

    bindSharedEvents() {
      document.querySelectorAll('[data-toggle-password]').forEach(button => {
        button.addEventListener('click', () => {
          const input = button.parentElement.querySelector('input');
          const show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          button.textContent = show ? 'Hide' : 'Show';
          button.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} password`);
        });
      });
      document.querySelectorAll('[data-logout]').forEach(button => button.addEventListener('click', () => {
        this.clearSession();
        window.location.replace('index.html?loggedOut=1');
      }));
      window.addEventListener('storage', event => {
        if (event.key === USERS_KEY || event.key === SESSION_KEY) this.checkProtectedPage();
      });
    },

    initAuth() {
      const params = new URLSearchParams(window.location.search);
      if (params.has('loggedOut')) this.toast('You have signed out.', 'success');
      if (params.has('reason')) this.toast('Please sign in with an approved account to continue.', 'info');
      const current = this.getCurrentUser();
      if (current && current.role === 'user' && current.status === 'approved' && !current.disabled) {
        window.location.replace('dashboard.html');
        return;
      }
      document.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', () => this.setAuthTab(button.dataset.authTab)));
      document.getElementById('login-form').addEventListener('submit', event => this.submitLogin(event));
      document.getElementById('register-form').addEventListener('submit', event => this.submitRegistration(event));
    },

    setAuthTab(tab) {
      const isLogin = tab === 'login';
      document.querySelectorAll('.auth-tab').forEach(button => {
        const selected = button.dataset.authTab === tab;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-selected', String(selected));
      });
      document.getElementById('login-panel').hidden = !isLogin;
      document.getElementById('register-panel').hidden = isLogin;
      document.getElementById('auth-title').textContent = isLogin ? 'Welcome back' : 'Start learning today';
      document.getElementById('auth-subtitle').textContent = isLogin ? 'Sign in to continue learning.' : 'Create an account to get started.';
      this.clearFormState(document.getElementById('login-form'));
      this.clearFormState(document.getElementById('register-form'));
    },

    async submitLogin(event) {
      event.preventDefault();
      const form = event.currentTarget;
      this.clearFormState(form);
      const identifier = form.elements.identifier.value.trim().toLowerCase();
      const password = form.elements.password.value;
      if (!identifier) return this.setFieldError('login-identifier-error', form.elements.identifier, 'Enter your email or username.');
      if (!password) return this.setFieldError('login-password-error', form.elements.password, 'Enter your password.');
      const submit = form.querySelector('[type="submit"]');
      this.setBusy(submit, true, 'Signing in…');
      try {
        const user = this.readUsers().find(item => item.email.toLowerCase() === identifier || item.username.toLowerCase() === identifier);
        if (!user || user.role !== 'user' || !(await this.passwordMatches(user, password))) {
          return this.message('login-message', 'Those sign-in details don’t match an account.', 'error');
        }
        if (user.disabled) return this.message('login-message', 'This account has been disabled. Contact an administrator for help.', 'error');
        if (user.status === 'pending') return this.message('login-message', 'Your account is waiting for Admin approval. Please try again after it has been reviewed.', 'info');
        if (user.status === 'rejected') return this.message('login-message', 'This registration was not approved. Contact an administrator if you think this is a mistake.', 'error');
        if (user.status !== 'approved') return this.message('login-message', 'This account cannot sign in right now. Contact an administrator for help.', 'error');
        this.setSession(user);
        window.location.assign('dashboard.html');
      } catch (error) {
        console.error('Sign-in failed.', error);
        this.message('login-message', 'Sign-in could not be completed. Check browser storage and try again.', 'error');
      } finally {
        this.setBusy(submit, false, 'Sign in');
      }
    },

    async submitRegistration(event) {
      event.preventDefault();
      const form = event.currentTarget;
      this.clearFormState(form);
      const values = {
        fullName: form.elements.fullName.value.trim(),
        email: form.elements.email.value.trim().toLowerCase(),
        username: form.elements.username.value.trim(),
        password: form.elements.password.value,
        confirmPassword: form.elements.confirmPassword.value
      };
      let firstInvalid = null;
      const invalid = (key, id, text) => {
        this.setFieldError(id, form.elements[key], text);
        firstInvalid ||= form.elements[key];
      };
      if (values.fullName.length < 2 || values.fullName.length > 80) invalid('fullName', 'register-name-error', 'Enter a name between 2 and 80 characters.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 254) invalid('email', 'register-email-error', 'Enter a valid email address.');
      if (!/^[A-Za-z0-9_]{3,20}$/.test(values.username)) invalid('username', 'register-username-error', 'Use 3–20 letters, numbers, or underscores.');
      if (values.password.length < 8 || values.password.length > 128) invalid('password', 'register-password-error', 'Use a password between 8 and 128 characters.');
      if (values.confirmPassword !== values.password || !values.confirmPassword) invalid('confirmPassword', 'register-confirm-error', 'Passwords must match.');
      if (firstInvalid) { firstInvalid.focus(); return; }
      const submit = form.querySelector('[type="submit"]');
      this.setBusy(submit, true, 'Creating account…');
      try {
        const users = this.readUsers();
        const usernameTaken = users.some(user => user.username.toLowerCase() === values.username.toLowerCase());
        const emailTaken = users.some(user => user.email.toLowerCase() === values.email);
        if (usernameTaken) {
          this.setFieldError('register-username-error', form.elements.username, 'That username is already in use.');
          form.elements.username.focus();
          return;
        }
        if (emailTaken) {
          this.setFieldError('register-email-error', form.elements.email, 'An account with this email already exists.');
          form.elements.email.focus();
          return;
        }
        const salt = this.randomSalt();
        users.push({
          id: this.makeId(), fullName: values.fullName, email: values.email,
          username: values.username, salt, passwordHash: await this.hashPassword(values.password, salt),
          role: 'user', status: 'pending', disabled: false, registeredAt: new Date().toISOString()
        });
        this.writeUsers(users);
        form.reset();
        this.message('register-message', 'Registration successful. Your account is waiting for Admin approval.', 'success');
        this.toast('Registration successful. Your account is waiting for Admin approval.', 'success');
      } catch (error) {
        console.error('Registration failed.', error);
        this.message('register-message', 'Your account could not be saved. Check browser storage and try again.', 'error');
      } finally {
        this.setBusy(submit, false, 'Create account');
      }
    },

    async passwordMatches(user, password) {
      if (!user.salt || !user.passwordHash) return false;
      return (await this.hashPassword(password, user.salt)) === user.passwordHash;
    },

    initAdmin() {
      const current = this.getCurrentUser();
      if (current && current.role === 'admin' && !current.disabled) {
        this.showAdminDashboard();
        return;
      }
      document.getElementById('admin-login-form').addEventListener('submit', event => this.submitAdminLogin(event));
    },

    async submitAdminLogin(event) {
      event.preventDefault();
      const form = event.currentTarget;
      this.clearFormState(form);
      const identifier = form.elements.identifier.value.trim().toLowerCase();
      const password = form.elements.password.value;
      if (!identifier) return this.setFieldError('admin-identifier-error', form.elements.identifier, 'Enter the admin username.');
      if (!password) return this.setFieldError('admin-password-error', form.elements.password, 'Enter the admin password.');
      const submit = form.querySelector('[type="submit"]');
      this.setBusy(submit, true, 'Signing in…');
      try {
        const admin = this.readUsers().find(user => user.username.toLowerCase() === identifier && user.role === 'admin');
        if (!admin || admin.disabled || !(await this.passwordMatches(admin, password))) {
          this.message('admin-login-message', 'The administrator username or password is incorrect.', 'error');
          return;
        }
        this.setSession(admin);
        this.showAdminDashboard();
      } catch (error) {
        console.error('Administrator sign-in failed.', error);
        this.message('admin-login-message', 'Sign-in could not be completed. Check browser storage and try again.', 'error');
      } finally {
        this.setBusy(submit, false, 'Sign in to admin');
      }
    },

    showAdminDashboard() {
      document.getElementById('admin-login-view').hidden = true;
      document.getElementById('admin-dashboard-view').hidden = false;
      this.renderUsers();
      document.getElementById('refresh-users').addEventListener('click', () => this.renderUsers());
      document.getElementById('user-search').addEventListener('input', () => this.renderUsers());
      document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
        document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('is-active', item === button));
        this.renderUsers();
      }));
      document.getElementById('users-table-body').addEventListener('click', event => this.handleUserAction(event));
      this.adminRefreshInterval = window.setInterval(() => this.renderUsers(), 15000);
    },

    renderUsers() {
      const session = this.getSession();
      const users = this.readUsers();
      const admin = users.find(user => session && user.id === session.userId && user.role === 'admin' && !user.disabled);
      if (!admin) {
        this.clearSession();
        window.location.replace('admin.html');
        return;
      }
      const members = users.filter(user => user.role === 'user');
      const pending = members.filter(user => user.status === 'pending' && !user.disabled).length;
      const approved = members.filter(user => user.status === 'approved' && !user.disabled).length;
      const restricted = members.filter(user => user.status === 'rejected' || user.disabled).length;
      document.getElementById('stat-total').textContent = String(members.length);
      document.getElementById('stat-pending').textContent = String(pending);
      document.getElementById('stat-approved').textContent = String(approved);
      document.getElementById('stat-restricted').textContent = String(restricted);
      document.getElementById('member-count-label').textContent = `${members.length} ${members.length === 1 ? 'account' : 'accounts'}`;

      const query = document.getElementById('user-search').value.trim().toLowerCase();
      const filter = document.querySelector('[data-filter].is-active').dataset.filter;
      const filtered = members.filter(user => {
        const restrictedUser = user.disabled || user.status === 'rejected';
        const matchesFilter = filter === 'all' || (filter === 'pending' && user.status === 'pending' && !user.disabled) || (filter === 'approved' && user.status === 'approved' && !user.disabled) || (filter === 'restricted' && restrictedUser);
        const matchesQuery = !query || `${user.fullName} ${user.email} ${user.username}`.toLowerCase().includes(query);
        return matchesFilter && matchesQuery;
      }).sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
      const body = document.getElementById('users-table-body');
      body.replaceChildren(...filtered.map(user => this.createUserRow(user)));
      document.getElementById('users-empty').hidden = filtered.length > 0;
    },

    createUserRow(user) {
      const row = document.createElement('tr');
      const memberCell = document.createElement('td');
      const member = document.createElement('div'); member.className = 'member-cell';
      const avatar = document.createElement('span'); avatar.className = 'member-avatar'; avatar.textContent = this.initials(user.fullName);
      const details = document.createElement('span');
      const name = document.createElement('span'); name.className = 'member-name'; name.textContent = user.fullName;
      const email = document.createElement('span'); email.className = 'member-email'; email.textContent = user.email;
      details.append(name, document.createElement('br'), email); member.append(avatar, details); memberCell.append(member);
      const username = document.createElement('td'); username.textContent = `@${user.username}`;
      const registered = document.createElement('td'); registered.textContent = this.formatDate(user.registeredAt);
      const statusCell = document.createElement('td');
      const badge = document.createElement('span'); badge.className = `status-badge ${this.statusClass(user)}`; badge.textContent = user.disabled ? 'Disabled' : this.titleCase(user.status); statusCell.append(badge);
      const actionsCell = document.createElement('td'); const actions = document.createElement('div'); actions.className = 'row-actions';
      if (user.status === 'pending' && !user.disabled) {
        actions.append(this.actionButton('Approve', 'approve', user.id, 'action-approve'), this.actionButton('Reject', 'reject', user.id, 'action-reject'));
      } else if (user.status === 'rejected' && !user.disabled) {
        actions.append(this.actionButton('Approve', 'approve', user.id, 'action-approve'), this.actionButton('Remove', 'remove', user.id, 'action-remove'));
      } else {
        actions.append(this.actionButton(user.disabled ? 'Enable' : 'Disable', user.disabled ? 'enable' : 'disable', user.id, user.disabled ? '' : 'action-reject'));
        actions.append(this.actionButton('Remove', 'remove', user.id, 'action-remove'));
      }
      actionsCell.append(actions); row.append(memberCell, username, registered, statusCell, actionsCell); return row;
    },

    actionButton(label, action, id, extraClass) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = `action-button ${extraClass}`.trim(); button.textContent = label;
      button.dataset.action = action; button.dataset.userId = id;
      button.setAttribute('aria-label', `${label} ${id}`);
      return button;
    },

    handleUserAction(event) {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      const userId = button.dataset.userId;
      const labels = { reject: 'Reject this registration?', remove: 'Permanently remove this account and its local data?', disable: 'Disable this learner’s access?', enable: 'Re-enable this learner’s account?' };
      if (labels[action] && !window.confirm(labels[action])) return;
      const users = this.readUsers();
      const index = users.findIndex(user => user.id === userId && user.role === 'user');
      if (index < 0) return this.toast('This account is no longer available. Refresh the list.', 'error');
      if (action === 'remove') users.splice(index, 1);
      if (action === 'approve') { users[index].status = 'approved'; users[index].disabled = false; }
      if (action === 'reject') { users[index].status = 'rejected'; users[index].disabled = false; }
      if (action === 'disable') users[index].disabled = true;
      if (action === 'enable') users[index].disabled = false;
      this.writeUsers(users);
      this.renderUsers();
      const feedback = { approve: 'Learner approved. They can now sign in.', reject: 'Registration rejected.', disable: 'Learner access disabled.', enable: 'Learner account enabled.', remove: 'Account removed from this browser.' };
      this.toast(feedback[action], action === 'approve' || action === 'enable' ? 'success' : 'info');
    },

    initDashboard() {
      if (!this.checkProtectedPage()) return;
      this.renderDashboard();
      this.guardInterval = window.setInterval(() => this.checkProtectedPage(), 10000);
      const toggle = document.getElementById('menu-toggle');
      const sidebar = document.getElementById('sidebar');
      const scrim = document.getElementById('sidebar-scrim');
      const closeMenu = () => { sidebar.classList.remove('is-open'); scrim.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); };
      toggle.addEventListener('click', () => {
        const open = sidebar.classList.toggle('is-open'); scrim.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open));
      });
      scrim.addEventListener('click', closeMenu);
      document.querySelectorAll('.side-link').forEach(link => link.addEventListener('click', closeMenu));
    },

    checkProtectedPage() {
      if (this.page !== 'dashboard' && this.page !== 'admin') return true;
      const current = this.getCurrentUser();
      if (this.page === 'dashboard' && current && current.role === 'admin') {
        window.location.replace('index.html?reason=auth'); return false;
      }
      if (this.page === 'dashboard' && (!current || current.role !== 'user' || current.status !== 'approved' || current.disabled)) {
        this.clearSession(); window.location.replace('index.html?reason=auth'); return false;
      }
      if (this.page === 'admin' && current && current.role !== 'admin') {
        window.location.replace('admin.html'); return false;
      }
      if (this.page === 'admin' && current && current.disabled) {
        this.clearSession(); window.location.replace('admin.html'); return false;
      }
      return true;
    },

    renderDashboard() {
      const user = this.getCurrentUser();
      if (!user) return;
      const name = user.fullName.trim().split(/\s+/)[0];
      document.getElementById('welcome-name').textContent = name;
      document.getElementById('user-chip-name').textContent = user.fullName;
      document.getElementById('user-avatar').textContent = this.initials(user.fullName);
      const grid = document.getElementById('course-grid');
      grid.replaceChildren(...topics.map(([number, title, description, icon, length]) => {
        const card = document.createElement('article'); card.className = 'course-card';
        const top = document.createElement('div'); top.className = 'course-card-top';
        const count = document.createElement('span'); count.className = 'course-number'; count.textContent = number;
        const symbol = document.createElement('span'); symbol.className = 'course-icon'; symbol.setAttribute('aria-hidden', 'true'); symbol.textContent = icon;
        top.append(count, symbol);
        const heading = document.createElement('h3'); heading.textContent = title;
        const copy = document.createElement('p'); copy.textContent = description;
        const meta = document.createElement('div'); meta.className = 'course-meta'; meta.textContent = `${length} read · `;
        const level = document.createElement('span'); level.textContent = 'Beginner'; meta.append(level);
        card.append(top, heading, copy, meta); return card;
      }));
    },

    statusClass(user) {
      if (user.disabled) return 'status-disabled';
      return { pending: 'status-pending', approved: 'status-approved', rejected: 'status-rejected' }[user.status] || 'status-rejected';
    },

    titleCase(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown'; },
    initials(name) { return (name || '?').trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase(); },
    formatDate(value) {
      const date = new Date(value);
      return Number.isNaN(date.valueOf()) ? 'Unknown' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
    },

    setFieldError(id, input, message) {
      const output = document.getElementById(id);
      if (output) output.textContent = message;
      if (input) input.setAttribute('aria-invalid', 'true');
    },

    clearFormState(form) {
      form.querySelectorAll('.field-error').forEach(item => { item.textContent = ''; });
      form.querySelectorAll('[aria-invalid="true"]').forEach(item => item.removeAttribute('aria-invalid'));
      const message = form.parentElement.querySelector('.form-message');
      if (message) { message.textContent = ''; message.className = 'form-message'; }
    },

    message(id, text, kind) {
      const output = document.getElementById(id);
      output.textContent = text;
      output.className = `form-message is-${kind}`;
    },

    setBusy(button, busy, label) {
      if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent.trim();
      button.disabled = busy;
      button.textContent = busy ? label : button.dataset.defaultLabel;
    },

    toast(text, kind) {
      const region = document.getElementById('toast-region');
      if (!region) return;
      const toast = document.createElement('div'); toast.className = `toast is-${kind || 'info'}`; toast.textContent = text;
      region.append(toast);
      window.setTimeout(() => toast.remove(), 4200);
    }
  };

  document.addEventListener('DOMContentLoaded', () => app.init());
})();
