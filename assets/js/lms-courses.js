/* SCREENINGS4U LMS — LIVE COURSE LIBRARY */
(function(){"use strict";
let db,user,courses=[],enrollments=new Map(),stats=new Map();
document.addEventListener("DOMContentLoaded",()=>init().catch(fail));
async function init(){
 if(!window.LMS?.ready)throw new Error("Shared LMS authentication is unavailable.");
 ({client:db,user}=await window.LMS.ready);
 let r=await db.from("lms_courses").select("*").eq("status","published").order("published_at",{ascending:false});
 if(r.error)throw r.error; courses=r.data||[];
 r=await db.from("lms_enrollments").select("*").eq("user_id",user.id).in("status",["active","completed"]);
 if(!r.error)(r.data||[]).forEach(x=>enrollments.set(x.course_id,x));
 if(courses.length){
  let s=await db.from("lms_sections").select("id,course_id").in("course_id",courses.map(c=>c.id)).eq("is_published",true);
  if(!s.error&&s.data?.length){
   let map=new Map(s.data.map(x=>[x.id,x.course_id]));
   let l=await db.from("lms_lessons").select("id,section_id,estimated_minutes").in("section_id",s.data.map(x=>x.id)).eq("status","published");
   if(!l.error)(l.data||[]).forEach(x=>{let id=map.get(x.section_id),v=stats.get(id)||{count:0,minutes:0};v.count++;v.minutes+=Number(x.estimated_minutes)||0;stats.set(id,v);});
  }
 }
 categories(); bind(); render();
}
const cat=c=>c.metadata?.category||"Training";
const url=c=>"lms-course-details.html?course="+encodeURIComponent(c.id);
function duration(c){let x=stats.get(c.id)||{count:0,minutes:0},a=[x.minutes?fmt(x.minutes):"Self-paced"];if(x.count)a.push(x.count+" lesson"+(x.count===1?"":"s"));return a.join(" · ")}
function action(c){let e=enrollments.get(c.id);return e?(e.status==="completed"?"Review Course":"Continue Course"):"View Course"}
function status(c){let e=enrollments.get(c.id);return e?(e.status==="completed"?"Completed":Math.round(Number(e.progress_percent)||0)+"% complete"):"Available now"}
function render(){
 let q=(document.querySelector("#courseSearch")?.value||"").trim().toLowerCase(),cv=document.querySelector("#courseCategory")?.value||"all",sv=document.querySelector("#courseSort")?.value||"newest";
 let a=courses.filter(c=>(cv==="all"||cat(c)===cv)&&(!q||[c.title,c.short_description,c.description,cat(c)].join(" ").toLowerCase().includes(q)));
 a.sort((x,y)=>sv==="title-asc"?(x.title||"").localeCompare(y.title||""):sv==="title-desc"?(y.title||"").localeCompare(x.title||""):new Date(y.published_at||y.created_at)-new Date(x.published_at||x.created_at));
 document.querySelector("#coursesGrid").innerHTML=a.map(card).join("");
 document.querySelector("#availableCourseCount").textContent=courses.length;
 document.querySelector("#coursesResultsCount").textContent=a.length+" course"+(a.length===1?"":"s");
 document.querySelector("#coursesEmpty").hidden=!!a.length;
 featured();
}
function featured(){let c=courses.find(x=>x.metadata?.featured===true)||courses[0],sec=document.querySelector(".courses-featured-section");if(!c){if(sec)sec.hidden=true;return}sec.hidden=false;document.querySelector(".courses-featured-title").textContent=c.title;document.querySelector(".courses-featured-description").textContent=c.short_description||c.description||"";let m=document.querySelectorAll(".courses-featured-meta span");if(m[0])last(m[0],"Self-paced");if(m[1])last(m[1],duration(c));let a=document.querySelector(".courses-featured-button");a.href=url(c);let t=[...a.childNodes].find(n=>n.nodeType===3);if(t)t.textContent=" "+action(c)+" ";}
function card(c){return `<article class="course-card"><div class="course-card-cover"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M7 8h10"></path><path d="M7 12h7"></path></svg></div><div class="course-card-body"><div class="course-card-category">${esc(cat(c))}</div><h3 class="course-card-title">${esc(c.title)}</h3><p class="course-card-description">${esc(c.short_description||c.description||"")}</p><div class="course-card-meta">${esc(duration(c))}</div><div class="course-card-footer"><span class="course-card-status">${esc(status(c))}</span><a href="${url(c)}" class="course-card-action">${action(c)}</a></div></div></article>`}
function categories(){let s=document.querySelector("#courseCategory");s.innerHTML='<option value="all">All Categories</option>'+[...new Set(courses.map(cat))].sort().map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}
function bind(){["courseSearch","courseCategory","courseSort"].forEach(id=>document.getElementById(id)?.addEventListener(id==="courseSearch"?"input":"change",render));document.querySelector("#coursesClearFilters")?.addEventListener("click",()=>{courseSearch.value="";courseCategory.value="all";courseSort.value="newest";render()})}
function fmt(m){m=Math.round(m);return m>=60?`${Math.floor(m/60)} hr${Math.floor(m/60)===1?"":"s"}${m%60?" "+m%60+" min":""}`:`${m} min`}
function last(e,v){let n=[...e.childNodes].filter(x=>x.nodeType===3);if(n.length)n[n.length-1].textContent=" "+v;else e.append(" "+v)}
function esc(v){return String(v??"").replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[m]))}
function fail(e){console.error("[LMS Courses]",e);let g=document.querySelector("#coursesGrid");if(g)g.innerHTML=`<div class="courses-empty"><h3>Unable to load courses</h3><p>${esc(e.message||"Please try again.")}</p></div>`}
})();