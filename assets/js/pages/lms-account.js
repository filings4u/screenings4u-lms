(function(){
"use strict";
var AVATAR_BUCKET="avatars";
var MAX_AVATAR_BYTES=5*1024*1024;
var ALLOWED_AVATAR_TYPES=["image/jpeg","image/png","image/webp"];
var s={db:null,user:null,profile:null,prefs:{course_progress_reminders:true,certificate_notifications:true,new_course_updates:false}};

document.addEventListener("DOMContentLoaded",function(){
  init().catch(function(e){
    console.error("[LMS Account]",e);
    msg(e.message||"Unable to load your account.",true);
  });
});

async function init(){
  if(!window.LMS||!window.LMS.ready) throw new Error("Shared LMS authentication is unavailable.");
  var a=await window.LMS.ready;
  s.db=a.client;
  s.user=a.user;
  var r=await s.db.from("user_profiles")
    .select("id,first_name,last_name,display_name,email,phone,company_name,avatar_path,is_active")
    .eq("id",s.user.id)
    .single();
  if(r.error) throw r.error;
  s.profile=r.data;
  try{
    var raw=localStorage.getItem("s4u_lms_preferences_"+s.user.id);
    if(raw) s.prefs=Object.assign(s.prefs,JSON.parse(raw)||{});
  }catch(e){}
  render();
  bind();
}

function avatarUrl(path){
  if(!path) return "";
  if(/^https?:\/\//i.test(path)) return path;
  var result=s.db.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return result&&result.data?result.data.publicUrl:"";
}

function paintAvatar(containerSelector,imageSelector,fallbackSelector,initials){
  var container=document.querySelector(containerSelector);
  var img=document.querySelector(imageSelector);
  var fallback=document.querySelector(fallbackSelector);
  if(!container||!img||!fallback) return;
  var url=avatarUrl(s.profile.avatar_path);
  fallback.textContent=initials;
  if(!url){
    img.hidden=true;
    img.removeAttribute("src");
    fallback.hidden=false;
    container.classList.remove("has-photo");
    return;
  }
  img.onload=function(){
    img.hidden=false;
    fallback.hidden=true;
    container.classList.add("has-photo");
  };
  img.onerror=function(){
    img.hidden=true;
    fallback.hidden=false;
    container.classList.remove("has-photo");
  };
  img.src=url+(url.indexOf("?")>=0?"&":"?")+"v="+Date.now();
}

function render(){
  var n=s.profile.display_name||[s.profile.first_name,s.profile.last_name].filter(Boolean).join(" ")||s.user.email||"Learner";
  var e=s.user.email||s.profile.email||"";
  var i=window.LMS.getInitials(n);
  text("[data-account-name]",n);
  text("[data-account-email]",e);
  text("[data-security-email]",e);
  paintAvatar("[data-account-avatar]","[data-account-avatar-image]","[data-account-avatar-fallback]",i);
  paintAvatar("[data-account-photo-preview]","[data-account-photo-image]","[data-account-photo-fallback]",i);
  val("firstName",s.profile.first_name||"");
  val("lastName",s.profile.last_name||"");
  val("email",e);
  val("phone",s.profile.phone||"");
  val("organization",s.profile.company_name||"");
  check("prefCourseReminders",s.prefs.course_progress_reminders);
  check("prefCertificateNotifications",s.prefs.certificate_notifications);
  check("prefNewCourseUpdates",s.prefs.new_course_updates);
  var remove=document.getElementById("removeAccountPhoto");
  if(remove) remove.hidden=!s.profile.avatar_path;
  window.LMS.setLearnerProfile({name:n,email:e,initials:i});
}

function bind(){
  var f=document.querySelector(".account-form");
  if(f){
    f.addEventListener("submit",save);
    f.addEventListener("reset",function(){setTimeout(render,0);});
  }
  pref("prefCourseReminders","course_progress_reminders");
  pref("prefCertificateNotifications","certificate_notifications");
  pref("prefNewCourseUpdates","new_course_updates");
  var p=document.getElementById("changePasswordButton");
  if(p) p.onclick=resetPassword;
  var u=document.getElementById("updateEmailButton");
  if(u) u.onclick=function(){msg("Your login email is managed by account authentication. Contact support if you need to change it.",false);};
  var input=document.getElementById("accountPhotoInput");
  if(input) input.addEventListener("change",function(){
    var file=input.files&&input.files[0];
    if(file) uploadAvatar(file);
    input.value="";
  });
  var remove=document.getElementById("removeAccountPhoto");
  if(remove) remove.addEventListener("click",removeAvatar);
}

async function uploadAvatar(file){
  var label=document.querySelector('label[for="accountPhotoInput"]');
  try{
    if(!ALLOWED_AVATAR_TYPES.includes(file.type)) throw new Error("Please choose a JPG, PNG, or WebP image.");
    if(file.size>MAX_AVATAR_BYTES) throw new Error("Profile pictures must be 5 MB or smaller.");
    setPhotoStatus("Uploading profile picture…",false);
    if(label){ label.classList.add("is-loading"); label.setAttribute("aria-disabled","true"); }
    var ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
    var path=s.user.id+"/profile."+ext;
    var previous=s.profile.avatar_path||"";
    var upload=await s.db.storage.from(AVATAR_BUCKET).upload(path,file,{upsert:true,contentType:file.type,cacheControl:"3600"});
    if(upload.error) throw upload.error;
    var update=await s.db.from("user_profiles")
      .update({avatar_path:path,updated_at:new Date().toISOString()})
      .eq("id",s.user.id)
      .select("id,first_name,last_name,display_name,email,phone,company_name,avatar_path,is_active")
      .single();
    if(update.error) throw update.error;
    s.profile=update.data;
    if(previous&&previous!==path&&!/^https?:\/\//i.test(previous)){
      try{ await s.db.storage.from(AVATAR_BUCKET).remove([previous]); }catch(_){}
    }
    render();
    setPhotoStatus("Profile picture updated.",false);
    msg("Profile picture updated.",false);
  }catch(e){
    console.error("[LMS Account avatar]",e);
    setPhotoStatus(e.message||"Unable to upload profile picture.",true);
    msg(e.message||"Unable to upload profile picture.",true);
  }finally{
    if(label){ label.classList.remove("is-loading"); label.removeAttribute("aria-disabled"); }
  }
}

async function removeAvatar(){
  var button=document.getElementById("removeAccountPhoto");
  try{
    if(button) button.disabled=true;
    setPhotoStatus("Removing profile picture…",false);
    var previous=s.profile.avatar_path||"";
    var update=await s.db.from("user_profiles")
      .update({avatar_path:null,updated_at:new Date().toISOString()})
      .eq("id",s.user.id)
      .select("id,first_name,last_name,display_name,email,phone,company_name,avatar_path,is_active")
      .single();
    if(update.error) throw update.error;
    s.profile=update.data;
    if(previous&&!/^https?:\/\//i.test(previous)){
      var removed=await s.db.storage.from(AVATAR_BUCKET).remove([previous]);
      if(removed.error) console.warn("[LMS Account avatar remove]",removed.error);
    }
    render();
    setPhotoStatus("Profile picture removed.",false);
    msg("Profile picture removed.",false);
  }catch(e){
    setPhotoStatus(e.message||"Unable to remove profile picture.",true);
    msg(e.message||"Unable to remove profile picture.",true);
  }finally{
    if(button) button.disabled=false;
  }
}

function setPhotoStatus(v,err){
  var x=document.getElementById("accountPhotoStatus");
  if(x){ x.textContent=v||""; x.classList.toggle("is-error",!!err); }
}

async function save(ev){
  ev.preventDefault();
  var b=ev.currentTarget.querySelector('button[type="submit"]');
  if(b){b.disabled=true;b.textContent="Saving...";}
  try{
    var fn=get("firstName").trim(),ln=get("lastName").trim();
    var r=await s.db.from("user_profiles")
      .update({first_name:fn||null,last_name:ln||null,display_name:[fn,ln].filter(Boolean).join(" ")||null,phone:get("phone").trim()||null,company_name:get("organization").trim()||null,updated_at:new Date().toISOString()})
      .eq("id",s.user.id)
      .select("id,first_name,last_name,display_name,email,phone,company_name,avatar_path,is_active")
      .single();
    if(r.error) throw r.error;
    s.profile=r.data;
    render();
    msg("Account information saved.",false);
  }catch(e){
    msg(e.message||"Unable to save account information.",true);
  }finally{
    if(b){b.disabled=false;b.textContent="Save Changes";}
  }
}

function pref(id,key){
  var x=document.getElementById(id);
  if(!x)return;
  x.onchange=function(){
    s.prefs[key]=x.checked;
    try{localStorage.setItem("s4u_lms_preferences_"+s.user.id,JSON.stringify(s.prefs));}catch(e){}
  };
}
async function resetPassword(){
  var e=s.user.email;
  if(!e)return msg("No login email is available.",true);
  var r=await s.db.auth.resetPasswordForEmail(e,{redirectTo:new URL("reset-password.html",location.href).href});
  if(r.error)msg(r.error.message,true);else msg("Password reset instructions were sent to "+e+".",false);
}
function text(q,v){document.querySelectorAll(q).forEach(function(x){x.textContent=v==null?"":String(v);});}
function val(id,v){var x=document.getElementById(id);if(x)x.value=v==null?"":String(v);}
function get(id){var x=document.getElementById(id);return x?x.value:"";}
function check(id,v){var x=document.getElementById(id);if(x)x.checked=!!v;}
function msg(v,err){var x=document.getElementById("accountMessage");if(x){x.textContent=v||"";x.style.color=err?"#b42318":"#24467f";}}
})();
