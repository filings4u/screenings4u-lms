/* SCREENINGS4U LMS — LEARNER PROGRESS */
(function(){"use strict";
let db,user,enrollments=[],courses=new Map(),lessonProgress=[],quizAttempts=[],certs=[];
document.addEventListener("DOMContentLoaded",()=>init().catch(fail));
async function init(){
 if(!window.LMS?.ready)throw new Error("Shared LMS authentication is unavailable.");
 ({client:db,user}=await window.LMS.ready);
 let e=await db.from("lms_enrollments").select("*").eq("user_id",user.id).in("status",["active","completed"]).order("last_activity_at",{ascending:false});
 if(e.error)throw e.error; enrollments=e.data||[];
 let ids=enrollments.map(x=>x.id),cids=[...new Set(enrollments.map(x=>x.course_id).filter(Boolean))];
 if(cids.length){let r=await db.from("lms_courses").select("*").in("id",cids);if(r.error)throw r.error;(r.data||[]).forEach(x=>courses.set(x.id,x));}
 if(ids.length){
  let r=await db.from("lms_lesson_progress").select("*").in("enrollment_id",ids).order("last_activity_at",{ascending:false});if(!r.error)lessonProgress=r.data||[];
  r=await db.from("lms_quiz_attempts").select("*").in("enrollment_id",ids).order("completed_at",{ascending:false});if(!r.error)quizAttempts=r.data||[];
  r=await db.from("lms_certificates").select("*").in("enrollment_id",ids).order("issued_at",{ascending:false});if(!r.error)certs=(r.data||[]).filter(x=>String(x.status||"issued").toLowerCase()!=="revoked");
 } render();
}
function render(){
 let avg=enrollments.length?Math.round(enrollments.reduce((n,e)=>n+(Number(e.progress_percent)||0),0)/enrollments.length):0;
 text("overallProgress",avg+"%");let ring=document.querySelector(".progress-ring-value");if(ring)ring.style.strokeDashoffset=String(289-(289*avg/100));
 let done=enrollments.filter(e=>e.status==="completed"||Number(e.progress_percent)>=100).length;
 text("learningGoals",`${done} of ${enrollments.length} enrolled course${enrollments.length===1?"":"s"} completed`);
 text("modulesCompleted",lessonProgress.filter(x=>x.completed_at||Number(x.progress_percent)>=100).length);
 text("quizzesPassed",quizAttempts.filter(x=>x.passed===true).length);text("certificatesEarned",certs.length);
 text("progressUpdated",new Date().toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}));
 document.getElementById("courseProgressList").innerHTML=enrollments.length?enrollments.map(card).join(""):empty("No enrolled courses yet.");
 milestones();next();activity();
}
function card(e){let c=courses.get(e.course_id)||{},p=Math.max(0,Math.min(100,Math.round(Number(e.progress_percent)||0))),done=e.status==="completed"||p>=100,lp=lessonProgress.filter(x=>x.enrollment_id===e.id),finished=lp.filter(x=>x.completed_at||Number(x.progress_percent)>=100).length,cert=certs.some(x=>x.enrollment_id===e.id),href=done&&cert?"lms-certificates.html":`lms-course-player.html?course=${encodeURIComponent(e.course_id)}&enrollment=${encodeURIComponent(e.id)}`;
return `<article class="course-progress-item"><div class="course-progress-icon">${book()}</div><div class="course-progress-content"><div class="course-progress-top"><div><h3 class="course-progress-title">${esc(c.title||"Training Course")}</h3><div class="course-progress-meta">${done?"Course completed":finished?finished+" lesson"+(finished===1?"":"s")+" completed":p?"Course in progress":"Not started"}</div></div><span class="course-progress-percent">${p}%</span></div><div class="course-progress-bar"><div class="course-progress-fill${done?" complete":""}" style="width:${p}%"></div></div><div class="course-progress-footer"><span class="course-progress-status">${done?(cert?"Certificate available":"Completed"):p?"Continue where you left off":"Ready to begin"}</span><a href="${href}" class="course-progress-action">${done&&cert?"View Certificate":done?"Review Course":p?"Continue Learning":"Start Course"}</a></div></div></article>`}
function milestones(){let e=enrollments.find(x=>x.status==="active")||enrollments[0],b=document.getElementById("milestoneList");if(!e){b.innerHTML=empty("Your learning milestones will appear after enrollment.");return}let p=Number(e.progress_percent)||0,q=quizAttempts.some(x=>x.enrollment_id===e.id&&x.passed===true),c=certs.some(x=>x.enrollment_id===e.id);b.innerHTML=milestone("Course Started","Training access activated",!!e.started_at||p>0)+milestone("Course Progress",Math.round(p)+"% complete",p>0)+milestone("Knowledge Checks",q?"Passed assessment activity":"Complete required quizzes",q)+milestone("Certificate",c?"Certificate issued":"Issued after successful completion",c)}
function milestone(a,b,d){return `<div class="milestone-item"><div class="milestone-check${d?" complete":""}">${check()}</div><div class="milestone-copy"><strong>${esc(a)}</strong><span>${esc(b)}</span></div></div>`}
function next(){let e=enrollments.find(x=>x.status==="active"&&Number(x.progress_percent)<100),b=document.getElementById("nextStep");if(!e){b.innerHTML=`<div class="next-step-badge"><i></i>Learning</div><h3>${enrollments.length?"No active course step":"No courses assigned yet"}</h3><p>${enrollments.length?"Review your completed learning or certificates.":"Assigned training will appear here when available."}</p><a href="lms-my-courses.html" class="next-step-button">My Learning</a>`;return}let c=courses.get(e.course_id)||{};b.innerHTML=`<div class="next-step-badge"><i></i>Up Next</div><h3>${esc(c.title||"Continue Your Current Course")}</h3><p>Resume where you left off. Your saved progress is ${Math.round(Number(e.progress_percent)||0)}%.</p><a href="lms-course-player.html?course=${encodeURIComponent(e.course_id)}&enrollment=${encodeURIComponent(e.id)}" class="next-step-button">Continue Learning</a>`}
function activity(){let a=[];lessonProgress.filter(x=>x.completed_at).forEach(x=>a.push({at:x.completed_at,t:"Lesson completed",s:"Course progress updated",k:"complete"}));quizAttempts.filter(x=>x.completed_at).forEach(x=>a.push({at:x.completed_at,t:x.passed?"Knowledge check passed":"Knowledge check completed",s:Number.isFinite(Number(x.score))?"Score: "+Number(x.score)+"%":"Attempt recorded",k:"complete"}));certs.forEach(x=>a.push({at:x.issued_at,t:"Certificate issued",s:"Training completion recognized",k:"certificate"}));a=a.filter(x=>x.at).sort((x,y)=>new Date(y.at)-new Date(x.at)).slice(0,6);document.getElementById("activityList").innerHTML=a.length?a.map(x=>`<div class="activity-item"><div class="activity-icon ${x.k}">${x.k==="certificate"?award():check()}</div><div class="activity-copy"><strong>${esc(x.t)}</strong><span>${esc(x.s)} · ${when(x.at)}</span></div></div>`).join(""):empty("No learning activity has been recorded yet.")}
function empty(s){return `<div style="padding:22px;color:#687386;font-size:12px">${esc(s)}</div>`} function text(i,v){let x=document.getElementById(i);if(x)x.textContent=v}
function when(v){let d=new Date(v);return isNaN(d)?"":d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}
function book(){return '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"></path><path d="M4 5.5v16"></path></svg>'}
function check(){return '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>'} function award(){return '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"></circle><path d="m8.5 12.5-1 8L12 18l4.5 2.5-1-8"></path></svg>'}
function esc(v){return String(v??"").replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[m]))}
function fail(e){console.error("[LMS Progress]",e);let x=document.getElementById("courseProgressList");if(x)x.innerHTML=empty(e.message||"Unable to load learning progress.")}
})();