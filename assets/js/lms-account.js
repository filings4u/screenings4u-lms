(function(){
"use strict";
var s={db:null,user:null,profile:null,prefs:{course_progress_reminders:true,certificate_notifications:true,new_course_updates:false}};
document.addEventListener("DOMContentLoaded",function(){init().catch(function(e){console.error("[LMS Account]",e);msg(e.message||"Unable to load your account.",true);});});
async function init(){
 if(!window.LMS||!window.LMS.ready) throw new Error("Shared LMS authentication is unavailable.");
 var a=await window.LMS.ready;s.db=a.client;s.user=a.user;
 var r=await s.db.from("user_profiles").select("id,first_name,last_name,display_name,email,phone,company_name,is_active").eq("id",s.user.id).single();
 if(r.error)throw r.error;s.profile=r.data;
 try{var raw=localStorage.getItem("s4u_lms_preferences_"+s.user.id);if(raw)s.prefs=Object.assign(s.prefs,JSON.parse(raw)||{});}catch(e){}
 render();bind();
}
function render(){
 var n=s.profile.display_name||[s.profile.first_name,s.profile.last_name].filter(Boolean).join(" ")||s.user.email||"Learner";
 var e=s.user.email||s.profile.email||"",i=window.LMS.getInitials(n);
 text("[data-account-avatar]",i);text("[data-account-name]",n);text("[data-account-email]",e);text("[data-security-email]",e);
 val("firstName",s.profile.first_name||"");val("lastName",s.profile.last_name||"");val("email",e);val("phone",s.profile.phone||"");val("organization",s.profile.company_name||"");
 check("prefCourseReminders",s.prefs.course_progress_reminders);check("prefCertificateNotifications",s.prefs.certificate_notifications);check("prefNewCourseUpdates",s.prefs.new_course_updates);
 window.LMS.setLearnerProfile({name:n,email:e,initials:i});
}
function bind(){
 var f=document.querySelector(".account-form");if(f){f.addEventListener("submit",save);f.addEventListener("reset",function(){setTimeout(render,0);});}
 pref("prefCourseReminders","course_progress_reminders");pref("prefCertificateNotifications","certificate_notifications");pref("prefNewCourseUpdates","new_course_updates");
 var p=document.getElementById("changePasswordButton");if(p)p.onclick=resetPassword;
 var u=document.getElementById("updateEmailButton");if(u)u.onclick=function(){msg("Your login email is managed by account authentication. Contact support if you need to change it.",false);};
}
async function save(ev){
 ev.preventDefault();var b=ev.currentTarget.querySelector('button[type="submit"]');if(b){b.disabled=true;b.textContent="Saving...";}
 try{
  var fn=get("firstName").trim(),ln=get("lastName").trim();
  var r=await s.db.from("user_profiles").update({first_name:fn||null,last_name:ln||null,display_name:[fn,ln].filter(Boolean).join(" ")||null,phone:get("phone").trim()||null,company_name:get("organization").trim()||null,updated_at:new Date().toISOString()}).eq("id",s.user.id).select("id,first_name,last_name,display_name,email,phone,company_name,is_active").single();
  if(r.error)throw r.error;s.profile=r.data;render();msg("Account information saved.",false);
 }catch(e){msg(e.message||"Unable to save account information.",true);}
 finally{if(b){b.disabled=false;b.textContent="Save Changes";}}
}
function pref(id,key){var x=document.getElementById(id);if(!x)return;x.onchange=function(){s.prefs[key]=x.checked;try{localStorage.setItem("s4u_lms_preferences_"+s.user.id,JSON.stringify(s.prefs));}catch(e){}};}
async function resetPassword(){var e=s.user.email;if(!e)return msg("No login email is available.",true);var r=await s.db.auth.resetPasswordForEmail(e,{redirectTo:new URL("reset-password.html",location.href).href});if(r.error)msg(r.error.message,true);else msg("Password reset instructions were sent to "+e+".",false);}
function text(q,v){document.querySelectorAll(q).forEach(function(x){x.textContent=v==null?"":String(v);});}
function val(id,v){var x=document.getElementById(id);if(x)x.value=v==null?"":String(v);}
function get(id){var x=document.getElementById(id);return x?x.value:"";}
function check(id,v){var x=document.getElementById(id);if(x)x.checked=!!v;}
function msg(v,err){var x=document.getElementById("accountMessage");if(x){x.textContent=v||"";x.style.color=err?"#b42318":"#24467f";}}
})();