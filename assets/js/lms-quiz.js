/* SCREENINGS4U LMS — SECURE QUIZ / ASSESSMENT */
(function(){"use strict";
let db,user,mode="quiz",attemptId,attemptNumber=0,meta={},questions=[],index=0;
let submittedReview=[];
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
 let missing=questions.filter(q=>!answers.has(q.id));
 if(missing.length){
  index=questions.findIndex(q=>!answers.has(q.id));render();
  notify(`Please answer all questions before submitting. ${missing.length} remaining.`,"Incomplete Knowledge Check","info");return;
 }
 askSubmit().then(ok=>{if(ok)submit().catch(fail)});
}
function notify(message,title="Screenings4u",type="info"){
 if(window.S4UPopup&&typeof window.S4UPopup[type]==="function")return window.S4UPopup[type](message,title);
 if(window.S4UUI&&typeof window.S4UUI.modal==="function")return window.S4UUI.modal({title,message,type,confirmText:"OK"});
 window.alert(message);
}
function askSubmit(){
 return new Promise(resolve=>{
  if(window.S4UUI&&typeof window.S4UUI.confirm==="function"){
   window.S4UUI.confirm({title:"Submit Knowledge Check?",message:"Submit this attempt for grading? You will not be able to change these answers afterward.",confirmText:"Submit Answers",cancelText:"Keep Reviewing",onConfirm:()=>resolve(true),onCancel:()=>resolve(false)});return;
  }
  resolve(window.confirm("Submit this attempt for grading? You will not be able to change these answers afterward."));
 });
}
async function submit(){
 document.querySelectorAll("#questionPanel button").forEach(b=>b.disabled=true);
 let payload=questions.map(q=>({question_id:q.id,selected_option_id:answers.get(q.id)||null,answer_text:null}));
 let r=mode==="assessment"?await db.rpc("lms_submit_assessment_attempt",{p_attempt_id:attemptId,p_answers:payload}):await db.rpc("lms_submit_quiz_attempt",{p_attempt_id:attemptId,p_answers:payload});
 if(r.error)throw r.error;
 await loadReview();
 result(r.data||{});
}
async function loadReview(){
 submittedReview=[];
 try{
  if(mode==="assessment"){
   let {data,error}=await db.from("lms_assessment_attempt_answers").select("question_id,selected_option_id,is_correct,points_awarded").eq("attempt_id",attemptId);
   if(error)throw error; submittedReview=Array.isArray(data)?data:[];
  }else{
   let {data,error}=await db.from("lms_quiz_answers").select("question_id,selected_option_id,is_correct,points_awarded").eq("attempt_id",attemptId);
   if(error)throw error; submittedReview=Array.isArray(data)?data:[];
  }
 }catch(e){console.warn("[LMS Quiz] Answer review unavailable",e);}
}
function reviewMarkup(showCorrectAnswers=true){
 let rows=questions.map((q,i)=>{
  let graded=submittedReview.find(a=>a.question_id===q.id),selectedId=graded?.selected_option_id||answers.get(q.id),opts=Array.isArray(q.options)?q.options:[],selected=opts.find(o=>o.id===selectedId),correct=opts.find(o=>o.is_correct===true),ok=graded?graded.is_correct===true:(selected&&correct&&selected.id===correct.id);
  return `<article class="s4u-answer-review ${ok?"is-correct":"is-wrong"}"><div class="s4u-answer-review__top"><span class="s4u-answer-review__number">Question ${i+1}</span><span class="s4u-answer-review__status">${ok?"✓ Correct":"✕ Incorrect"}</span></div><h3>${esc(q.question_text)}</h3><div class="s4u-answer-line"><strong>Your answer:</strong> ${esc(selected?.option_text||"No answer recorded")}</div>${!ok&&showCorrectAnswers&&correct?`<div class="s4u-answer-line s4u-answer-line--correct"><strong>Correct answer:</strong> ${esc(correct.option_text)}</div>`:""}</article>`;
 }).join("");
 return `<section class="s4u-review"><div class="s4u-review__heading"><div><span class="s4u-review__eyebrow">Answer Review</span><h2>See how you did</h2></div><p>Green answers were correct. Missed questions show the correct answer below your selection.</p></div><div class="s4u-review__list">${rows}</div></section>`;
}
function ensureReviewStyles(){
 if(document.getElementById("s4u-quiz-review-style"))return;
 let st=document.createElement("style");st.id="s4u-quiz-review-style";st.textContent=`.s4u-review{margin-top:32px;text-align:left}.s4u-review__heading{padding:24px;border:1px solid #dbe4ea;border-radius:18px;background:#f8fafc;margin-bottom:16px}.s4u-review__heading h2{margin:4px 0 8px;color:#0f172a}.s4u-review__heading p{margin:0;color:#64748b}.s4u-review__eyebrow{color:#059669;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.s4u-review__list{display:grid;gap:14px}.s4u-answer-review{border:1px solid #e2e8f0;border-left:5px solid #10b981;border-radius:16px;padding:20px;background:#fff}.s4u-answer-review.is-wrong{border-left-color:#ef4444;background:#fffafa}.s4u-answer-review__top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}.s4u-answer-review__number{font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.06em}.s4u-answer-review__status{font-weight:800;color:#059669}.s4u-answer-review.is-wrong .s4u-answer-review__status{color:#dc2626}.s4u-answer-review h3{font-size:16px;line-height:1.5;margin:0 0 14px;color:#0f172a}.s4u-answer-line{padding:11px 13px;border-radius:10px;background:#f1f5f9;color:#334155;margin-top:8px;line-height:1.5}.s4u-answer-line--correct{background:#ecfdf5;color:#065f46}@media(max-width:640px){.s4u-answer-review__top{align-items:flex-start;flex-direction:column}.s4u-review__heading,.s4u-answer-review{padding:16px}}`;document.head.appendChild(st);
}
function result(r){
 let score=Number(r.score||0),passed=r.passed===true,required=Number(r.passing_score||meta.passing_score||80),p=document.getElementById("questionPanel"),showCorrect=r.show_correct_answers!==false;
 ensureReviewStyles();document.getElementById("quizFill").style.width="100%";text("progressPercent","100%");text("progressLabel","Attempt completed");
 p.innerHTML=`<div class="result-panel"><div class="result-icon">${passed?check():retry()}</div><h2>${passed?"Knowledge Check Passed":"Attempt Completed"}</h2><div class="result-score">${score.toFixed(score%1?2:0)}%</div><p>${passed?`You met the required score of ${required}%. Your result has been recorded in your LMS progress.`:`The required score is ${required}%. Your result has been recorded. Review the answers below before another attempt.`}</p>${reviewMarkup(showCorrect)}<div class="quiz-actions" style="justify-content:center;margin-top:28px"><a class="quiz-btn quiz-btn-secondary" href="${playerUrl()}">Return to Course</a>${passed&&mode==="assessment"?'<a class="quiz-btn quiz-btn-primary" href="lms-certificates.html">My Certificates</a>':`<a class="quiz-btn quiz-btn-primary" href="${playerUrl()}">${passed?"Continue Learning":"Review Course"}</a>`}</div></div>`;
}
function playerUrl(){let p=new URLSearchParams();if(courseId)p.set("course",courseId);if(enrollmentId)p.set("enrollment",enrollmentId);if(lessonId)p.set("lesson",lessonId);return "lms-course-player.html"+(p.toString()?"?"+p:"")}
function fail(e){console.error("[LMS Quiz]",e);let p=document.getElementById("questionPanel");if(p)p.innerHTML=`<div class="result-panel"><h2>Knowledge Check Unavailable</h2><p>${esc(e?.message||"Unable to load this knowledge check.")}</p><div class="quiz-actions" style="justify-content:center;margin-top:28px;border-top:0"><a class="quiz-btn quiz-btn-secondary" href="${playerUrl()}">Return to Course</a></div></div>`}
function text(i,v){let e=document.getElementById(i);if(e)e.textContent=v}
function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function check(){return '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>'}
function retry(){return '<svg viewBox="0 0 24 24"><path d="M20 6v5h-5"></path><path d="M19 11a7 7 0 1 0 1 5"></path></svg>'}
})();