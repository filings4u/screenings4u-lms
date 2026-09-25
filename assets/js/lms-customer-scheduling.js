/* SOURCE: assets/js/training-auth-guard.js */
/**
 * screenings4u — Training LMS bootstrap
 * One authentication/onboarding pipeline shared by every LMS script.
 */
(() => {
  "use strict";

  const CONSENT_VERSION = "2026-08-23";
  const ONBOARDING_PAGE = "lms-welcome.html";

  function currentPage() {
    return (location.pathname.split("/").pop() || "").split("?")[0].toLowerCase();
  }

  function onboardingCacheKey(userId) {
    return `s4u:lms:onboarding:${CONSENT_VERSION}:${userId}`;
  }

  async function verifyOnboarding(state) {
    if (currentPage() === ONBOARDING_PAGE) return true;

    const userId = state?.user?.id;
    if (!userId) throw new Error("Training user is unavailable.");

    try {
      if (sessionStorage.getItem(onboardingCacheKey(userId)) === "1") return true;
    } catch (_) {}

    document.documentElement.classList.add("s4u-onboarding-pending");

    const client = window.getScreenings4uSupabase?.();
    if (!client) throw new Error("Supabase client is unavailable.");

    const session = state.session;
    if (!session?.access_token) throw new Error("Training session is unavailable.");

    const response = await fetch(
      `${window.SCREENINGS4U_SUPABASE_URL}/functions/v1/lms-learner-documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: window.SCREENINGS4U_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action: "status" })
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to verify onboarding status.");

    const consent = data.consent || {};
    const complete = Boolean(
      consent.consent_version === CONSENT_VERSION &&
      consent.accepted_terms &&
      consent.accepted_refund_policy &&
      consent.accepted_disclaimer &&
      consent.accepted_mock_requirements
    );

    if (!complete) {
      const target = new URL(ONBOARDING_PAGE, location.href);
      target.searchParams.set("returnTo", location.pathname + location.search + location.hash);
      location.replace(target.href);
      return false;
    }

    try { sessionStorage.setItem(onboardingCacheKey(userId), "1"); } catch (_) {}
    document.documentElement.classList.remove("s4u-onboarding-pending");
    return true;
  }

  async function bootstrap() {
    document.documentElement.classList.add("s4u-auth-pending");
    if (currentPage() !== ONBOARDING_PAGE) {
      document.documentElement.classList.add("s4u-onboarding-pending");
    }

    try {
      if (!window.S4UAuth?.requireAuth) {
        throw new Error("core-auth.js must load before training-auth-guard.js.");
      }

      const state = await window.S4UAuth.requireAuth({
        portal: "training",
        loginPage: "training-login.html"
      });
      if (!state) return null;

      if (!(await verifyOnboarding(state))) return null;

      document.documentElement.classList.remove("s4u-auth-pending", "s4u-onboarding-pending");
      document.documentElement.classList.add("s4u-authenticated");

      window.S4UTrainingAuthState = state;
      window.dispatchEvent(new CustomEvent("s4u:training-ready", { detail: state }));
      return state;
    } catch (error) {
      console.error("[Training bootstrap]", error);
      document.documentElement.classList.add("s4u-auth-error");
      document.documentElement.classList.remove("s4u-authenticated");
      throw error;
    }
  }

  // Starts as soon as this script is parsed; no DOMContentLoaded delay.
  window.S4UTrainingReady = bootstrap();
})();

;
/* SOURCE: assets/js/customer-scheduling.js */
(()=>{const S={db:null,services:[],appts:[],service:null,slot:null,slots:[],cur:new Date(),rappt:null,rslots:[],rcur:new Date()};const $=x=>document.getElementById(x),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const normalizeSlots=rows=>(rows||[]).map(x=>({...x,start_at:x.start_at||x.slot_start,end_at:x.end_at||x.slot_end}));document.addEventListener('DOMContentLoaded',init);async function init(){bind();const auth=await window.S4UTrainingReady;S.db=window.getScreenings4uSupabase?.();if(!S.db||!auth?.user)return msg('Unable to connect to scheduling.');await services();await appts();if($('email'))$('email').value=auth.profile?.email||auth.user.email||'';if($('name'))$('name').value=auth.profile?.display_name||[auth.profile?.first_name,auth.profile?.last_name].filter(Boolean).join(' ')||'';if(document.body.dataset.schedulingView==='list')showList();else showBook()}function on(id,fn){const e=$(id);if(e)e.onclick=fn}function bind(){on('myAppts',showList);on('viewAppointments',showList);on('newBook',showBook);on('another',reset);on('prev',()=>move(-1));on('next',()=>move(1));on('rprev',()=>rmove(-1));on('rnext',()=>rmove(1));on('review',review);on('confirm',book);on('closeRes',()=>$('resDialog')?.close());on('closeCancel',closeCancel);on('keepAppointment',closeCancel);const cf=$('cancelForm');if(cf)cf.onsubmit=cancelAppointment;document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>panel(+b.dataset.back))}async function call(body){const{data,error}=await S.db.functions.invoke('scheduling-booking',{body});if(error){let m=error.message;try{m=(await error.context?.clone?.().json())?.error||m}catch{}throw Error(m)}if(data?.error)throw Error(data.error);return data}async function services(){S.services=(await call({action:'services'})).services||[];$('services').innerHTML=S.services.length?S.services.map(s=>`<button class="service" data-s="${s.id}"><b class="eyebrow">${esc(s.category||'APPOINTMENT')}</b><h3>${esc(s.name)}</h3><p>${esc(s.description||'View available dates and times.')}</p><span class="meta">${s.duration_minutes} minutes · ${esc(String(s.location_mode||'').replace('_',' '))}</span></button>`).join(''):'No appointment types are currently available.';document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>chooseService(b.dataset.s))}async function chooseService(id){S.service=S.services.find(x=>x.id===id);S.cur=new Date();panel(2);await month()}function panel(n){for(let i=1;i<=4;i++)$('p'+i).hidden=i!==n;$('success').hidden=true;document.querySelectorAll('.steps span').forEach((x,i)=>x.classList.toggle('active',i===n-1))}async function month(res=false){let c=res?S.rcur:S.cur,s=res?S.services.find(x=>x.id===S.rappt.event_type_id):S.service;if(!s)return;let start=ymd(new Date(c.getFullYear(),c.getMonth(),1)),end=ymd(new Date(c.getFullYear(),c.getMonth()+1,0)),d=await call({action:'availability',event_type_id:s.id,start_date:start,end_date:end,party_size:1,exclude_appointment_id:res?S.rappt.id:null});if(res)S.rslots=normalizeSlots(d.slots);else S.slots=normalizeSlots(d.slots);calendar(res)}function calendar(res){let c=res?S.rcur:S.cur,slots=res?S.rslots:S.slots,grid=$(res?'rcalendar':'calendar'),title=$(res?'rmonth':'month');title.textContent=c.toLocaleDateString([],{month:'long',year:'numeric'});let first=new Date(c.getFullYear(),c.getMonth(),1),last=new Date(c.getFullYear(),c.getMonth()+1,0),avail=new Set(slots.map(x=>localDay(x.start_at))),h='';for(let i=0;i<first.getDay();i++)h+='<span></span>';for(let d=1;d<=last.getDate();d++){let key=ymd(new Date(c.getFullYear(),c.getMonth(),d)),on=avail.has(key);h+=`<button class="day ${on?'on':''}" ${on?`data-d="${key}"`:'disabled'}>${d}</button>`}grid.innerHTML=h;grid.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>date(b.dataset.d,res))}function date(d,res){let slots=(res?S.rslots:S.slots).filter(x=>localDay(x.start_at)===d),box=$(res?'rtimes':'times');$(res?'rdate':'dateLabel').textContent=new Date(d+'T12:00').toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'});box.innerHTML=slots.map((x,i)=>`<button class="time" data-i="${i}">${new Date(x.start_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</button>`).join('')||'No times available.';box.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>res?doRes(slots[+b.dataset.i]):pick(slots[+b.dataset.i]))}function pick(x){S.slot=x;panel(3)}function review(){if(!$('name').value.trim()||!$('email').value.trim())return msg('Name and email are required.');$('reviewBox').innerHTML=summary();panel(4)}function summary(){return `<div><span>Appointment</span><b>${esc(S.service?.name||'Appointment')}</b></div><div><span>Date & time</span><b>${esc(new Date(S.slot.start_at).toLocaleString([],{dateStyle:'medium',timeStyle:'short'}))}</b></div><div><span>Attendee</span><b>${esc($('name').value)} · ${esc($('email').value)}</b></div>`}async function book(){try{$('confirm').disabled=true;await call({action:'book',event_type_id:S.service.id,start_at:S.slot.start_at,staff_id:S.slot.staff_id||null,location_id:S.slot.location_id||null,attendee_name:$('name').value,attendee_email:$('email').value,attendee_phone:$('phone').value,party_size:+$('party').value||1,customer_timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});$('p4').hidden=true;$('success').hidden=false;$('successBox').innerHTML=summary();await appts()}catch(e){msg(e.message);await month()}finally{$('confirm').disabled=false}}async function appts(){S.appts=(await call({action:'my_appointments'})).appointments||[];$('appointments').innerHTML=S.appts.length?S.appts.map(a=>{let s=S.services.find(x=>x.id===a.event_type_id),active=new Date(a.start_at)>new Date()&&!['cancelled','completed','no_show'].includes(a.status),canRes=active&&s?.allow_reschedule,canCancel=active&&s?.allow_cancel;return `<div class="appt"><div><h3>${esc(s?.name||a.title||'Appointment')}</h3><p>${esc(new Date(a.start_at).toLocaleString([],{dateStyle:'medium',timeStyle:'short'}))}</p><p>Tracking: ${esc(a.tracking_number||'—')} · ${esc(a.status)}</p></div><div class="appt-actions">${canRes?`<button class="btn" data-r="${a.id}">Reschedule</button>`:''}${a.meeting_provider==='microsoft_teams'&&a.meeting_url&&active?`<a class="btn primary" href="lms-live-training.html?appointment=${encodeURIComponent(a.id)}">Join Live Training</a>`:''}${canCancel?`<button class="btn danger-outline" data-c="${a.id}">Cancel Appointment</button>`:''}</div></div>`}).join(''):'You do not have any appointments yet.';document.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>reschedule(b.dataset.r));document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>openCancel(b.dataset.c))}async function reschedule(id){S.rappt=S.appts.find(x=>x.id===id);S.rcur=new Date();$('resTitle').textContent='Current time: '+new Date(S.rappt.start_at).toLocaleString();$('resDialog').showModal();await month(true)}async function doRes(slot){try{await call({action:'reschedule',appointment_id:S.rappt.id,start_at:slot.start_at,staff_id:slot.staff_id||null,location_id:slot.location_id||null,customer_timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});$('resDialog').close();msg('Appointment rescheduled.');await appts()}catch(e){msg(e.message);await month(true)}}function openCancel(id){S.cappt=S.appts.find(x=>x.id===id);if(!S.cappt)return;const d=$('cancelDialog');$('cancelTitle').textContent=`${S.cappt.title||'Appointment'} · ${new Date(S.cappt.start_at).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}`;$('cancelReason').value='';d?.showModal()}function closeCancel(){S.cappt=null;$('cancelDialog')?.close()}async function cancelAppointment(ev){ev.preventDefault();if(!S.cappt)return;const cancelled={...S.cappt};const btn=$('confirmCancel');btn.disabled=true;btn.textContent='Cancelling…';try{await call({action:'cancel',appointment_id:cancelled.id,reason:$('cancelReason').value});closeCancel();await appts();await refreshReleasedAvailability(cancelled);msg('Appointment cancelled. The released time is available for booking again.')}catch(e){msg(e.message)}finally{btn.disabled=false;btn.textContent='Cancel Appointment'}}async function refreshReleasedAvailability(appt){if(!appt?.event_type_id||!appt?.start_at)return;const svc=S.services.find(x=>x.id===appt.event_type_id);if(!svc)return;const d=new Date(appt.start_at);const start=ymd(new Date(d.getFullYear(),d.getMonth(),1));const end=ymd(new Date(d.getFullYear(),d.getMonth()+1,0));try{const r=await call({action:'availability',event_type_id:svc.id,start_date:start,end_date:end,party_size:1});const fresh=normalizeSlots(r.slots);if(S.service?.id===svc.id&&S.cur.getFullYear()===d.getFullYear()&&S.cur.getMonth()===d.getMonth()){S.slots=fresh;calendar(false)}}catch(e){console.error('Unable to refresh released appointment slot.',e)}}function showList(){$('book').hidden=true;$('listPanel').hidden=false;appts()}function showBook(){$('listPanel').hidden=true;$('book').hidden=false}function reset(){S.service=S.slot=null;showBook();panel(1)}function move(n){S.cur=new Date(S.cur.getFullYear(),S.cur.getMonth()+n,1);month()}function rmove(n){S.rcur=new Date(S.rcur.getFullYear(),S.rcur.getMonth()+n,1);month(true)}function ymd(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}function localDay(v){return ymd(new Date(v))}function msg(t){const e=$('msg');if(!e)return;e.textContent=t;e.hidden=!t;setTimeout(()=>{e.textContent='';e.hidden=true},5000)}})();
;
/* SOURCE: assets/js/branded-popups.js */
(() => {
  'use strict';

  const BRAND = '#ff6b00';
  const BRAND_LOGO = 'https://elpbnytpciqnbexiaebp.supabase.co/storage/v1/object/public/branding/logo.png';
  const state = { resolve: null, confirmResolve: null, lastMessage: '', lastAt: 0 };

  function ensurePopup() {
    if (document.getElementById('s4u-global-popup')) return;
    const style = document.createElement('style');
    style.id = 's4u-global-popup-style';
    style.textContent = `
      [role="alert"].login-status,[role="alert"].handoff-error{display:none!important}
      .s4u-popup{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:20px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .s4u-popup.is-open{display:flex}
      .s4u-popup__backdrop{position:absolute;inset:0;background:rgba(15,23,42,.58);backdrop-filter:blur(4px)}
      .s4u-popup__card{position:relative;width:min(440px,100%);background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,.24);text-align:center;animation:s4uPopupIn .18s ease-out}
      .s4u-popup__brand{padding:20px 24px 17px;border-bottom:3px solid ${BRAND};background:#fff}.s4u-popup__brand img{display:block;width:min(220px,70%);height:auto;margin:auto}.s4u-popup__body{padding:26px 26px 24px}
      .s4u-popup__title{margin:0 0 9px;color:#24467f;font-size:22px;line-height:1.25;font-weight:800}
      .s4u-popup__message{margin:0;color:#475569;font-size:15px;line-height:1.65;white-space:pre-line;overflow-wrap:anywhere}
      .s4u-popup__actions{display:flex;justify-content:center;gap:10px;margin-top:23px}
      .s4u-popup__button{min-width:120px;min-height:44px;border:0;border-radius:12px;padding:11px 18px;background:${BRAND};color:#fff;font:inherit;font-weight:800;cursor:pointer}.s4u-popup__button--secondary{background:#e2e8f0;color:#0f172a}
      .s4u-popup__button:hover{background:#e66000}
      .s4u-popup__button:focus-visible{outline:3px solid rgba(255,107,0,.24);outline-offset:3px}
      @keyframes s4uPopupIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
      @media(max-width:520px){.s4u-popup{padding:14px}.s4u-popup__card{padding:26px 18px 20px;border-radius:18px}.s4u-popup__actions{display:grid}.s4u-popup__button{width:100%}}
    `;
    document.head.appendChild(style);

    const popup = document.createElement('div');
    popup.id = 's4u-global-popup';
    popup.className = 's4u-popup';
    popup.setAttribute('aria-hidden', 'true');
    popup.innerHTML = `
      <div class="s4u-popup__backdrop" data-s4u-popup-close></div>
      <section class="s4u-popup__card" role="dialog" aria-modal="true" aria-labelledby="s4u-popup-title" aria-describedby="s4u-popup-message">
        <div class="s4u-popup__brand"><img src="${BRAND_LOGO}" alt="screenings4u"></div>
        <div class="s4u-popup__body">
          <h2 class="s4u-popup__title" id="s4u-popup-title">screenings4u</h2>
          <p class="s4u-popup__message" id="s4u-popup-message"></p>
          <div class="s4u-popup__actions"><button class="s4u-popup__button s4u-popup__button--secondary" type="button" data-s4u-popup-cancel hidden>Cancel</button><button class="s4u-popup__button" type="button" data-s4u-popup-ok>OK</button></div>
        </div>
      </section>`;
    document.body.appendChild(popup);
    popup.querySelector('[data-s4u-popup-ok]').addEventListener('click', () => finishPopup(true));
    popup.querySelector('[data-s4u-popup-cancel]').addEventListener('click', () => finishPopup(false));
    popup.querySelector('[data-s4u-popup-close]').addEventListener('click', closePopup);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && popup.classList.contains('is-open')) closePopup(); });
  }

  function finishPopup(value) {
    if (state.confirmResolve) { const resolve = state.confirmResolve; state.confirmResolve = null; resolve(value); }
    closePopup();
  }

  function closePopup() {
    const popup = document.getElementById('s4u-global-popup');
    if (!popup) return;
    const active = document.activeElement;
    if (active && popup.contains(active) && typeof active.blur === 'function') active.blur();
    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');
    if (state.resolve) { const resolve = state.resolve; state.resolve = null; resolve(); }
  }

  function showPopup(message, options = {}) {
    const text = String(message ?? '').trim();
    if (!text) return Promise.resolve();
    const now = Date.now();
    if (text === state.lastMessage && now - state.lastAt < 700) return Promise.resolve();
    state.lastMessage = text; state.lastAt = now;
    ensurePopup();
    const popup = document.getElementById('s4u-global-popup');
    popup.querySelector('#s4u-popup-title').textContent = options.title || 'Screenings4u';
    popup.querySelector('#s4u-popup-message').textContent = text;
    popup.querySelector('[data-s4u-popup-ok]').textContent = options.confirmText || 'OK';
    const cancel = popup.querySelector('[data-s4u-popup-cancel]'); cancel.hidden = true;
    popup.classList.add('is-open');
    popup.setAttribute('aria-hidden', 'false');
    setTimeout(() => popup.querySelector('[data-s4u-popup-ok]')?.focus(), 0);
    return new Promise(resolve => { state.resolve = resolve; });
  }

  function confirmPopup(message, options={}) {
    ensurePopup();
    const popup=document.getElementById('s4u-global-popup');
    popup.querySelector('#s4u-popup-title').textContent=options.title||'Please Confirm';
    popup.querySelector('#s4u-popup-message').textContent=String(message??'');
    popup.querySelector('[data-s4u-popup-ok]').textContent=options.confirmText||'Continue';
    const cancel=popup.querySelector('[data-s4u-popup-cancel]'); cancel.hidden=false; cancel.textContent=options.cancelText||'Cancel';
    popup.classList.add('is-open'); popup.setAttribute('aria-hidden','false');
    setTimeout(() => popup.querySelector('[data-s4u-popup-ok]')?.focus(), 0);
    return new Promise(resolve=>{state.confirmResolve=resolve;});
  }

  window.S4UPopup = { show: showPopup, confirm: confirmPopup, close: closePopup, success: (m,t='Success') => showPopup(m,{title:t}), error: (m,t='Something went wrong') => showPopup(m,{title:t}), info: (m,t='Screenings4u') => showPopup(m,{title:t}) };
  window.alert = message => { showPopup(message); };

  function watchInlineAlerts() {
    document.querySelectorAll('[role="alert"]').forEach(el => {
      let previous = (el.textContent || '').trim();
      const observer = new MutationObserver(() => {
        const current = (el.textContent || '').trim();
        if (current && current !== previous) {
          const lower = current.toLowerCase();
          const title = /success|updated|sent|complete|saved/.test(lower) ? 'Success' : /error|invalid|failed|unable|expired|incorrect/.test(lower) ? 'Something went wrong' : 'Screenings4u';
          showPopup(current, { title });
        }
        previous = current;
      });
      observer.observe(el, { childList:true, characterData:true, subtree:true });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { ensurePopup(); watchInlineAlerts(); });
  else { ensurePopup(); watchInlineAlerts(); }
})();

;
/* SOURCE: assets/js/ui.js */
/* ============================================================
   screenings4u — CORE UI
   Replaces browser alert()/confirm() for application actions.
   ============================================================ */

(() => {
  "use strict";

  let activeModal = null;
  let activeResolve = null;

  function ensureRoot() {
    let root = document.getElementById("s4uModalRoot");

    if (!root) {
      root = document.createElement("div");
      root.id = "s4uModalRoot";
      root.className = "s4u-modal-root";
      document.body.appendChild(root);
    }

    return root;
  }

  function close(result = false) {
    if (!activeModal) return;
    activeModal.remove();
    activeModal = null;
    document.body.classList.remove("s4u-modal-open");
    if (activeResolve) {
      const resolve = activeResolve;
      activeResolve = null;
      resolve(result);
    }
  }

  function modal({
    title = "screenings4u",
    message = "",
    type = "info",
    confirmText = "Continue",
    cancelText = "Cancel",
    showCancel = false,
    onConfirm = null
  } = {}) {
    close();

    const root = ensureRoot();
    const wrapper = document.createElement("div");

    wrapper.className = `s4u-modal ${type}`;
    wrapper.setAttribute("role", "dialog");
    wrapper.setAttribute("aria-modal", "true");

    wrapper.innerHTML = `
      <div class="s4u-modal-backdrop" data-modal-close></div>
      <section class="s4u-modal-panel">
        <div class="s4u-modal-brand">
          <img class="s4u-modal-brand-logo" src="https://elpbnytpciqnbexiaebp.supabase.co/storage/v1/object/public/branding/logo.png" alt="screenings4u">
        </div>
        <div class="s4u-modal-body">
          <div class="s4u-modal-icon" aria-hidden="true"></div>
          <div class="s4u-modal-content">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(message)}</p>
          </div>
          <div class="s4u-modal-actions">
            ${showCancel ? `<button class="s4u-modal-button secondary" type="button" data-modal-cancel>${escapeHtml(cancelText)}</button>` : ""}
            <button class="s4u-modal-button primary" type="button" data-modal-confirm>${escapeHtml(confirmText)}</button>
          </div>
        </div>
      </section>
    `;

    root.appendChild(wrapper);
    activeModal = wrapper;
    document.body.classList.add("s4u-modal-open");

    wrapper
      .querySelector("[data-modal-close]")
      ?.addEventListener("click", () => close(false));

    wrapper
      .querySelector("[data-modal-cancel]")
      ?.addEventListener("click", () => close(false));

    wrapper
      .querySelector("[data-modal-confirm]")
      ?.addEventListener("click", async () => {
        const button =
          wrapper.querySelector("[data-modal-confirm]");

        button.disabled = true;

        try {
          if (typeof onConfirm === "function") {
            await onConfirm();
          }

          close(true);
        } catch (error) {
          button.disabled = false;

          toast(
            error?.message ||
              "Unable to complete this action.",
            "error"
          );
        }
      });

    const promise = new Promise(resolve => { activeResolve = resolve; });
    promise.close = () => close(false);
    return promise;
  }

  function toast(
    message,
    type = "info"
  ) {
    let root =
      document.getElementById(
        "s4uToastRoot"
      );

    if (!root) {
      root =
        document.createElement("div");

      root.id = "s4uToastRoot";
      root.className =
        "s4u-toast-root";

      document.body.appendChild(
        root
      );
    }

    const item =
      document.createElement("div");

    item.className =
      `s4u-toast ${type}`;

    item.textContent =
      message;

    root.appendChild(
      item
    );

    requestAnimationFrame(
      () =>
        item.classList.add(
          "show"
        )
    );

    setTimeout(() => {
      item.classList.remove(
        "show"
      );

      setTimeout(
        () => item.remove(),
        180
      );
    }, 4200);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formModal({
    title = "screenings4u",
    message = "",
    fields = [],
    confirmText = "Save",
    cancelText = "Cancel",
    onSubmit = null
  } = {}) {
    close();

    const root = ensureRoot();
    const wrapper =
      document.createElement("div");

    wrapper.className =
      "s4u-modal info";

    wrapper.setAttribute(
      "role",
      "dialog"
    );

    wrapper.setAttribute(
      "aria-modal",
      "true"
    );

    wrapper.innerHTML = `
      <div class="s4u-modal-backdrop" data-modal-close></div>
      <section class="s4u-modal-panel s4u-form-modal-panel">
        <div class="s4u-modal-brand">
          <img class="s4u-modal-brand-logo" src="https://elpbnytpciqnbexiaebp.supabase.co/storage/v1/object/public/branding/logo.png" alt="screenings4u">
        </div>
        <div class="s4u-modal-body">
          <div class="s4u-modal-content">
            <h2>${escapeHtml(title)}</h2>
            ${message ? `<p>${escapeHtml(message)}</p>` : ""}
            <form class="s4u-form-modal-form">
            ${fields.map((field) => `
              <label class="s4u-form-modal-field">
                <span>${escapeHtml(field.label || field.name)}</span>
                ${field.type === "textarea"
                  ? `<textarea name="${escapeHtml(field.name)}" rows="4">${escapeHtml(field.value ?? "")}</textarea>`
                  : field.type === "select"
                    ? `<select name="${escapeHtml(field.name)}">${(field.options || []).map(o => `<option value="${escapeHtml(o.value)}" ${String(o.value) === String(field.value) ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}</select>`
                    : `<input type="${escapeHtml(field.type || "text")}" name="${escapeHtml(field.name)}" value="${escapeHtml(field.value ?? "")}" ${field.required ? "required" : ""} ${field.min !== undefined ? `min="${escapeHtml(field.min)}"` : ""} ${field.max !== undefined ? `max="${escapeHtml(field.max)}"` : ""}>`}
              </label>
            `).join("")}
            <div class="s4u-modal-actions">
              <button class="s4u-modal-button secondary" type="button" data-modal-cancel>${escapeHtml(cancelText)}</button>
              <button class="s4u-modal-button primary" type="submit">${escapeHtml(confirmText)}</button>
            </div>
          </form>
          </div>
        </div>
      </section>
    `;

    root.appendChild(
      wrapper
    );

    activeModal = wrapper;

    document.body.classList.add(
      "s4u-modal-open"
    );

    wrapper
      .querySelector("[data-modal-close]")
      ?.addEventListener(
        "click",
        close
      );

    wrapper
      .querySelector("[data-modal-cancel]")
      ?.addEventListener(
        "click",
        close
      );

    wrapper
      .querySelector("form")
      ?.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();

          const button =
            wrapper.querySelector(
              'button[type="submit"]'
            );

          button.disabled =
            true;

          const formData =
            new FormData(
              event.currentTarget
            );

          const values =
            Object.fromEntries(
              formData.entries()
            );

          try {
            if (
              typeof onSubmit ===
              "function"
            ) {
              await onSubmit(
                values
              );
            }

            close();
          } catch (error) {
            button.disabled =
              false;

            toast(
              error?.message ||
                "Unable to complete this action.",
              "error"
            );
          }
        }
      );

    wrapper
      .querySelector(
        "input, select, textarea"
      )
      ?.focus();

    return {
      close
    };
  }

  window.S4UUI =
    Object.freeze({
      modal,
      formModal,
      toast,
      closeModal: close
    });
})();

;
