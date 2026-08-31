/* SCREENINGS4U LMS — COURSE DETAILS */
(function(){
"use strict";
document.addEventListener("DOMContentLoaded",()=>init().catch(fail));
var db,user,profile,course,enrollment,sections=[];

async function init(){
 if(!window.LMS||!window.LMS.ready) throw new Error("Shared LMS authentication is unavailable.");
 ({client:db,user,profile}=await window.LMS.ready);
 var p=new URLSearchParams(location.search), id=p.get("course"), slug=p.get("slug");
 if(!id&&!slug) throw new Error("No course was selected.");

 var q=db.from("lms_courses").select("*");
 q=id?q.eq("id",id):q.eq("slug",slug);
 var cr=await q.maybeSingle();
 if(cr.error) throw cr.error;
 if(!cr.data) throw new Error("This course is unavailable or you do not have access.");
 course=cr.data;

 var er=await db.from("lms_enrollments").select("*").eq("user_id",user.id).eq("course_id",course.id).in("status",["active","completed"]).maybeSingle();
 if(er.error) throw er.error;
 enrollment=er.data||null;

 var sr=await db.from("lms_sections").select("*").eq("course_id",course.id).eq("is_published",true).order("sort_order");
 if(sr.error) throw sr.error;
 sections=sr.data||[];
 var sectionIds=sections.map(x=>x.id);
 var lessons=[];
 if(sectionIds.length){
   var lr=await db.from("lms_lessons").select("*").in("section_id",sectionIds).eq("status","published").order("sort_order");
   if(lr.error) throw lr.error;
   lessons=lr.data||[];
 }
 sections=sections.map(s=>({...s,lessons:lessons.filter(l=>l.section_id===s.id)}));
 render();
}
function render(){
 document.title=(course.title||"Course")+" | Screenings4u Learning Center";
 set("[data-course-breadcrumb]",course.title);
 set("[data-course-title]",course.title);
 set("[data-course-category]",course.metadata?.category||"Training");
 set("[data-course-description]",course.short_description||course.description||"");

 var all=sections.flatMap(s=>s.lessons), mins=all.reduce((n,l)=>n+(Number(l.estimated_minutes)||0),0);
 var meta=document.querySelectorAll(".course-details-meta-item");
 if(meta[0]) setLast(meta[0],"Self-paced");
 if(meta[1]) setLast(meta[1],all.length+" lesson"+(all.length===1?"":"s"));
 if(meta[2]) setLast(meta[2],course.navigation_mode==="sequential"?"Guided sequence":"Flexible learning");

 var about=document.querySelectorAll(".course-details-section-text");
 if(about[0]) about[0].textContent=course.description||course.short_description||"Complete this course at your own pace.";
 if(about[1]) about[1].textContent="Your progress is saved to your Screenings4u learning record.";

 var intro=document.querySelector(".course-details-section:nth-of-type(3) .course-details-section-text");
 if(intro) intro.textContent=`The course includes ${all.length} lesson${all.length===1?"":"s"} organized into ${sections.length} module${sections.length===1?"":"s"}.`;

 document.getElementById("courseCurriculum").innerHTML=sections.length?sections.map(moduleHtml).join(""):'<div style="padding:20px;color:#687386">No published course content is available yet.</div>';
 bindModules();

 var vals=document.querySelectorAll(".course-details-info-value");
 if(vals[0]) vals[0].textContent=mins?formatMinutes(mins):"Self-paced";
 if(vals[1]) vals[1].textContent=all.length+" lessons";
 if(vals[2]) vals[2].textContent="Self-paced online training";
 if(vals[3]) vals[3].textContent=course.certificate_enabled?"Course requirements + certificate":"Course requirements";

 var rows=document.querySelectorAll(".course-enrollment-row-value");
 var label=document.querySelector(".course-enrollment-label"), title=document.querySelector(".course-enrollment-title"), text=document.querySelector(".course-enrollment-text"), action=document.querySelector(".course-primary-action"), note=document.querySelector(".course-enrollment-note");
 if(enrollment){
   if(label)label.textContent="Your Enrollment";
   if(title)title.textContent=enrollment.status==="completed"?"Course Completed":"Continue Your Course";
   if(text)text.textContent=enrollment.status==="completed"?"You have completed this course. You can review the course content at any time.":"Your enrollment is active and your learning progress is saved automatically.";
   if(rows[0])rows[0].textContent="Full access";
   if(rows[1])rows[1].textContent=Math.round(Number(enrollment.progress_percent)||0)+"% complete";
   if(rows[2])rows[2].textContent=mins?formatMinutes(mins):"Self-paced";
   if(action){action.href=`lms-course-player.html?course=${encodeURIComponent(course.id)}&enrollment=${encodeURIComponent(enrollment.id)}`;action.textContent=enrollment.status==="completed"?"Review Course":"Continue Learning";}
   if(note)note.textContent="Your course access is connected to this enrollment.";
 } else {
   if(rows[0])rows[0].textContent="Enrollment required";
   if(rows[1])rows[1].textContent="Not enrolled";
   if(rows[2])rows[2].textContent=mins?formatMinutes(mins):"Self-paced";
   if(action){action.href=`customer-catalog.html?course=${encodeURIComponent(course.id)}`;action.textContent="View Training Options";}
   if(note)note.textContent="Purchase or assignment is required before course content can be opened.";
 }
}
function moduleHtml(s,i){
 var ls=s.lessons||[], mins=ls.reduce((n,l)=>n+(Number(l.estimated_minutes)||0),0);
 return `<div class="course-curriculum-module${i===0?" is-open":""}"><button type="button" class="course-curriculum-module-button" aria-expanded="${i===0}"><span class="course-curriculum-module-left"><span class="course-curriculum-module-number">${String(i+1).padStart(2,"0")}</span><span><span class="course-curriculum-module-name">${esc(s.title)}</span><span class="course-curriculum-module-meta">${ls.length} lesson${ls.length===1?"":"s"}${mins?" · Approximately "+formatMinutes(mins):""}</span></span></span><svg class="course-curriculum-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"></path></svg></button><div class="course-curriculum-lessons">${ls.map(l=>`<div class="course-curriculum-lesson"><div class="course-curriculum-lesson-left"><span class="course-curriculum-lesson-icon"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></span><span class="course-curriculum-lesson-name">${esc(l.title)}</span></div><span class="course-curriculum-lesson-time">${l.estimated_minutes?esc(l.estimated_minutes)+" min":""}</span></div>`).join("")}</div></div>`;
}
function bindModules(){document.querySelectorAll(".course-curriculum-module-button").forEach(b=>b.onclick=()=>{var m=b.closest(".course-curriculum-module"),open=m.classList.contains("is-open");document.querySelectorAll(".course-curriculum-module").forEach(x=>{x.classList.remove("is-open");x.querySelector("button")?.setAttribute("aria-expanded","false")});if(!open){m.classList.add("is-open");b.setAttribute("aria-expanded","true")}});}
function set(q,v){document.querySelectorAll(q).forEach(x=>x.textContent=v||"");}
function setLast(el,v){var nodes=[...el.childNodes].filter(n=>n.nodeType===3); if(nodes.length)nodes[nodes.length-1].textContent=" "+v; else el.append(" "+v);}
function formatMinutes(m){m=Math.round(m);return m>=60?`${Math.floor(m/60)} hr${Math.floor(m/60)===1?"":"s"}${m%60?" "+m%60+" min":""}`:`${m} min`;}
function esc(v){return String(v??"").replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[m]));}
function fail(e){console.error("[LMS Course Details]",e);alert(e.message||"Unable to load course details.");}
})();