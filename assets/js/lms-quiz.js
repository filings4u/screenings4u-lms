/* SCREENINGS4U LMS — SECURE QUIZ / ASSESSMENT */
(function(){"use strict";
window.__LMS_QUIZ_BUILD__="20260911-7";
console.info("[LMS Quiz] build 20260911-7");
let db,user,mode="quiz",attemptId,attemptNumber=0,meta={},questions=[],index=0,submittedReview=null;
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
async function confirmSubmit(){
 let missing=questions.filter(q=>!answers.has(q.id));
 if(missing.length){
  index=questions.findIndex(q=>!answers.has(q.id));render();
  if(window.S4UPopup?.info) await window.S4UPopup.info(`Please answer all questions before submitting. ${missing.length} remaining.`,`Questions Remaining`);
  else if(window.S4UUI?.modal) window.S4UUI.modal({title:"Questions Remaining",message:`Please answer all questions before submitting. ${missing.length} remaining.`,confirmText:"Continue"});
  return;
 }
 if(window.S4UPopup?.confirm){
  let ok=await window.S4UPopup.confirm("Submit this attempt for grading? You will not be able to change these answers afterward.",{title:"Submit Quiz",confirmText:"Submit Answers",cancelText:"Review Answers"});
  if(ok) submit().catch(fail);
  return;
 }
 if(window.S4UUI?.modal){
  window.S4UUI.modal({title:"Submit Quiz",message:"Submit this attempt for grading? You will not be able to change these answers afterward.",confirmText:"Submit Answers",cancelText:"Review Answers",showCancel:true,onConfirm:()=>submit()});
  return;
 }
 submit().catch(fail);
}
async function submit(){
 document.querySelectorAll("#questionPanel button").forEach(b=>b.disabled=true);
 let payload=questions.map(q=>({question_id:q.id,selected_option_id:answers.get(q.id)||null,answer_text:null}));
 let r=mode==="assessment"?await db.rpc("lms_submit_assessment_attempt",{p_attempt_id:attemptId,p_answers:payload}):await db.rpc("lms_submit_quiz_attempt",{p_attempt_id:attemptId,p_answers:payload});
 if(r.error)throw r.error;
 if(mode==="quiz"){
  let review=await db.rpc("lms_get_quiz_attempt_review",{p_attempt_id:attemptId});
  if(review.error)throw review.error;
  submittedReview=review.data||null;
 }
 result(r.data||{});
}
function result(r){
 let source=submittedReview||r||{},score=Number(source.score||0),passed=source.passed===true,required=Number(source.passing_score||meta.passing_score||80),p=document.getElementById("questionPanel");
 let reviewQuestions=Array.isArray(source.questions)?source.questions:[];
 let correctCount=reviewQuestions.filter(x=>x.is_correct===true).length;
 let totalCount=reviewQuestions.length||questions.length;
 document.getElementById("quizFill").style.width="100%";text("progressPercent","100%");text("progressLabel",passed?"Quiz passed":"Attempt completed");
 ensureReviewStyles();
 let summary=reviewQuestions.length?`<div class="quiz-result-summary">
   <div><strong>${esc(score.toFixed(score%1?2:0))}%</strong><span>Score</span></div>
   <div><strong>${correctCount}/${totalCount}</strong><span>Correct</span></div>
   <div><strong>${esc(required)}%</strong><span>Required</span></div>
   <div><strong>${esc(attemptNumber)}</strong><span>Attempt</span></div>
 </div>`:"";
 let review=reviewQuestions.length?`<section class="quiz-review"><div class="quiz-review-head"><div><span class="quiz-review-eyebrow">ANSWER REVIEW</span><h3>Review Your Answers</h3></div><span class="quiz-review-count">${correctCount} of ${totalCount} correct</span></div>${reviewQuestions.map((item,i)=>reviewCard(item,i)).join("")}</section>`:"";
 p.innerHTML=`<div class="result-panel quiz-result-complete"><div class="result-icon ${passed?"is-success":"is-retry"}">${passed?check():retry()}</div><div class="quiz-result-status ${passed?"passed":"not-passed"}">${passed?"PASSED":"REVIEW REQUIRED"}</div><h2>${passed?"Quiz Successfully Completed":"Attempt Completed"}</h2><div class="result-score">${score.toFixed(score%1?2:0)}%</div><p>${passed?`You passed this quiz. Your score and LMS progress have been saved successfully.`:`The required score is ${required}%. Your attempt and score have been saved. Review the answers below before trying again.`}</p>${summary}${review}<div class="quiz-actions quiz-result-actions"><a class="quiz-btn quiz-btn-secondary" href="${playerUrl()}">Return to Course</a>${passed&&mode==="assessment"?'<a class="quiz-btn quiz-btn-primary" href="lms-certificates.html">My Certificates</a>':`<a class="quiz-btn quiz-btn-primary" href="${playerUrl()}">${passed?"Continue Learning":"Review Course"}</a>`}</div></div>`;
 window.scrollTo({top:0,behavior:"smooth"});
}
function reviewCard(item,i){
 let good=item.is_correct===true;
 let correct=item.correct_answer?`<div class="quiz-review-answer correct-answer"><span>Correct answer</span><strong>${esc(item.correct_answer)}</strong></div>`:"";
 let explanation=item.explanation?`<div class="quiz-review-explanation"><strong>Explanation</strong><p>${esc(item.explanation)}</p></div>`:"";
 return `<article class="quiz-review-card ${good?"correct":"incorrect"}"><div class="quiz-review-question"><span class="quiz-review-number">${i+1}</span><div><span class="quiz-review-badge">${good?"✓ Correct":"✕ Incorrect"}</span><h4>${esc(item.question_text||"Question")}</h4></div></div><div class="quiz-review-answer"><span>Your answer</span><strong>${esc(item.selected_answer||"No answer")}</strong></div>${!good?correct:""}${explanation}</article>`;
}
function ensureReviewStyles(){
 if(document.getElementById("s4u-quiz-review-styles"))return;
 let s=document.createElement("style");s.id="s4u-quiz-review-styles";s.textContent=`
 .quiz-result-complete{max-width:920px!important;margin:0 auto}.quiz-result-status{display:inline-flex;padding:7px 12px;border-radius:999px;font-size:12px;font-weight:900;letter-spacing:.08em;margin:8px 0}.quiz-result-status.passed{background:#ecfdf5;color:#047857}.quiz-result-status.not-passed{background:#fff7ed;color:#c2410c}
 .quiz-result-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:24px 0 30px}.quiz-result-summary>div{border:1px solid #dbe3ee;border-radius:12px;padding:14px 10px;background:#fff}.quiz-result-summary strong{display:block;color:#173d78;font-size:20px}.quiz-result-summary span{display:block;color:#738096;font-size:11px;font-weight:800;margin-top:4px;text-transform:uppercase;letter-spacing:.05em}
 .quiz-review{text-align:left;margin-top:28px;border-top:1px solid #e4e9f0;padding-top:24px}.quiz-review-head{display:flex;justify-content:space-between;gap:14px;align-items:end;margin-bottom:14px}.quiz-review-eyebrow{font-size:11px;font-weight:900;letter-spacing:.1em;color:#ff6b00}.quiz-review-head h3{margin:4px 0 0;color:#12294d;font-size:22px}.quiz-review-count{font-size:13px;font-weight:800;color:#52647e}
 .quiz-review-card{border:1px solid #dfe6ef;border-left:4px solid #10b981;border-radius:12px;padding:16px;margin:12px 0;background:#fff}.quiz-review-card.incorrect{border-left-color:#ef4444}.quiz-review-question{display:grid;grid-template-columns:30px 1fr;gap:10px}.quiz-review-number{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#eef3fa;color:#244f91;font-size:12px;font-weight:900}.quiz-review-badge{font-size:12px;font-weight:900;color:#047857}.quiz-review-card.incorrect .quiz-review-badge{color:#b91c1c}.quiz-review-question h4{margin:4px 0 10px;color:#172b4d;font-size:15px;line-height:1.5}
 .quiz-review-answer{margin:8px 0 0 40px;padding:10px 12px;border-radius:9px;background:#f7f9fc}.quiz-review-answer span{display:block;color:#7b8798;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.quiz-review-answer strong{display:block;margin-top:4px;color:#243b5a;font-size:13px;line-height:1.45}.quiz-review-answer.correct-answer{background:#ecfdf5}.quiz-review-explanation{margin:10px 0 0 40px;color:#53647a;font-size:13px;line-height:1.5}.quiz-review-explanation p{margin:4px 0 0}.quiz-result-actions{justify-content:center;margin-top:28px;border-top:1px solid #e4e9f0;padding-top:24px}
 @media(max-width:700px){.quiz-result-summary{grid-template-columns:repeat(2,1fr)}.quiz-review-head{align-items:flex-start;flex-direction:column}.quiz-review-answer,.quiz-review-explanation{margin-left:0}.quiz-review-card{padding:14px}.quiz-review-question{grid-template-columns:28px 1fr}}
 `;document.head.appendChild(s);
}
function playerUrl(){let p=new URLSearchParams();if(courseId)p.set("course",courseId);if(enrollmentId)p.set("enrollment",enrollmentId);if(lessonId)p.set("lesson",lessonId);return "lms-course-player.html"+(p.toString()?"?"+p:"")}
function fail(e){console.error("[LMS Quiz]",e);let p=document.getElementById("questionPanel");if(p)p.innerHTML=`<div class="result-panel"><h2>Knowledge Check Unavailable</h2><p>${esc(e?.message||"Unable to load this knowledge check.")}</p><div class="quiz-actions" style="justify-content:center;margin-top:28px;border-top:0"><a class="quiz-btn quiz-btn-secondary" href="${playerUrl()}">Return to Course</a></div></div>`}
function text(i,v){let e=document.getElementById(i);if(e)e.textContent=v}
function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function check(){return '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>'}
function retry(){return '<svg viewBox="0 0 24 24"><path d="M20 6v5h-5"></path><path d="M19 11a7 7 0 1 0 1 5"></path></svg>'}
})();