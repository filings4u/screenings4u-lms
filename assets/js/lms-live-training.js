import { CallClient, LocalVideoStream, VideoStreamRenderer } from "https://cdn.jsdelivr.net/npm/@azure/communication-calling@1.46.1/+esm";
import { AzureCommunicationTokenCredential } from "https://cdn.jsdelivr.net/npm/@azure/communication-common@2.5.0/+esm";

const $=id=>document.getElementById(id);
const state={db:null,appointment:null,callClient:null,callAgent:null,deviceManager:null,call:null,localVideo:null,localRenderer:null,cameraOn:false,micOn:true,remoteRenderers:new Map()};

document.addEventListener("DOMContentLoaded",init);

async function init(){
  state.db=await getClient();
  if(!state.db){showError("Unable to connect to the Learning Center.");return;}
  bind();
  try{
    let appointmentId=new URLSearchParams(location.search).get("appointment");
    if(!appointmentId){
      const upcoming=await invoke({action:"upcoming"});
      if(!upcoming.appointment){showEmpty();return;}
      appointmentId=upcoming.appointment.id;
      history.replaceState(null,"",`lms-live-training.html?appointment=${encodeURIComponent(appointmentId)}`);
    }
    const data=await invoke({action:"details",appointment_id:appointmentId});
    state.appointment=data.appointment;
    renderDetails();
    if(state.appointment.join_allowed){$("prejoinState").hidden=false;await initializePreview();}
    else renderScheduled();
  }catch(e){showError(e.message||"Unable to open Live Training.");}
}

function bind(){
  $("cameraBtn")?.addEventListener("click",togglePreviewCamera);
  $("micBtn")?.addEventListener("click",()=>{state.micOn=!state.micOn;updatePrejoinControls();});
  $("joinBtn")?.addEventListener("click",joinMeeting);
  $("leaveBtn")?.addEventListener("click",leaveMeeting);
  $("meetingMicBtn")?.addEventListener("click",toggleMeetingMic);
  $("meetingCameraBtn")?.addEventListener("click",toggleMeetingCamera);
}

async function getClient(){for(let i=0;i<50;i++){try{if(typeof window.getScreenings4uSupabase==="function"){const c=await window.getScreenings4uSupabase();if(c?.functions)return c}if(window.screenings4uSupabase?.functions)return window.screenings4uSupabase;if(window.supabaseClient?.functions)return window.supabaseClient}catch{}await new Promise(r=>setTimeout(r,80));}return null;}
async function invoke(body){const {data,error}=await state.db.functions.invoke("lms-live-training-session",{body});if(error){let m=error.message;try{m=(await error.context?.clone?.().json())?.error||m}catch{}throw new Error(m)}if(data?.error)throw new Error(data.error);return data;}
async function invokeBooking(body){const {data,error}=await state.db.functions.invoke("scheduling-booking",{body});if(error){let m=error.message;try{m=(await error.context?.clone?.().json())?.error||m}catch{}throw new Error(m)}if(data?.error)throw new Error(data.error);return data;}

