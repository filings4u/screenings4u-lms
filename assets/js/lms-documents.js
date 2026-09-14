(()=>{
  const $=id=>document.getElementById(id);let db,session,enrollments=[];
  const allowed=new Set(['application/pdf','image/png','image/jpeg','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
  const MAX=25*1024*1024;
  async function call(body){
    const r=await fetch(window.SCREENINGS4U_SUPABASE_URL+'/functions/v1/lms-learner-documents',{method:'POST',headers:{'Content-Type':'application/json','apikey':window.SCREENINGS4U_SUPABASE_ANON_KEY,'Authorization':'Bearer '+session.access_token},body:JSON.stringify(body)});
    const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch{}
    if(!r.ok)throw Error(d.error||`Learning Center request failed (${r.status}).`);return d;
  }
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function badge(status){const s=String(status||'').replaceAll('_',' ');return `<span class="docs-status docs-status-${esc(status)}">${esc(s)}</span>`}
  async function load(){
    const d=await call({action:'list'}),rows=[];
    for(const x of d.documents||[]){const doc=Array.isArray(x.documents)?x.documents[0]:x.documents;rows.push(`<tr><td data-label="Document"><b>${esc(doc?.title||'Document')}</b><small>${esc(doc?.description||'')}</small></td><td data-label="Type">${esc(String(x.category||'document').replaceAll('_',' '))}</td><td data-label="Status">${badge(x.status)}</td><td data-label="Date">${new Date(x.created_at).toLocaleDateString()}</td><td data-label="Action"><button class="orange-btn docs-download" data-doc="${x.id}">Download</button></td></tr>`)}
    $('docsBody').innerHTML=rows.join('')||'<tr><td colspan="5"><div class="docs-empty"><strong>No documents yet</strong><span>Your onboarding acknowledgment and submitted training documents will appear here.</span></div></td></tr>';
    document.querySelectorAll('[data-doc]').forEach(b=>b.onclick=async()=>{try{b.disabled=true;const d=await call({action:'signed',id:b.dataset.doc});window.location.assign(d.url)}catch(e){window.S4UUI?.modal({title:'Download Unavailable',message:e.message,type:'error',confirmText:'Close'})}finally{b.disabled=false}})
  }
  function selectedText(){const files=[...$('mockFile').files];$('selectedFiles').textContent=files.length?`${files.length} file${files.length===1?'':'s'} selected: ${files.map(f=>f.name).join(', ')}`:''}
  function setupDropzone(){const dz=$('mockDropzone'),input=$('mockFile');if(!dz||!input)return;dz.onclick=()=>input.click();dz.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}};['dragenter','dragover'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.add('is-dragover')}));['dragleave','drop'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.remove('is-dragover')}));dz.addEventListener('drop',e=>{if(e.dataTransfer?.files?.length){input.files=e.dataTransfer.files;selectedText()}});input.onchange=selectedText}
  function validateFile(f){if(!allowed.has(f.type))throw Error(`${f.name}: upload PDF, Word, JPG, PNG, or WebP files only.`);if(!f.size||f.size>MAX)throw Error(`${f.name}: each file must be 25 MB or smaller.`)}
  async function uploadOne(eid,f){
    validateFile(f);
    const prep=await call({action:'prepare_mock_upload',enrollmentId:eid,file:{name:f.name,mimeType:f.type,size:f.size}});
    const up=await db.storage.from(prep.bucket).uploadToSignedUrl(prep.path,prep.token,f,{contentType:f.type});
    if(up.error)throw Error(`Upload failed for ${f.name}: ${up.error.message}`);
    return call({action:'finalize_mock_upload',enrollmentId:eid,path:prep.path,file:{name:f.name,mimeType:f.type,size:f.size}});
  }
  document.addEventListener('DOMContentLoaded',async()=>{try{
    db=await window.getScreenings4uSupabase();session=(await db.auth.getSession()).data.session;if(!session)return;setupDropzone();
    const status=await call({action:'enrollments'});enrollments=status.enrollments||[];
    $('enrollment').innerHTML='<option value="">Select your DOT course</option>'+enrollments.map(e=>{const c=Array.isArray(e.lms_courses)?e.lms_courses[0]:e.lms_courses;return `<option value="${e.id}">${esc(c?.title||'Course')}</option>`}).join('');
    $('uploadBtn').onclick=async()=>{const files=[...$('mockFile').files],eid=$('enrollment').value;if(!files.length||!eid)return window.S4UUI?.modal({title:'Document Upload',message:'Choose your course and at least one document.',type:'error',confirmText:'Review Upload'});try{
      $('uploadBtn').disabled=true;
      for(let i=0;i<files.length;i++){$('uploadBtn').textContent=`Uploading ${i+1} of ${files.length}…`;await uploadOne(eid,files[i])}
      $('uploadStatus').hidden=false;$('uploadStatus').textContent=`${files.length} document${files.length===1?'':'s'} uploaded successfully. Administrators have been notified and your submission is awaiting review.`;$('mockFile').value='';selectedText();await load();
    }catch(e){window.S4UUI?.modal({title:'Upload Failed',message:e.message||'Unable to upload the document.',type:'error',confirmText:'Close'})}finally{$('uploadBtn').disabled=false;$('uploadBtn').textContent='Upload Document(s) for Review'}};
    await load();
  }catch(e){console.error('[LMS Documents]',e);window.S4UUI?.modal({title:'Documents Unavailable',message:e.message||'Unable to load your documents right now.',type:'error',confirmText:'Close'})}})
})();
