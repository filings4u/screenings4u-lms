/* SCREENINGS4U LMS — LEARNER CERTIFICATES */
(function(){
"use strict";
var state={db:null,user:null,profile:null,certs:[],selected:null};
document.addEventListener("DOMContentLoaded",function(){init().catch(fail);});

async function init(){
 if(!window.LMS||!window.LMS.ready) throw new Error("Shared LMS authentication is unavailable.");
 var a=await window.LMS.ready; state.db=a.client; state.user=a.user; state.profile=a.profile||{};
 var r=await state.db.from("lms_certificates").select("*").order("issued_at",{ascending:false});
 if(r.error) throw r.error;
 var certs=(r.data||[]).filter(x=>String(x.status||"issued").toLowerCase()!=="revoked");
 if(!certs.length){render([]);return;}

 var enrollmentIds=[...new Set(certs.map(x=>x.enrollment_id).filter(Boolean))];
 var er=await state.db.from("lms_enrollments").select("*").in("id",enrollmentIds).eq("user_id",state.user.id);
 if(er.error) throw er.error;
 var enrollMap=new Map((er.data||[]).map(x=>[x.id,x]));
 certs=certs.filter(x=>enrollMap.has(x.enrollment_id));

 var courseIds=[...new Set(certs.map(x=>enrollMap.get(x.enrollment_id)?.course_id).filter(Boolean))];
 var cr=courseIds.length?await state.db.from("lms_courses").select("*").in("id",courseIds):{data:[],error:null};
 if(cr.error) throw cr.error;
 var courseMap=new Map((cr.data||[]).map(x=>[x.id,x]));

 var mediaIds=[...new Set(certs.map(x=>x.certificate_media_id).filter(Boolean))];
 var mediaMap=new Map();
 if(mediaIds.length){
  var mr=await state.db.from("lms_media").select("*").in("id",mediaIds);
  if(mr.error) throw mr.error;
  mediaMap=new Map((mr.data||[]).map(x=>[x.id,x]));
 }
 state.certs=certs.map(c=>{var e=enrollMap.get(c.enrollment_id)||{};return {...c,enrollment:e,course:courseMap.get(e.course_id)||{},media:mediaMap.get(c.certificate_media_id)||null};});
 render(state.certs);
}

function render(rows){
 text("[data-certificates-earned]",rows.length);
 text("[data-courses-completed]",new Set(rows.map(x=>x.enrollment.course_id).filter(Boolean)).size);
 var list=document.getElementById("certificatesList"),empty=document.getElementById("emptyCertificates"),preview=document.getElementById("certificatePreview");
 if(!rows.length){if(list)list.innerHTML="";if(empty)empty.classList.add("active");if(preview)preview.hidden=true;return;}
 if(empty)empty.classList.remove("active");
 list.innerHTML=rows.map(card).join("");
 list.querySelectorAll("[data-view-certificate]").forEach(b=>b.onclick=()=>show(b.dataset.id,true));
 list.querySelectorAll("[data-print-certificate]").forEach(b=>b.onclick=()=>printCert(b.dataset.id));
 list.querySelectorAll("[data-download-certificate]").forEach(b=>b.onclick=()=>download(b.dataset.id));
 show(rows[0].id,false);
}

function card(c){
 var title=c.course.title||"Training Certificate",issued=date(c.issued_at),status=String(c.status||"issued");
 return `<article class="certificate-item" style="margin-bottom:18px">
 <div class="certificate-item-top"><div class="certificate-thumbnail"><div class="certificate-thumbnail-inner"><div class="certificate-thumbnail-mark"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"></circle><path d="m8.5 12.5-1 8L12 18l4.5 2.5-1-8"></path></svg></div><strong>Certificate</strong><span>Screenings4u</span></div></div>
 <div class="certificate-item-content"><div class="certificate-status"><span class="certificate-status-dot"></span>${esc(status==="issued"?"Verified Completion":status)}</div><h3>${esc(title)}</h3><div class="certificate-item-meta"><span class="certificate-meta">Issued: <strong>${esc(issued)}</strong></span></div><div class="certificate-id">Certificate ID: <span>${esc(c.certificate_number||c.id)}</span></div></div></div>
 <div class="certificate-actions"><button type="button" class="cert-button cert-button-secondary" data-view-certificate data-id="${esc(c.id)}">View Certificate</button>${c.media?`<button type="button" class="cert-button cert-button-secondary" data-download-certificate data-id="${esc(c.id)}">Download File</button>`:""}<button type="button" class="cert-button cert-button-primary" data-print-certificate data-id="${esc(c.id)}">Download / Print</button></div></article>`;
}

function show(id,scroll){
 var c=state.certs.find(x=>x.id===id);if(!c)return;state.selected=c;
 var p=document.getElementById("certificatePreview"),box=document.getElementById("printCertificate");if(!p||!box)return;
 box.innerHTML=certificate(c);p.hidden=false;if(scroll)p.scrollIntoView({behavior:"smooth",block:"center"});
}
function certificate(c){
 var name=state.profile.display_name||[state.profile.first_name,state.profile.last_name].filter(Boolean).join(" ")||state.user.email||"Learner";
 return `<div class="real-certificate"><div class="real-certificate-content"><img src="images/logo2.png" alt="Screenings4u" class="real-certificate-logo"><div class="real-certificate-kicker">Screenings4u Learning Center</div><div class="real-certificate-title">Certificate of Completion</div><div class="real-certificate-presented">This certificate is proudly presented to</div><div class="real-certificate-name">${esc(name)}</div><div class="real-certificate-rule"></div><div class="real-certificate-text">For successfully completing the required training and assessment requirements for</div><div class="real-certificate-course">${esc(c.course.title||"Training Course")}</div><div class="real-certificate-footer"><div class="certificate-signature"><div class="certificate-signature-line"></div><span>Authorized Representative</span></div><div class="certificate-seal">Verified<br>Completion</div><div class="certificate-signature certificate-date"><div class="certificate-signature-line"></div><span>${esc(date(c.issued_at))}</span></div></div></div></div>`;
}
function printCert(id){show(id,false);setTimeout(()=>window.print(),50);}
async function download(id){
 var c=state.certs.find(x=>x.id===id);if(!c||!c.media)return;
 var m=c.media,bucket=m.storage_bucket,path=m.storage_path;if(!bucket||!path)return alert("Certificate file is not available.");
 var r=await state.db.storage.from(bucket).createSignedUrl(path,300);if(r.error)throw r.error;
 window.open(r.data.signedUrl,"_blank","noopener");
}
function date(v){if(!v)return "—";var d=new Date(v);return isNaN(d)?String(v):d.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});}
function esc(v){return String(v??"").replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[m]));}
function text(q,v){document.querySelectorAll(q).forEach(x=>x.textContent=String(v??""));}
function fail(e){console.error("[LMS Certificates]",e);var empty=document.getElementById("emptyCertificates");if(empty)empty.classList.add("active");alert(e.message||"Unable to load certificates.");}
})();