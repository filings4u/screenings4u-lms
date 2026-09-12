(()=>{
  const state={db:null,appointments:[]};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  document.addEventListener('DOMContentLoaded',init);

  async function init(){
    state.db=await getClient();
    if(!state.db){return showError('Unable to connect to your Screenings4u account.');}
    await loadAppointments();
  }

  async function getClient(){
    for(let i=0;i<50;i++){
      try{
        if(typeof window.getScreenings4uSupabase==='function'){
          const c=await window.getScreenings4uSupabase();
          if(c?.functions)return c;
        }
        if(window.screenings4uSupabase?.functions)return window.screenings4uSupabase;
        if(window.supabaseClient?.functions)return window.supabaseClient;
      }catch{}
      await new Promise(r=>setTimeout(r,80));
    }
    return null;
  }

  async function invoke(body){
    const {data,error}=await state.db.functions.invoke('scheduling-booking',{body});
    if(error){
      let message=error.message;
      try{message=(await error.context?.clone?.().json())?.error||message}catch{}
      throw new Error(message);
    }
    if(data?.error)throw new Error(data.error);
    return data;
  }

  async function loadAppointments(){
    try{
      const data=await invoke({action:'my_appointments'});
      state.appointments=data.appointments||[];
      render();
    }catch(e){showError(e.message||'Unable to load your appointments.');}
  }

  function render(){
    const list=$('appointmentsList');
    $('appointmentsCount').textContent=String(state.appointments.length);
    if(!state.appointments.length){
      list.innerHTML=`<div class="appointments-empty"><div class="appointments-empty-icon">▣</div><h3>No appointments yet</h3><p>Schedule your first live Microsoft Teams training session.</p><a class="appointments-primary-action" href="lms-schedule-appointment.html">Schedule Appointment</a></div>`;
      return;
    }

    const now=Date.now();
    const sorted=[...state.appointments].sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
    list.innerHTML=sorted.map(a=>{
      const start=new Date(a.start_at), end=new Date(a.end_at);
      const status=String(a.status||'scheduled').toLowerCase();
      const active=!['cancelled','completed','no_show'].includes(status) && end.getTime()+3600000>now;
      const opens=start.getTime()-30*60000;
      const joinWindow=active && now>=opens && now<=end.getTime()+3600000;
      const date=start.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric',year:'numeric'});
      const time=start.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
      const endTime=end.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
      const badge=status==='cancelled'?'Cancelled':active?'Scheduled':status.replace(/_/g,' ');
      const joinLabel=joinWindow?'Enter Live Training':'View Live Training';
      const openingNote=active&&!joinWindow?'<span class="appointment-opening-note">Live Training opens 30 minutes before start</span>':'';
      return `<article class="appointment-item ${active?'is-active':'is-past'}">
        <div class="appointment-date"><strong>${esc(start.toLocaleDateString([],{day:'2-digit'}))}</strong><span>${esc(start.toLocaleDateString([],{month:'short'}).toUpperCase())}</span></div>
        <div class="appointment-main">
          <div class="appointment-title-row"><div><span class="appointment-provider">MICROSOFT TEAMS</span><h3>${esc(a.title||'Live Training')}</h3></div><span class="appointment-status">${esc(badge)}</span></div>
          <div class="appointment-meta"><span>${esc(date)}</span><span>${esc(time)} – ${esc(endTime)}</span><span>Tracking: ${esc(a.tracking_number||'—')}</span></div>
          <div class="appointment-host">Instructor: ${esc(a.host_name||'Screenings4u Training')}</div>
        </div>
        <div class="appointment-actions">
          ${active?`<a class="appointment-join" href="lms-live-training.html?appointment=${encodeURIComponent(a.id)}">${joinLabel}</a>${openingNote}`:''}
        </div>
      </article>`;
    }).join('');
  }

  function showError(message){
    const el=$('appointmentsMessage');
    el.textContent=message;
    el.hidden=false;
    $('appointmentsList').innerHTML='<div class="appointments-empty"><h3>Appointments unavailable</h3><p>Please refresh the page or try again shortly.</p></div>';
  }
})();
