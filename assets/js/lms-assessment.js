/* SCREENINGS4U LMS — FINAL ASSESSMENT GATE */
(function(){
"use strict";
var s={db:null,user:null,enrollment:null,course:null,assessment:null,questions:[],attempts:[],progress:0};
document.addEventListener("DOMContentLoaded",function(){init().catch(fail);});
async function init(){
 if(!window.LMS||!window.LMS.ready)throw new Error("Shared LMS authentication is unavailable.");
 var a=await window.LMS.ready;s.db=a.client;s.user=a.user;
 var p=new URLSearchParams(location.search),eid=p.get("enrollment")||"",cid=p.get("course")||"",aid=p.get("assessment")||"";
 var q=s.db.from("lms_enrollments").select("*").eq("user_id",s.user.id);
 if(eid)q=q.eq("id",eid);else if(cid)q=q.eq("course_id",cid);else throw new Error("A course or enrollment ID is required.");
 var er=await q.in("status",["active","completed"]).limit(1).maybeSingle();if(er.error)throw er.error;if(!er.data)throw new Error("No learner enrollment was found for this course.");s.enrollment=er.data;
 var cr=await s.db.from("lms_courses").select("*").eq("id",s.enrollment.course_id).single();if(cr.error)throw cr.error;s.course=cr.data;
 await progress();
 var sr=await s.db.from("lms_sections").select("id").eq("course_id",s.course.id);if(sr.error)throw sr.error;
 var sectionIds=(sr.data||[]).map(x=>x.id),lessonIds=[];
 if(sectionIds.length){var lr=await s.db.from("lms_lessons").select("id").in("section_id",sectionIds);if(lr.error)throw lr.error;lessonIds=(lr.data||[]).map(x=>x.id);}
 if(aid){var ar=await s.db.from("lms_assessments").select("*").eq("id",aid).maybeSingle();if(ar.error)throw ar.error;s.assessment=ar.data;}
 else if(lessonIds.length){var ar2=await s.db.from("lms_assessments").select("*").in("lesson_id",lessonIds).eq("status","published").order("created_at",{ascending:false}).limit(1).maybeSingle();if(ar2.error)throw ar2.error;s.assessment=ar2.data;}
 if(s.assessment){
  var qr=await s.db.from("lms_assessment_questions").select("id").eq("assessment_id",s.assessment.id);if(qr.error)throw qr.error;s.questions=qr.data||[];
  var tr=await s.db.from("lms_assessment_attempts").select("*").eq("assessment_id",s.assessment.id).eq("enrollment_id",s.enrollment.id).eq("user_id",s.user.id).order("attempt_number",{ascending:false});if(tr.error)throw tr.error;s.attempts=tr.data||[];
 }
 render();bind();
}
async function progress(){
 var sr=await s.db.from("lms_sections").select("id").eq("course_id",s.course.id);if(sr.error)throw sr.error;var ids=(sr.data||[]).map(x=>x.id);
 if(!ids.length){s.progress=Number(s.enrollment.progress_percent||0);return;}
 var lr=await s.db.from("lms_lessons").select("id,is_required").in("section_id",ids);if(lr.error)throw lr.error;var required=(lr.data||[]).filter(x=>x.is_required!==false);
 if(!required.length){s.progress=100;return;}
 var pr=await s.db.from("lms_lesson_progress").select("lesson_id,completed_at,is_completed").eq("enrollment_id",s.enrollment.id).in("lesson_id",required.map(x=>x.id));if(pr.error)throw pr.error;
 var done=new Set((pr.data||[]).filter(x=>x.completed_at||x.is_completed).map(x=>x.lesson_id));s.progress=Math.round(required.filter(x=>done.has(x.id)).length/required.length*100);
}
function render(){
 text("[data-assessment-course]",s.course.title||"Training Course");
 var links=document.querySelectorAll("[data-course-review-link]");links.forEach(x=>x.href="lms-course-player.html?course="+encodeURIComponent(s.course.id)+"&enrollment="+encodeURIComponent(s.enrollment.id));
 text("[data-content-progress]",s.progress+"%");var fill=document.querySelector("[data-content-progress-fill]");if(fill)fill.style.width=s.progress+"%";
 text("[data-summary-modules]",s.progress>=100?"Completed":s.progress+"% Complete");text("[data-content-progress-note]",s.progress>=100?"All required learning modules have been completed.":"Complete all required lessons before starting the final assessment.");
 var b=document.querySelector("[data-begin-assessment]");
 if(!s.assessment){text("[data-assessment-title]","Final Assessment");text("[data-assessment-time]","Not configured");text("[data-assessment-passing]","Not configured");text("[data-assessment-length]","0 questions");text("[data-assessment-attempts]","Not configured");text("[data-summary-passing]","—");text("[data-summary-time]","—");text("[data-summary-attempts]","—");if(b){b.disabled=true;b.textContent="Assessment Not Available";}return;}
 text("[data-assessment-title]",s.assessment.title||"Final Assessment");
 var pass=Number(s.assessment.passing_score||s.course.passing_score||0),mins=Number(s.assessment.time_limit_minutes||0),max=Number(s.assessment.max_attempts||0),used=s.attempts.length,remaining=max?Math.max(0,max-used):"Unlimited";
 text("[data-assessment-time]",mins?mins+" minutes":"No time limit");text("[data-assessment-passing]",pass?"Minimum score of "+pass+"%":"No passing score set");text("[data-assessment-length]",s.questions.length+" "+(s.questions.length===1?"question":"questions"));text("[data-assessment-attempts]",remaining==="Unlimited"?"Unlimited attempts":remaining+" attempts remaining");
 text("[data-summary-passing]",pass?pass+"%":"—");text("[data-summary-time]",mins?mins+" min":"No limit");text("[data-summary-attempts]",String(remaining));
 var blocked=s.progress<100||!s.questions.length||(remaining!== "Unlimited"&&remaining<=0);if(b){b.disabled=blocked;if(s.progress<100)b.textContent="Complete Course First";else if(!s.questions.length)b.textContent="Assessment Has No Questions";else if(remaining!== "Unlimited"&&remaining<=0)b.textContent="No Attempts Remaining";}
}
function bind(){
 var b=document.querySelector("[data-begin-assessment]"),m=document.querySelector("[data-assessment-modal]"),c=document.querySelector("[data-close-assessment-modal]"),go=document.querySelector("[data-confirm-assessment]");
 if(b)b.onclick=function(){if(!b.disabled&&m){m.hidden=false;if(go)go.focus();}};
 if(c)c.onclick=function(){if(m)m.hidden=true;};
 if(m)m.onclick=function(e){if(e.target===m)m.hidden=true;};
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&m&&!m.hidden)m.hidden=true;});
 if(go)go.onclick=start;
}
async function start(){
 if(!s.assessment)return;
 var max=Number(s.assessment.max_attempts||0),used=s.attempts.length;if(max&&used>=max)return;
 var n=used+1,r=await s.db.from("lms_assessment_attempts").insert({assessment_id:s.assessment.id,enrollment_id:s.enrollment.id,user_id:s.user.id,attempt_number:n,started_at:new Date().toISOString()}).select("id").single();
 if(r.error)throw r.error;
 location.href="lms-quiz.html?type=final-assessment&assessment="+encodeURIComponent(s.assessment.id)+"&attempt="+encodeURIComponent(r.data.id)+"&course="+encodeURIComponent(s.course.id)+"&enrollment="+encodeURIComponent(s.enrollment.id);
}
function text(q,v){document.querySelectorAll(q).forEach(x=>x.textContent=v==null?"":String(v));}
function fail(e){console.error("[LMS Assessment]",e);var b=document.querySelector("[data-begin-assessment]");if(b){b.disabled=true;b.textContent="Assessment Unavailable";}alert(e.message||"Unable to load assessment.");}
})();