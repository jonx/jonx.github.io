// Identity is verified by the application API; GitHub tokens never enter this page.
(() => {
  const origin = 'https://lemon-ground-0b7969c03.6.azurestaticapps.net';
  const endpoint = `${origin}/api/auth/github/portal`;
  const login = document.getElementById('account-login');
  const logout = document.getElementById('account-logout');
  const status = document.getElementById('account-status');
  const projects = document.getElementById('account-projects');
  const key = 'jkn.account';
  function clear() {
    sessionStorage.removeItem(key); projects.replaceChildren(); projects.hidden = true;
    login.hidden = false; logout.hidden = true;
  }
  function render(data) {
    projects.replaceChildren();
    for (const p of data.projects || []) {
      // Only links from the trusted application origin are accepted.
      if (new URL(p.url).origin !== origin) continue;
      const card = document.createElement('article'); card.className = 'project';
      const h = document.createElement('h3'); h.textContent = p.name;
      const description = document.createElement('p'); description.className = 'project-description'; description.textContent = p.description;
      const link = document.createElement('a'); link.className = 'project-link'; link.href = p.url; link.textContent = 'Open project →';
      card.append(h, description, link); projects.append(card);
    }
    projects.hidden = !projects.children.length; login.hidden = true; logout.hidden = false;
    status.textContent = `Signed in as ${data.user.login}.`;
  }
  const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
  login.addEventListener('click', async () => {
    login.disabled = true;
    try {
      const verifier = random(), state = random();
      const challenge = b64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
      sessionStorage.setItem('jkn.oauth', JSON.stringify({ verifier, state, at: Date.now() }));
      location.assign(`${origin}/api/auth/github/start?${new URLSearchParams({ target: 'portal', challenge, client_state: state })}`);
    } catch { status.textContent = 'Sign-in is unavailable. Please allow session storage and try again.'; login.disabled = false; }
  });
  logout.addEventListener('click', () => { clear(); status.textContent = 'Signed out of jkn.me.'; });
  async function init() {
    let token;
    try {
      const fragment = new URLSearchParams(location.hash.slice(1));
      if (fragment.has('sonett_error')) {
        history.replaceState(null, '', location.pathname + location.search);
        const pending = JSON.parse(sessionStorage.getItem('jkn.oauth') || 'null');
        sessionStorage.removeItem('jkn.oauth');
        if (!pending || pending.state !== fragment.get('sonett_state')) throw Error('Invalid sign-in');
        status.textContent = 'GitHub sign-in was not completed. You can try again.'; return;
      }
      if (fragment.has('sonett_code')) {
        history.replaceState(null, '', location.pathname + location.search);
        const pending = JSON.parse(sessionStorage.getItem('jkn.oauth') || 'null');
        sessionStorage.removeItem('jkn.oauth');
        if (!pending || pending.state !== fragment.get('sonett_state') || Date.now() - pending.at > 600000) throw Error('Invalid sign-in');
        const response = await fetch(endpoint, { method: 'POST', credentials: 'omit', headers: { 'content-type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({ code: fragment.get('sonett_code'), verifier: pending.verifier }), signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw Error('Sign-in failed');
        const data = await response.json(); sessionStorage.setItem(key, data.token); render(data); return;
      }
      token = sessionStorage.getItem(key);
      if (!token) return;
      const response = await fetch(endpoint, { method: 'POST', credentials: 'omit', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ token }), signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('Session unavailable');
      render(await response.json());
    } catch {
      try { clear(); } catch { /* Storage is optional on the public homepage. */ }
      status.textContent = 'Could not verify your session. Sign in again to access your projects.';
    }
  }
  init();
})();
