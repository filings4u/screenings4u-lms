(function(){
'use strict';
const STRIPE_KEY='pk_live_51U8CQJEHE8bc4Otur9RVR1HsajJbmSbmRr5z0jGw1v5jgrKrzmnaaRTIV5v5CbEZIwFJLujrU0AI3lOZFDaNg4CG005XAPqkx3';
let stripe,elements,orderId,courseId;
const $=id=>document.getElementById(id);
const COURSE_DETAILS={
'57d40c19-6232-4e18-88fc-e864f4aa855d':{summary:'Self-paced DOT collector training covering 49 CFR Part 40, collection procedures, documentation and required mock collections.',items:['3 hours of structured DOT Specimen Collector Training','5 DOT online video mock collections','49 CFR Part 40-focused curriculum','DOT collector requirements and responsibilities','Collection site security and required supplies','Custody & Control Form (CCF) completion','Urine specimen collection procedures','Monitored and direct observation collections','Shy bladder and problem specimen procedures','Training materials, guides and forms','Completion certificate after five error-free mock collections']},
'2718cf98-a318-42ee-bebc-ad5b9ee2b6de':{summary:'DOT Urine Specimen Collector Training plus Hair Collection Training in one package.',items:['Everything included in DOT Specimen Collector Training','5 DOT online video mock collections','Hair Drug Test Training','Hair specimen collection procedures','Urine and hair Chain of Custody procedures','DOT Specimen Collector Certificate pathway','Hair Collector Certificate','Training materials, guides and forms','60-day Learning Center access']},
'c454e0ec-3087-4388-a538-5a5c6bf1cf0d':{summary:'DOT Specimen Collector Training plus trainer materials so you can train other collectors.',items:['Complete DOT Specimen Collector Training curriculum','5 error-free mock collection requirement','Instructor / trainer materials','Ability to train other collectors','Instructor Certificate','Chain of custody and specimen integrity procedures','Collection site security and donor confidentiality','Training materials, guides and forms','60-day Learning Center access']},
'd065de33-a16d-48de-ba0c-0a490b2039f1':{summary:'Train-the-Trainer program plus Hair Collector Training and Hair Collector Certificate.',items:['Everything in DOT Specimen Collector Train the Trainer','Instructor / trainer materials','Ability to train other collectors','Instructor Certificate','Hair Drug Test Training','Hair specimen collection procedures','Hair Collector Certificate','5 error-free DOT mock collections','Training materials, guides and forms','60-day Learning Center access']}
};
function renderDetails(data){const d=COURSE_DETAILS[courseId];const list=$('courseIncludes');if(data.purchaseType==='supplies'){ $('courseSummary').textContent=data.serviceDescription||'Collector training supplies for required mock collections.';$('accessLine').textContent='Physical kit + digital downloads';$('requirementsBlock').style.display='none';const items=data.serviceMetadata?.includes||[];list.innerHTML=items.map(x=>'<li>'+x+'</li>').join('');return;}if(d){$('courseSummary').textContent=d.summary;list.innerHTML=d.items.map(x=>'<li>'+x+'</li>').join('');} $('accessLine').textContent='Single learner · '+(data.timeLimitDays||60)+'-day access';}

function status(msg,type='err'){const el=$('status');el.textContent=msg;el.className='status '+type;}
function money(n,c='usd'){return new Intl.NumberFormat('en-US',{style:'currency',currency:String(c).toUpperCase()}).format(Number(n||0));}
async function session(){try{const c=await window.getScreenings4uSupabase?.();if(!c)return {client:null,session:null};const r=await c.auth.getSession();return {client:c,session:r.data?.session||null};}catch{return {client:null,session:null}}}
async function start(){
 const params=new URLSearchParams(location.search);courseId=params.get('course')||'';window.trainingServiceId=params.get('service')||'';
 if(!courseId&&!window.trainingServiceId){status('No training course or product was selected.');return;}
 const auth=await session();
 if(auth.session?.user){$('email').value=auth.session.user.email||'';$('email').readOnly=true;}
 const email=$('email').value.trim();
 if(!auth.session && !email){$('payButton').disabled=false;$('payButton').textContent='Continue to Payment';$('payButton').onclick=initializeGuest;return;}
 await initialize(auth);
}
async function initializeGuest(){if(!$('email').value.trim()){status('Enter your email address to continue.');return;}$('payButton').disabled=true;await initialize(await session());}
async function initialize(auth){
 try{
  status('Preparing secure checkout...','ok');
  const headers={'Content-Type':'application/json','apikey':window.SCREENINGS4U_SUPABASE_ANON_KEY};
  if(auth.session?.access_token)headers.Authorization='Bearer '+auth.session.access_token;
  const r=await fetch(window.SCREENINGS4U_SUPABASE_URL+'/functions/v1/lms-create-payment-intent',{method:'POST',headers,body:JSON.stringify({courseId,serviceId:window.trainingServiceId,customer:{firstName:$('firstName').value.trim(),lastName:$('lastName').value.trim(),email:$('email').value.trim(),phone:$('phone').value.trim()}})});
  const data=await r.json();
  if(!r.ok){if(data.alreadyEnrolled){location.href='lms-my-courses.html';return;}throw new Error(data.error||'Unable to start checkout.');}
  orderId=data.orderId;$('courseName').textContent=data.courseName||data.serviceName||'Training Course';$('coursePrice').textContent=money(data.total,data.currency);renderDetails(data);if(data.customerEmail){$('email').value=data.customerEmail;$('email').readOnly=true;}
  stripe=Stripe(STRIPE_KEY);elements=stripe.elements({clientSecret:data.clientSecret,appearance:{theme:'stripe',variables:{colorPrimary:'#ff6500',borderRadius:'9px'}}});elements.create('payment').mount('#payment-element');
  $('payButton').disabled=false;$('payButton').textContent='Pay '+money(data.total,data.currency)+' & Enroll';$('payButton').onclick=pay;$('status').className='status';
 }catch(e){console.error(e);status(e.message||'Unable to load checkout.');$('payButton').disabled=false;}
}
async function pay(){
 $('payButton').disabled=true;status('Processing payment...','ok');
 const result=await stripe.confirmPayment({elements,confirmParams:{return_url:new URL('lms-orders.html?payment=success&order='+encodeURIComponent(orderId),location.origin+'/').href}});
 if(result.error){status(result.error.message||'Payment could not be completed.');$('payButton').disabled=false;}
}
document.addEventListener('DOMContentLoaded',start);
})();
