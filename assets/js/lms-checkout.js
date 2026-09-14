(function(){
'use strict';
const STRIPE_KEY='pk_live_51U8CQJEHE8bc4Otur9RVR1HsajJbmSbmRr5z0jGw1v5jgrKrzmnaaRTIV5v5CbEZIwFJLujrU0AI3lOZFDaNg4CG005XAPqkx3';
let stripe,elements,orderId,courseId;
const $=id=>document.getElementById(id);
const COURSE_DETAILS={
'57d40c19-6232-4e18-88fc-e864f4aa855d':{title:'DOT Specimen Collector Training',price:320,summary:'Self-paced DOT collector training covering 49 CFR Part 40, collection procedures, documentation and required mock collections.',items:['3 hours of structured DOT Specimen Collector Training','5 DOT online video mock collections','49 CFR Part 40-focused curriculum','DOT collector requirements and responsibilities','Collection site security and required supplies','Custody & Control Form (CCF) completion','Urine specimen collection procedures','Monitored and direct observation collections','Shy bladder and problem specimen procedures','Training materials, guides and forms','Completion certificate after five error-free mock collections']},
'2718cf98-a318-42ee-bebc-ad5b9ee2b6de':{title:'DOT Urine Specimen Collector Training Plus Hair Collector Training',price:360,summary:'DOT Urine Specimen Collector Training plus Hair Collection Training in one package.',items:['Everything included in DOT Specimen Collector Training','5 DOT online video mock collections','Hair Drug Test Training','Hair specimen collection procedures','Urine and hair Chain of Custody procedures','DOT Specimen Collector Certificate pathway','Hair Collector Certificate','Training materials, guides and forms','60-day Learning Center access']},
'c454e0ec-3087-4388-a538-5a5c6bf1cf0d':{title:'DOT Specimen Collector Train the Trainer',price:550,summary:'DOT Specimen Collector Training plus trainer materials so you can train other collectors.',items:['Complete DOT Specimen Collector Training curriculum','5 error-free mock collection requirement','Instructor / trainer materials','Ability to train other collectors','Instructor Certificate','Chain of custody and specimen integrity procedures','Collection site security and donor confidentiality','Training materials, guides and forms','60-day Learning Center access']},
'd065de33-a16d-48de-ba0c-0a490b2039f1':{title:'DOT Specimen Collector Train the Trainer Plus Hair Collector Training',price:600,summary:'Train-the-Trainer program plus Hair Collector Training and Hair Collector Certificate.',items:['Everything in DOT Specimen Collector Train the Trainer','Instructor / trainer materials','Ability to train other collectors','Instructor Certificate','Hair Drug Test Training','Hair specimen collection procedures','Hair Collector Certificate','5 error-free DOT mock collections','Training materials, guides and forms','60-day Learning Center access']}
};
const SUPPLIES_DETAILS={title:'Specimen Collector Training Supplies',price:75,summary:'The supplies DOT Specimen Collector Training students need to complete their five required mock collections.',items:['5 DOT Collection Kits','10 Federal Custody and Control Forms (CCFs)','Mock Collection Checklist - Digital Download','Mock Procedures - Digital Download','Collection Site Security - Digital Download','Memorandum for Record - Digital Download','1 Ball Point Pen','2 Pair of NON Latex Gloves']};
const PRODUCT_DETAILS={
 dot_specimen_group_5:{title:'DOT Specimen Collector Training — Group 5',price:1500,access:'5 learner seats · 60-day access per learner',summary:'Purchase five learner seats for DOT Specimen Collector Training.',items:['5 DOT Specimen Collector Training learner seats','60-day access for each enrolled learner','49 CFR Part 40-focused curriculum','Required mock-collection pathway','Individual learner progress and completion records']},
 dot_specimen_group_10:{title:'DOT Specimen Collector Training — Group 10',price:2800,access:'10 learner seats · 60-day access per learner',summary:'Purchase ten learner seats for DOT Specimen Collector Training.',items:['10 DOT Specimen Collector Training learner seats','60-day access for each enrolled learner','49 CFR Part 40-focused curriculum','Required mock-collection pathway','Individual learner progress and completion records']},
 dot_specimen_group_25:{title:'DOT Specimen Collector Training — Group 25',price:6250,access:'25 learner seats · 60-day access per learner',summary:'Purchase twenty-five learner seats for DOT Specimen Collector Training.',items:['25 DOT Specimen Collector Training learner seats','60-day access for each enrolled learner','49 CFR Part 40-focused curriculum','Required mock-collection pathway','Individual learner progress and completion records']},
 training_course_extension_30_days:{title:'30-Day Course Access Extension',price:100,access:'30 additional days',summary:'Add 30 days of access to the Learning Center course you selected.',items:['30 additional days added automatically after successful payment','Extension applies to the selected existing enrollment','Updated expiration date appears in My Learning','Purchase another extension later if additional time is needed']}
};
function preloadDetails(){
 const list=$('courseIncludes');
 if(window.trainingServiceId==='specimen_collector_training_supplies'){
  const d=SUPPLIES_DETAILS;$('courseName').textContent=d.title;$('courseSummary').textContent=d.summary;$('coursePrice').textContent=money(d.price,'usd');$('accessLine').textContent='Physical kit + digital downloads';$('requirementsBlock').style.display='none';list.innerHTML=d.items.map(x=>'<li>'+x+'</li>').join('');return;
 }
 if(PRODUCT_DETAILS[window.trainingServiceId]){const d=PRODUCT_DETAILS[window.trainingServiceId];$('courseName').textContent=d.title;$('courseSummary').textContent=d.summary;$('coursePrice').textContent=money(d.price,'usd');$('accessLine').textContent=d.access;$('requirementsBlock').style.display=window.trainingServiceId==='training_course_extension_30_days'?'none':'block';list.innerHTML=d.items.map(x=>'<li>'+x+'</li>').join('');return;}
 const d=COURSE_DETAILS[courseId];
 if(!d){$('courseName').textContent='Training course';$('courseSummary').textContent='Course details could not be loaded. Please return to Training Options and select the course again.';list.innerHTML='<li>Unable to identify this training course.</li>';return;}
 $('courseName').textContent=d.title;$('courseSummary').textContent=d.summary;$('coursePrice').textContent=money(d.price,'usd');$('accessLine').textContent='Single learner · 60-day access';list.innerHTML=d.items.map(x=>'<li>'+x+'</li>').join('');
}
function renderDetails(data){const d=COURSE_DETAILS[courseId];const list=$('courseIncludes');if(data.purchaseType==='supplies'){ $('courseSummary').textContent=data.serviceDescription||'Collector training supplies for required mock collections.';$('accessLine').textContent='Physical kit + digital downloads';$('requirementsBlock').style.display='none';const items=data.serviceMetadata?.includes||[];list.innerHTML=items.map(x=>'<li>'+x+'</li>').join('');return;}if(d){$('courseSummary').textContent=d.summary;list.innerHTML=d.items.map(x=>'<li>'+x+'</li>').join('');} $('accessLine').textContent='Single learner · '+(data.timeLimitDays||60)+'-day access';}

function status(msg,type='err'){const el=$('status');el.textContent=msg;el.className='status '+type;}
function money(n,c='usd'){return new Intl.NumberFormat('en-US',{style:'currency',currency:String(c).toUpperCase()}).format(Number(n||0));}
async function session(){try{const c=await window.getScreenings4uSupabase?.();if(!c)return {client:null,session:null};const r=await c.auth.getSession();return {client:c,session:r.data?.session||null};}catch{return {client:null,session:null}}}
async function start(){
 const params=new URLSearchParams(location.search);courseId=params.get('course')||'';window.trainingServiceId=params.get('product')||params.get('service')||'';window.targetEnrollmentId=params.get('enrollment')||'';
 if(!courseId&&!window.trainingServiceId){status('No training course or product was selected.');return;}
 preloadDetails();
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
  const r=await fetch(window.SCREENINGS4U_SUPABASE_URL+'/functions/v1/lms-create-payment-intent',{method:'POST',headers,body:JSON.stringify({courseId,product:window.trainingServiceId,enrollmentId:window.targetEnrollmentId,customer:{firstName:$('firstName').value.trim(),lastName:$('lastName').value.trim(),email:$('email').value.trim(),phone:$('phone').value.trim()}})});
  const data=await r.json();
  if(!r.ok){if(data.alreadyEnrolled){location.href='lms-my-courses.html';return;}throw new Error(data.error||'Unable to start checkout.');}
  orderId=data.orderId;const pd=data.product||{};$('courseName').textContent=pd.name||data.courseName||data.serviceName||'Training Course';$('coursePrice').textContent=money(data.total,data.currency);if(PRODUCT_DETAILS[pd.slug]){const d=PRODUCT_DETAILS[pd.slug];$('courseSummary').textContent=d.summary;$('accessLine').textContent=d.access;$('courseIncludes').innerHTML=d.items.map(x=>'<li>'+x+'</li>').join('');$('requirementsBlock').style.display=pd.kind==='extension'?'none':'block';}else if(pd.kind==='supplies'){renderDetails({purchaseType:'supplies',serviceDescription:pd.description,serviceMetadata:pd.metadata||{}});}else{renderDetails(data);}if(data.customerEmail){$('email').value=data.customerEmail;$('email').readOnly=true;}
  stripe=Stripe(STRIPE_KEY);elements=stripe.elements({clientSecret:data.clientSecret,appearance:{theme:'stripe',variables:{colorPrimary:'#ff6500',borderRadius:'9px'}}});elements.create('payment').mount('#payment-element');
  $('payButton').disabled=false;$('payButton').textContent=pd.kind==='extension'?'Pay '+money(data.total,data.currency)+' & Extend Course':pd.kind==='group'?'Pay '+money(data.total,data.currency)+' & Purchase Seats':'Pay '+money(data.total,data.currency)+' & Enroll';$('payButton').onclick=pay;$('status').className='status';
 }catch(e){console.error(e);status(e.message||'Unable to load checkout.');$('payButton').disabled=false;}
}
async function pay(){
 $('payButton').disabled=true;status('Processing payment...','ok');
 const result=await stripe.confirmPayment({elements,confirmParams:{return_url:new URL('lms-orders.html?payment=success&order='+encodeURIComponent(orderId),location.origin+'/').href}});
 if(result.error){status(result.error.message||'Payment could not be completed.');$('payButton').disabled=false;}
}
document.addEventListener('DOMContentLoaded',start);
})();
