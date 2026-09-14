(function(){
'use strict';
const STRIPE_KEY='pk_live_51U8CQJEHE8bc4Otur9RVR1HsajJbmSbmRr5z0jGw1v5jgrKrzmnaaRTIV5v5CbEZIwFJLujrU0AI3lOZFDaNg4CG005XAPqkx3';
let stripe,elements,orderId,courseId;
const $=id=>document.getElementById(id);
function status(msg,type='err'){const el=$('status');el.textContent=msg;el.className='status '+type;}
function money(n,c='usd'){return new Intl.NumberFormat('en-US',{style:'currency',currency:String(c).toUpperCase()}).format(Number(n||0));}
async function session(){try{const c=await window.getScreenings4uSupabase?.();if(!c)return {client:null,session:null};const r=await c.auth.getSession();return {client:c,session:r.data?.session||null};}catch{return {client:null,session:null}}}
async function start(){
 courseId=new URLSearchParams(location.search).get('course')||'';
 if(!courseId){status('No training course was selected.');return;}
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
  const r=await fetch(window.SCREENINGS4U_SUPABASE_URL+'/functions/v1/lms-create-payment-intent',{method:'POST',headers,body:JSON.stringify({courseId,customer:{firstName:$('firstName').value.trim(),lastName:$('lastName').value.trim(),email:$('email').value.trim(),phone:$('phone').value.trim()}})});
  const data=await r.json();
  if(!r.ok){if(data.alreadyEnrolled){location.href='lms-my-courses.html';return;}throw new Error(data.error||'Unable to start checkout.');}
  orderId=data.orderId;$('courseName').textContent=data.courseName||data.serviceName||'Training Course';$('coursePrice').textContent=money(data.total,data.currency);if(data.customerEmail){$('email').value=data.customerEmail;$('email').readOnly=true;}
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