function renderDetails(){const a=state.appointment;$("trainingTitle").textContent=a.title||"Live Training";$("trainingSchedule").textContent=formatRange(a.start_at,a.end_at,a.timezone);$("welcomeName").textContent=`Welcome, ${a.display_name||"Learner"}`;$("hostName").textContent=a.host_name||"Screenings4u Training";$("trackingNumber").textContent=a.tracking_number||"—";$("sessionTime").textContent=formatRange(a.start_at,a.end_at,a.timezone);const initials=getInitials(a.display_name);$("previewInitials").textContent=initials;$("lobbyInitials").textContent=initials;$("lobbyName").textContent=a.display_name||"Learner";}
function renderScheduled(){const a=state.appointment;$("scheduledState").hidden=false;$("scheduledCopy").textContent=`Your room opens ${formatDate(a.join_available_at,a.timezone)}. Your appointment starts ${formatDate(a.start_at,a.timezone)}.`;}
function showEmpty(){$("trainingTitle").textContent="No upcoming Live Training";$("trainingSchedule").textContent="Schedule a training appointment to create your Microsoft Teams room.";$("liveMessage").hidden=true;$("scheduledState").hidden=false;$("scheduledCopy").innerHTML='You do not have an upcoming Microsoft Teams training appointment. <a href="lms-schedule-appointment.html">Schedule an appointment</a> to continue.';}
function formatDate(v,tz){try{return new Intl.DateTimeFormat("en-US",{timeZone:tz||undefined,weekday:"long",month:"long",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(new Date(v))}catch{return new Date(v).toLocaleString()}}
function formatRange(s,e,tz){return `${formatDate(s,tz)} – ${new Intl.DateTimeFormat("en-US",{timeZone:tz||undefined,hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(new Date(e))}`}
function getInitials(name){const parts=String(name||"S4U").trim().split(/\s+/).filter(Boolean);return (parts.slice(0,2).map(x=>x[0]).join("")||"S4U").toUpperCase()}

async function initializePreview(){try{state.callClient=new CallClient();state.deviceManager=await state.callClient.getDeviceManager();await state.deviceManager.askDevicePermission({audio:true,video:true});const cameras=await state.deviceManager.getCameras();if(cameras.length){state.localVideo=new LocalVideoStream(cameras[0]);state.cameraOn=true;await renderLocalPreview();}updatePrejoinControls();}catch(e){console.warn("Device preview unavailable",e);showMessage("Camera or microphone permission was not granted. You can still join and allow access when prompted.");}}
async function renderLocalPreview(){if(!state.localVideo)return;try{if(state.localRenderer){state.localRenderer.dispose();state.localRenderer=null;}const renderer=new VideoStreamRenderer(state.localVideo),view=await renderer.createView({scalingMode:"Crop"});state.localRenderer=renderer;const box=$("localPreview");box.innerHTML="";box.appendChild(view.target);}catch(e){console.warn("Preview render failed",e)}}
async function togglePreviewCamera(){try{if(!state.callClient)state.callClient=new CallClient();if(!state.deviceManager)state.deviceManager=await state.callClient.getDeviceManager();if(state.cameraOn){state.localRenderer?.dispose();state.localRenderer=null;state.localVideo=null;state.cameraOn=false;$("localPreview").innerHTML=`<div class="video-placeholder"><span>${getInitials(state.appointment?.display_name)}</span><p>Camera is off</p></div>`;}else{const cams=await state.deviceManager.getCameras();if(!cams.length)throw new Error("No camera was found.");state.localVideo=new LocalVideoStream(cams[0]);state.cameraOn=true;await renderLocalPreview();}updatePrejoinControls();}catch(e){showMessage(e.message)}}
function updatePrejoinControls(){if(!$("cameraBtn")||!$("micBtn"))return;$("cameraBtn").setAttribute("aria-pressed",String(state.cameraOn));$("micBtn").setAttribute("aria-pressed",String(state.micOn));$("micBtn").querySelector("small").textContent=state.micOn?"Mic on":"Mic off";$("cameraBtn").querySelector("small").textContent=state.cameraOn?"Camera on":"Camera off";}

async function joinMeeting(){const btn=$("joinBtn");btn.disabled=true;btn.textContent="Opening waiting room…";try{const data=await invoke({action:"token",appointment_id:state.appointment.id});const credential=new AzureCommunicationTokenCredential(data.acs.token);if(!state.callClient)state.callClient=new CallClient();if(!state.deviceManager)state.deviceManager=await state.callClient.getDeviceManager();state.callAgent=await state.callClient.createCallAgent(credential,{displayName:data.appointment.display_name||"Learner"});const videoOptions=state.cameraOn&&state.localVideo?{localVideoStreams:[state.localVideo]}:undefined;state.call=state.callAgent.join({meetingLink:data.meeting_url},{audioOptions:{muted:!state.micOn},videoOptions});subscribeCall();$("prejoinState").hidden=true;$("meetingState").hidden=false;setMeetingState(state.call.state);}catch(e){showMessage(e.message||"Unable to join Live Training.");btn.disabled=false;btn.textContent="Enter Waiting Room";}}
function subscribeCall(){const call=state.call;call.on("stateChanged",()=>setMeetingState(call.state));call.on("remoteParticipantsUpdated",e=>{(e.added||[]).forEach(subscribeParticipant);(e.removed||[]).forEach(removeParticipant)});(call.remoteParticipants||[]).forEach(subscribeParticipant);}
function setMeetingState(s){$("meetingStatus").textContent=s==="InLobby"?"Waiting for instructor":s==="Connected"?"Connected":s==="Disconnected"?"Training ended":"Connecting…";$("meetingStatusDot").classList.toggle("connected",s==="Connected");$("lobbyPanel").hidden=s!=="InLobby";$("connectedPanel").hidden=s!=="Connected";if(s==="Connected"&&$("emptyRemote"))$("emptyRemote").hidden=true;if(s==="Disconnected"){$("lobbyPanel").hidden=true;$("connectedPanel").hidden=true;showMessage("You have left the Live Training session.");}}
function subscribeParticipant(p){const key=participantKey(p);(p.videoStreams||[]).forEach(stream=>subscribeRemoteStream(key,p,stream));p.on?.("videoStreamsUpdated",e=>{(e.added||[]).forEach(stream=>subscribeRemoteStream(key,p,stream));(e.removed||[]).forEach(stream=>removeRemoteStream(key,stream));});}
async function subscribeRemoteStream(key,p,stream){const streamKey=`${key}:${stream.id}`;const handle=async()=>{if(!stream.isAvailable){removeRemoteStream(key,stream);return}if(state.remoteRenderers.has(streamKey))return;try{const renderer=new VideoStreamRenderer(stream),view=await renderer.createView({scalingMode:"Crop"});const tile=document.createElement("div");tile.className="remote-tile";tile.dataset.stream=streamKey;tile.appendChild(view.target);const label=document.createElement("span");label.className="remote-name";label.textContent=p.displayName||"Participant";tile.appendChild(label);$("remoteGallery").appendChild(tile);$("emptyRemote").hidden=true;state.remoteRenderers.set(streamKey,{renderer,tile});}catch(e){console.warn("Remote video renderer failed",e)}};stream.on?.("isAvailableChanged",handle);await handle();}
function removeRemoteStream(key,stream){const streamKey=`${key}:${stream.id}`,r=state.remoteRenderers.get(streamKey);if(r){try{r.renderer.dispose()}catch{}r.tile.remove();state.remoteRenderers.delete(streamKey)}if(!state.remoteRenderers.size&&state.call?.state!=="Connected")$("emptyRemote").hidden=false;}
function removeParticipant(p){const prefix=`${participantKey(p)}:`;[...state.remoteRenderers.keys()].filter(k=>k.startsWith(prefix)).forEach(k=>{const r=state.remoteRenderers.get(k);try{r.renderer.dispose()}catch{}r.tile.remove();state.remoteRenderers.delete(k)});if(!state.remoteRenderers.size&&state.call?.state!=="Connected")$("emptyRemote").hidden=false;}
function participantKey(p){return p.identifier?.communicationUserId||p.identifier?.microsoftTeamsUserId||p.identifier?.phoneNumber||p.displayName||Math.random().toString(36)}
async function toggleMeetingMic(){if(!state.call)return;try{if(state.call.isMuted){await state.call.unmute();$("meetingMicBtn").textContent="Mute"}else{await state.call.mute();$("meetingMicBtn").textContent="Unmute"}}catch(e){showMessage(e.message)}}
async function toggleMeetingCamera(){if(!state.call)return;try{if(state.localVideo&&state.call.localVideoStreams?.length){await state.call.stopVideo(state.localVideo);$("meetingCameraBtn").textContent="Start Camera"}else{if(!state.localVideo){const cams=await state.deviceManager.getCameras();if(!cams.length)throw new Error("No camera was found.");state.localVideo=new LocalVideoStream(cams[0]);}await state.call.startVideo(state.localVideo);$("meetingCameraBtn").textContent="Stop Camera"}}catch(e){showMessage(e.message)}}
async function leaveMeeting(){try{if(state.call)await state.call.hangUp()}catch{}finally{location.href="lms-my-appointments.html"}}
function showMessage(t){const el=$("liveMessage");el.textContent=t;el.hidden=false;}
function showError(t){showMessage(t);$("trainingTitle").textContent="Live Training unavailable";$("trainingSchedule").textContent="Please return to My Appointments or refresh this page.";}
