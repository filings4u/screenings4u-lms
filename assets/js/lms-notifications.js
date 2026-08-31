/* SCREENINGS4U LMS — LEARNER NOTIFICATIONS */
(function(){"use strict";
let db,user,rows=[],readIds=new Set(),filter="all";
document.addEventListener("DOMContentLoaded",()=>init().catch(fail));

async function init(){
 if(!window.LMS?.ready)throw new Error("Shared LMS authentication is unavailable.");
 ({client:db,user}=await window.LMS.ready);

 let n=await db.from("notifications").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);
 if(n.error){
   n=await db.from("notifications").select("*").eq("recipient_user_id",user.id).order("created_at",{ascending:false}).limit(100);
 }
 if(n.error)throw n.error;
 rows=n.data||[];

 let rr=await db.from("customer_notification_reads").select("notification_id,read_at").eq("user_id",user.id);
 if(!rr.error)(rr.data||[]).forEach(x=>readIds.add(x.notification_id));

 bind(); render();
}
function bind(){
 document.querySelectorAll(".notification-tab").forEach(t=>t.onclick=()=>{document.querySelectorAll(".notification-tab").forEach(x=>x.classList.remove("active"));t.classList.add("active");filter=t.dataset.filter||"all";render()});
 document.getElementById("markAllRead")?.addEventListener("click",markAll);
}
function type(n){
 let s=[n.type,n.notification_type,n.category,n.title,n.message].filter(Boolean).join(" ").toLowerCase();
 if(s.includes("certificate"))return "certificates";
 if(s.includes("assessment")||s.includes("quiz"))return "assessments";
 return "courses";
}
function isRead(n){return readIds.has(n.id)||n.read_at||n.is_read===true;}
function render(){
 let visible=rows.filter(n=>filter==="all"||(filter==="unread"&&!isRead(n))||type(n)===filter);
 let list=document.getElementById("notificationList");
 list.innerHTML=visible.map(card).join("");
 list.querySelectorAll("[data-mark-read]").forEach(b=>b.onclick=()=>markRead(b.dataset.id));
 document.getElementById("allCount").textContent=rows.length;
 let unread=rows.filter(n=>!isRead(n)).length, uc=document.getElementById("unreadCount");
 uc.textContent=unread;uc.style.display=unread?"":"none";
 document.getElementById("emptyState").classList.toggle("show",visible.length===0);
 document.getElementById("notificationSummary").innerHTML=`Showing <strong>${visible.length} notification${visible.length===1?"":"s"}</strong>`;
 let topdot=document.querySelector(".lms-notification-dot");if(topdot)topdot.style.display=unread?"":"none";
}
function card(n){
 let t=type(n),unread=!isRead(n),link=target(n,t),title=n.title||"Learning update",msg=n.message||n.body||n.content||"";
 return `<article class="notification-item${unread?" unread":""}" data-type="${t}">
 <div class="notification-icon ${t==="certificates"?"certificate":t==="assessments"?"assessment":"course"}">${icon(t)}</div>
 <div class="notification-body"><div class="notification-topline"><div class="notification-title-row"><h2 class="notification-title">${esc(title)}</h2>${unread?'<span class="unread-dot" aria-label="Unread"></span>':""}</div><span class="notification-time">${esc(when(n.created_at||n.sent_at))}</span></div>
 <p class="notification-message">${esc(msg)}</p><div class="notification-actions">${link?`<a href="${esc(link)}" class="notification-link">View</a>`:""}${unread?`<button type="button" class="notification-action mark-read" data-mark-read data-id="${esc(n.id)}">Mark as Read</button>`:""}</div></div></article>`;
}
function target(n,t){
 let m=n.metadata||{};
 if(m.url||m.href)return m.url||m.href;
 if(t==="certificates")return "lms-certificates.html";
 if(t==="assessments")return "lms-my-courses.html";
 return "lms-my-courses.html";
}
async function markRead(id){
 if(readIds.has(id))return;
 let r=await db.from("customer_notification_reads").upsert({user_id:user.id,notification_id:id,read_at:new Date().toISOString()},{onConflict:"user_id,notification_id"});
 if(r.error)throw r.error;readIds.add(id);render();
}
async function markAll(){
 let unread=rows.filter(n=>!isRead(n));if(!unread.length)return;
 let data=unread.map(n=>({user_id:user.id,notification_id:n.id,read_at:new Date().toISOString()}));
 let r=await db.from("customer_notification_reads").upsert(data,{onConflict:"user_id,notification_id"});
 if(r.error)throw r.error;unread.forEach(n=>readIds.add(n.id));render();
}
function when(v){if(!v)return "";let d=new Date(v);if(isNaN(d))return "";let diff=Date.now()-d.getTime(),day=86400000;if(diff<day&&d.toDateString()===new Date().toDateString())return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});if(diff<2*day)return "Yesterday";return d.toLocaleDateString([],{month:"short",day:"numeric",year:d.getFullYear()!==new Date().getFullYear()?"numeric":undefined});}
function icon(t){if(t==="certificates")return '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"></circle><path d="m8.5 12.5-1 8L12 18l4.5 2.5-1-8"></path></svg>';if(t==="assessments")return '<svg viewBox="0 0 24 24"><path d="M9 11h6"></path><path d="M9 15h4"></path><path d="M8 3h8l2 2v16H6V5z"></path></svg>';return '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"></path><path d="M4 5.5v16"></path></svg>'}
function esc(v){return String(v??"").replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[m]))}
function fail(e){console.error("[LMS Notifications]",e);document.getElementById("emptyState")?.classList.add("show");let s=document.getElementById("notificationSummary");if(s)s.textContent=e.message||"Unable to load notifications."}
})();