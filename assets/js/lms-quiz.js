/* SCREENINGS4U LMS — SECURE QUIZ / ASSESSMENT */
(function(){"use strict";
let db,user,mode="quiz",attemptId,attemptNumber=0,meta={},questions=[],index=0;
const answers=new Map(),params=new URLSearchParams(location.search);
const enrollmentId=params.get("enrollment"),quizId=params.get("quiz"),assessmentId=params.get("assessment"),courseId=params.get("course"),lessonId=params.get("lesson");
document.addEventListener("DOMContentLoaded",()=>init().catch(fail));
async function init(){
 if(!window.LMS?.ready)throw new Error("Shared LMS authentication is unavailable.");
 ({client:db,user}=await window.LMS.ready);
 if(!enrollmentId)throw new Error("Missing LMS enrollment.");
 mode=assessmentId||params.get("type")==="final-assessment"?"assessment":"quiz";
 let link=document.getElementById("coursePlayerLink");if(link)link.href=playerUrl();
 let r;
 if(mode==="assessment"){
  if(!assessmentId)throw new Error("Missing assessment ID.");
  r=await db.rpc("lms_start_assessment_attempt",{p_assessment_id:assessmentId,p_enrollment_id:enrollmentId});
 }else{
  if(!quizId)throw new Error("Missing quiz ID.");
  r=await db.rpc("lms_start_quiz_attempt",{p_quiz_id:quizId,p_enrollment_id:enrollmentId});
 }
 if(r.error)throw r.error;
 let d=r.data||{};attemptId=d.attempt_id;attemptNumber=Number(d.attempt_number||1);meta=d.assessment||d.quiz||{};questions=Array.isArray(d.questions)?d.questions:[];
 if(!attemptId)throw new Error("The LMS did not create an attempt.");
 if(!questions.length)throw new Error("This knowledge check has no published questions.");
 setup();dots();render();
}
function setup(){
 let final=mode==="assessment";
 document.title=`${meta.title||(final?"Final Assessment":"Knowledge Check")} | Screenings4u Learning Center`;
 text("breadcrumbTitle",final?"Final Assessment":"Knowledge Check");text("quizType",final?"Final Comprehensive Assessment":"Module Knowledge Check");
 text("quizTitle",meta.title||(final?"Final Assessment":"Module Quiz"));text("quizDescription",meta.description||(final?"Complete the final assessment to demonstrate your understanding of the course.":"Complete this knowledge check before continuing."));
 text("sideTitle",meta.title||(final?"Final Assessment":"Module Quiz"));text("sideDescription",final?"This assessment covers knowledge from the complete training course.":"Answers are graded securely when this attempt is submitted.");
 text("questionCount",questions.length);text("passingScore",`${Number(meta.passing_score||80)}%`);
 let limit=Number(final?meta.max_attempts:meta.attempt_limit);text("attempts",limit?`Attempt ${attemptNumber} of ${limit}`:`Attempt ${attemptNumber} · Unlimited`);
}
function dots(){
 let l=document.getElementById("questionList");l.innerHTML=questions.map((_,i)=>`<button type="button" class="question-dot" data-go="${i}">${i+1}</button>`).join("");
 l.onclick=e=>{let b=e.target.closest("[data-go]");if(b){index=Number(b.dataset.go);render()}};
}
function render(){
 let q=questions[index],selected=answers.get(q.id)||null,pct=Math.round(((index+1)/questions.length)*100),opts=Array.isArray(q.options)?q.options:[];
 text("progressLabel",`Question ${index+1} of ${questions.length}`);text("progressPercent",pct+"%");document.getElementById("quizFill").style.width=pct+"%";
 let p=document.getElementById("questionPanel");
 p.innerHTML=`<div class="question-number">Question ${index+1}</div><h2>${esc(q.question_text)}</h2><div class="quiz-options">${opts.map((o,n)=>`<button type="button" class="quiz-option ${selected===o.id?"selected":""}" data-answer="${esc(o.id)}"><span class="option-letter">${String.fromCharCode(65+n)}</span><span class="option-copy">${esc(o.option_text)}</span></button>`).join("")}</div><div class="quiz-actions"><button type="button" class="quiz-btn quiz-btn-secondary" id="prevBtn" ${index===0?"disabled":""}>Previous Question</button><button type="button" class="quiz-btn quiz-btn-primary" id="nextBtn" ${selected?"":"disabled"}>${index===questions.length-1?"Submit Answers":"Next Question"}</button></div>`;
 p.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{answers.set(q.id,b.dataset.answer);render()});
 document.getElementById("prevBtn").onclick=()=>{if(index>0){index--;render()}};
 document.getElementById("nextBtn").onclick=()=>{if(!answers.get(q.id))return;if(index<questions.length-1){index++;render()}else confirmSubmit()};
 document.querySelectorAll(".question-dot").forEach((b,n)=>{b.classList.toggle("current",n===index);b.classList.toggle("answered",answers.has(questions[n].id)&&n!==index)});
}
function confirmSubmit(){
 let missing=questions.filter(q=>!answers.has(q.id));if(missing.length){index=questions.findIndex(q=>!answers.has(q.id));render();alert(`Please answer all questions before submitting. ${missing.length} remaining.`);return}
 if(confirm("Submit this attempt for grading? You will not be able to change these answers afterward."))submit().catch(fail);
}
async function submit(){
 document.querySelectorAll("#questionPanel button").forEach(b=>b.disabled=true);
 let payload=questions.map(q=>({question_id:q.id,selected_option_id:answers.get(q.id)||null,answer_text:null}));
 let r=mode==="assessment"?await db.rpc("lms_submit_assessment_attempt",{p_attempt_id:attemptId,p_answers:payload}):await db.rpc("lms_submit_quiz_attempt",{p_attempt_id:attemptId,p_answers:payload});
 if(r.error)throw r.error;result(r.data||{});
}
function result(r){
 let score=Number(r.score||0),passed=r.passed===true,required=Number(r.passing_score||meta.passing_score||80),p=document.getElementById("questionPanel");
 document.getElementById("quizFill").style.width="100%";text("progressPercent","100%");text("progressLabel","Attempt completed");
 p.innerHTML=`<div class="result-panel"><div class="result-icon">${passed?check():retry()}</div><h2>${passed?"Knowledge Check Passed":"Attempt Completed"}</h2><div class="result-score">${score.toFixed(score%1?2:0)}%</div><p>${passed?`You met the required score of ${required}%. Your result has been recorded in your LMS progress.`:`The required score is ${required}%. Your result has been recorded. Review the course material before another attempt if attempts remain.`}</p><div class="quiz-actions" style="justify-content:center;margin-top:28px;border-top:0"><a class="quiz-btn quiz-btn-secondary" href="${playerUrl()}">Return to Course</a>${passed&&mode==="assessment"?'<a class="quiz-btn quiz-btn-primary" href="lms-certificates.html">My Certificates</a>':`<a class="quiz-btn quiz-btn-primary" href="${playerUrl()}">${passed?"Continue Learning":"Review Course"}</a>`}</div></div>`;
}
function playerUrl(){let p=new URLSearchParams();if(courseId)p.set("course",courseId);if(enrollmentId)p.set("enrollment",enrollmentId);if(lessonId)p.set("lesson",lessonId);return "lms-course-player.html"+(p.toString()?"?"+p:"")}
function fail(e){console.error("[LMS Quiz]",e);let p=document.getElementById("questionPanel");if(p)p.innerHTML=`<div class="result-panel"><h2>Knowledge Check Unavailable</h2><p>${esc(e?.message||"Unable to load this knowledge check.")}</p><div class="quiz-actions" style="justify-content:center;margin-top:28px;border-top:0"><a class="quiz-btn quiz-btn-secondary" href="${playerUrl()}">Return to Course</a></div></div>`}
function text(i,v){let e=document.getElementById(i);if(e)e.textContent=v}
function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function check(){return '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>'}
function retry(){return '<svg viewBox="0 0 24 24"><path d="M20 6v5h-5"></path><path d="M19 11a7 7 0 1 0 1 5"></path></svg>'}
})();