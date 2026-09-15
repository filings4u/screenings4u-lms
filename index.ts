import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const VERSION = "2026-08-23";
const BRAND_VERSION = "2026-09-15-branded-v2";
const BUCKET = "lms-documents";
const MAX = 25 * 1024 * 1024;
const EMAIL_LOGO_URL = "https://rgsrubdtljyxmnihwlah.supabase.co/storage/v1/object/public/branding/logo.png";
const PDF_WHITE_LOGOS = [
  "https://training.screenings4u.com/images/logo2.png",
  EMAIL_LOGO_URL
];

const env = (n: string) => Deno.env.get(n)?.trim() || "";
function admin() {
  const url = env("SUPABASE_URL");
  let key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) {
    try { key = JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}").default || ""; } catch {}
  }
  if (!url || !key) throw Error("LMS server configuration is unavailable.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const origins = new Set([
  "https://training.screenings4u.com",
  "http://127.0.0.1:5500",
  "http://localhost:5500"
]);
const cors = (r: Request) => ({
  "Access-Control-Allow-Origin": origins.has(r.headers.get("origin") || "") ? (r.headers.get("origin") || "") : "https://training.screenings4u.com",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
});
const reply = (r: Request, b: any, s = 200) => new Response(JSON.stringify(b), {
  status: s,
  headers: { ...cors(r), "Content-Type": "application/json", "Cache-Control": "no-store" }
});
const esc = (v: any) => String(v ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c] || c));
const safe = (v: any) => String(v || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
const types = new Set([
  "application/pdf", "image/png", "image/jpeg", "image/webp", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);
const bytes = (v: any) => {
  const x = String(v || "").replace(/^data:[^,]+,/, "");
  return x ? Uint8Array.from(atob(x), c => c.charCodeAt(0)) : new Uint8Array();
};

const emailShell = (eyebrow: string, title: string, content: string) => `<!doctype html><html><body style="margin:0;background:#eef3f8;font-family:Arial,sans-serif;color:#263246"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3f8"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:100%;background:#fff;border:1px solid #dce5ef;border-radius:12px;overflow:hidden"><tr><td style="padding:24px 34px;border-bottom:4px solid #ff6b00"><img src="${EMAIL_LOGO_URL}" alt="screenings4u" width="220" style="display:block;width:220px;max-width:100%;height:auto"></td></tr><tr><td style="padding:34px"><div style="color:#ff6b00;font-size:12px;font-weight:800;letter-spacing:.1em;margin-bottom:9px">${eyebrow}</div><h1 style="margin:0 0 20px;color:#173d78;font-size:28px;line-height:1.2">${title}</h1>${content}</td></tr><tr><td style="padding:20px 34px;background:#173d78;color:#dce7f6;font-size:12px;line-height:1.6">screenings4u Learning Center<br>Need help? <a href="mailto:support@screenings4u.com" style="color:#fff">support@screenings4u.com</a></td></tr></table></td></tr></table></body></html>`;

async function adminEmails(db: any) {
  const out = new Set<string>();
  const configured = env("ADMIN_ORDER_EMAIL");
  if (configured) configured.split(/[;,]/).map(x => x.trim().toLowerCase()).filter(Boolean).forEach(x => out.add(x));
  const a = await db.from("user_role_assignments").select("user_id").eq("role", "super_admin");
  if (!a.error && a.data?.length) {
    const ids = a.data.map((x: any) => x.user_id);
    const p = await db.from("user_profiles").select("email").in("id", ids);
    if (!p.error) (p.data || []).forEach((x: any) => x.email && out.add(String(x.email).toLowerCase()));
  }
  if (!out.size) out.add("aerving@screenings4u.com");
  return [...out];
}

async function mail(db: any, subject: string, body: string, key: string) {
  const api = env("RESEND_API_KEY");
  if (!api) { console.warn("RESEND_API_KEY missing"); return; }
  const to = await adminEmails(db);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${api}`, "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify({
      from: env("RESEND_FROM_EMAIL") || "screenings4u <notifications@screenings4u.com>",
      to,
      reply_to: "support@screenings4u.com",
      subject,
      html: body
    })
  });
  if (!r.ok) console.error("Admin email failed", await r.text());
}

async function userFor(req: Request, db: any) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Sign in is required." };
  const x = await db.auth.getUser(token);
  return x.error || !x.data.user ? { error: x.error?.message || "Sign in is required." } : { user: x.data.user };
}

async function enrollment(db: any, userId: string, eid: string) {
  return await db.from("lms_enrollments").select("id,course_id,lms_courses(title)").eq("id", eid).eq("user_id", userId).single();
}

function wrap(text: string, max = 78) {
  const words = String(text || "").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

async function embedFirstPng(pdf: PDFDocument, urls: string[]) {
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;
      const data = new Uint8Array(await r.arrayBuffer());
      return await pdf.embedPng(data);
    } catch (error) {
      console.warn("PDF logo load failed", url, error);
    }
  }
  return null;
}

async function buildOnboardingPdf(consent: any) {
  const pdf = await PDFDocument.create();
  pdf.setTitle("screenings4u Learning Center Onboarding Acknowledgment");
  pdf.setAuthor("screenings4u");
  pdf.setSubject("Learning Center onboarding and policy acknowledgment");
  pdf.setCreator("screenings4u Learning Center");
  pdf.setProducer("screenings4u Learning Center");

  const page = pdf.addPage([612, 792]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const blue = rgb(36 / 255, 70 / 255, 127 / 255);
  const blueDeep = rgb(23 / 255, 51 / 255, 95 / 255);
  const orange = rgb(1, 107 / 255, 0);
  const text = rgb(23 / 255, 32 / 255, 51 / 255);
  const muted = rgb(102 / 255, 112 / 255, 133 / 255);
  const line = rgb(220 / 255, 229 / 255, 239 / 255);
  const soft = rgb(244 / 255, 247 / 255, 252 / 255);
  const green = rgb(20 / 255, 112 / 255, 79 / 255);

  page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: rgb(1, 1, 1) });

  // Branded header: screenings4u logo | Learning Center
  page.drawRectangle({ x: 0, y: 690, width: 612, height: 102, color: blue });
  page.drawRectangle({ x: 0, y: 690, width: 612, height: 5, color: orange });
  const logo = await embedFirstPng(pdf, PDF_WHITE_LOGOS);
  if (logo) {
    const scale = Math.min(148 / logo.width, 42 / logo.height);
    page.drawImage(logo, { x: 40, y: 726, width: logo.width * scale, height: logo.height * scale });
  } else {
    page.drawText("screenings4u", { x: 40, y: 739, size: 18, font: bold, color: rgb(1, 1, 1) });
  }
  page.drawRectangle({ x: 206, y: 721, width: 1, height: 34, color: rgb(.65, .75, .88), opacity: .6 });
  page.drawText("LEARNING CENTER", { x: 224, y: 736, size: 11, font: bold, color: orange });
  page.drawText("LEARNER ONBOARDING RECORD", { x: 40, y: 707, size: 8, font: bold, color: rgb(.82, .88, .96) });

  // Title and completion status
  page.drawText("Onboarding Acknowledgment", { x: 40, y: 648, size: 24, font: bold, color: blueDeep });
  page.drawText("Official Learning Center record of learner information and policy acknowledgments.", { x: 40, y: 626, size: 10, font: regular, color: muted });
  page.drawRectangle({ x: 463, y: 636, width: 109, height: 25, color: rgb(.92, .98, .95), borderColor: rgb(.73, .89, .81), borderWidth: 1 });
  page.drawText("COMPLETED", { x: 483, y: 644, size: 8.5, font: bold, color: green });

  // Learner information card
  page.drawRectangle({ x: 40, y: 512, width: 532, height: 92, color: soft, borderColor: line, borderWidth: 1 });
  page.drawText("LEARNER INFORMATION", { x: 54, y: 584, size: 8, font: bold, color: orange });
  const accepted = new Date(consent.accepted_at || Date.now()).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
  }) + " CT";
  const rows = [
    ["Name", `${consent.first_name || ""} ${consent.last_name || ""}`.trim()],
    ["Email", String(consent.email || "")],
    ["Phone", String(consent.phone || "Not provided")],
    ["Accepted", accepted]
  ];
  let ry = 565;
  for (const [label, value] of rows) {
    page.drawText(label, { x: 54, y: ry, size: 8, font: bold, color: muted });
    page.drawText(value || "—", { x: 136, y: ry, size: 9.5, font: regular, color: text });
    ry -= 17;
  }

  // Acknowledgments
  page.drawText("ACKNOWLEDGMENTS", { x: 40, y: 480, size: 8, font: bold, color: orange });
  const items = [
    "I reviewed and agreed to the Learning Center Terms of Use.",
    "I understand that online training courses and digital products are final and non-refundable once purchased.",
    "I reviewed and understand the screenings4u Training Disclaimer.",
    "I understand that applicable DOT collector training requires documentation of the required mock collection sessions before certificate processing."
  ];
  let y = 454;
  for (const item of items) {
    page.drawCircle({ x: 48, y: y + 3, size: 5.5, color: orange });
    page.drawText("✓", { x: 44.3, y: y - .3, size: 8, font: bold, color: rgb(1, 1, 1) });
    const lines = wrap(item, 76);
    for (const l of lines) {
      page.drawText(l, { x: 63, y, size: 9.6, font: regular, color: text });
      y -= 14;
    }
    y -= 9;
  }

  // Electronic acceptance block
  page.drawRectangle({ x: 40, y: 158, width: 532, height: 92, color: rgb(1, .977, .95), borderColor: rgb(1, .84, .67), borderWidth: 1 });
  page.drawText("ELECTRONIC ACKNOWLEDGMENT", { x: 54, y: 226, size: 8, font: bold, color: orange });
  const electronic = "By submitting the Learning Center onboarding form, the learner confirmed the information shown above and electronically accepted each listed acknowledgment. This PDF is the stored record associated with the learner's screenings4u Learning Center account.";
  let ey = 205;
  for (const l of wrap(electronic, 82)) {
    page.drawText(l, { x: 54, y: ey, size: 9.2, font: regular, color: text });
    ey -= 13;
  }

  // Record metadata
  page.drawText(`Consent version: ${VERSION}`, { x: 40, y: 125, size: 8, font: regular, color: muted });
  page.drawText(`Document version: ${BRAND_VERSION}`, { x: 40, y: 111, size: 8, font: regular, color: muted });
  page.drawText(`Record ID: ${String(consent.id || "")}`, { x: 40, y: 97, size: 8, font: regular, color: muted });

  // Footer
  page.drawRectangle({ x: 0, y: 0, width: 612, height: 66, color: blueDeep });
  page.drawText("screenings4u Learning Center", { x: 40, y: 40, size: 9, font: bold, color: rgb(1, 1, 1) });
  page.drawText("support@screenings4u.com  |  training.screenings4u.com", { x: 40, y: 23, size: 8, font: regular, color: rgb(.80, .87, .95) });
  page.drawText("Secure learner document", { x: 458, y: 31, size: 8, font: regular, color: rgb(.80, .87, .95) });

  return new Uint8Array(await pdf.save());
}

async function ensureOnboardingDocument(db: any, userId: string, consent: any, uploadedBy: string) {
  const existing = await db.from("lms_learner_documents")
    .select("id,document_id,documents(id,metadata)")
    .eq("user_id", userId)
    .eq("category", "onboarding_acknowledgment")
    .limit(1)
    .maybeSingle();
  if (existing.error) throw Error(`Onboarding document query failed: ${existing.error.message}`);

  const nested: any = Array.isArray(existing.data?.documents) ? existing.data.documents[0] : existing.data?.documents;
  const alreadyBranded = nested?.metadata?.brand_version === BRAND_VERSION;
  if (existing.data && alreadyBranded) return existing.data;

  const pdf = await buildOnboardingPdf(consent);
  const path = `learners/${userId}/onboarding/${VERSION}/learning-center-onboarding-acknowledgment.pdf`;
  const up = await db.storage.from(BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (up.error) throw Error(`Onboarding PDF upload failed: ${up.error.message}`);

  const metadata = {
    source: "training_portal",
    consent_version: VERSION,
    consent_id: consent.id,
    brand_version: BRAND_VERSION,
    generated_by: "lms-learner-documents",
    pdf_type: "branded_native_pdf"
  };

  if (existing.data?.document_id) {
    const d = await db.from("documents").update({
      title: "Learning Center Onboarding Acknowledgment",
      description: "Branded PDF record of the learner's Learning Center onboarding and policy acknowledgment.",
      storage_bucket: BUCKET,
      storage_path: path,
      mime_type: "application/pdf",
      file_size: pdf.length,
      metadata
    }).eq("id", existing.data.document_id).select().single();
    if (d.error) throw Error(`Onboarding document update failed: ${d.error.message}`);
    return existing.data;
  }

  const d = await db.from("documents").insert({
    owner_user_id: userId,
    document_type: "lms_onboarding_acknowledgment",
    title: "Learning Center Onboarding Acknowledgment",
    description: "Branded PDF record of the learner's Learning Center onboarding and policy acknowledgment.",
    storage_bucket: BUCKET,
    storage_path: path,
    mime_type: "application/pdf",
    file_size: pdf.length,
    is_confidential: true,
    visibility: "private",
    metadata
  }).select().single();
  if (d.error) throw Error(`Onboarding document record failed: ${d.error.message}`);

  const ld = await db.from("lms_learner_documents").insert({
    user_id: userId,
    document_id: d.data.id,
    category: "onboarding_acknowledgment",
    status: "accepted",
    uploaded_by: uploadedBy
  }).select().single();
  if (ld.error) throw Error(`Onboarding document link failed: ${ld.error.message}`);
  return ld.data;
}

async function notifyUpload(db: any, user: any, e: any, ld: any, name: string) {
  const p = await db.from("user_profiles").select("display_name,email,first_name,last_name").eq("id", user.id).maybeSingle();
  const course: any = Array.isArray(e.data.lms_courses) ? e.data.lms_courses[0] : e.data.lms_courses;
  const learner = p.data?.display_name || [p.data?.first_name, p.data?.last_name].filter(Boolean).join(" ") || p.data?.email || user.email || "Learner";
  await mail(
    db,
    `DOT mock training document uploaded — ${learner}`,
    emailShell("DOCUMENT UPLOAD", "New DOT mock training document", `<p style="font-size:16px;line-height:1.65"><strong>${esc(learner)}</strong> uploaded <strong>${esc(name)}</strong> for <strong>${esc(course?.title || "DOT training")}</strong>.</p><p style="font-size:16px;line-height:1.65">The document is ready for admin review in the Learning Center.</p>`),
    `mock-${ld.data.id}`
  );
}

async function createMockRecord(db: any, user: any, e: any, eid: string, path: string, name: string, mime: string, size: number) {
  const exists = await db.from("documents").select("id").eq("storage_bucket", BUCKET).eq("storage_path", path).maybeSingle();
  if (exists.data) {
    const prior = await db.from("lms_learner_documents").select("*").eq("document_id", exists.data.id).eq("user_id", user.id).maybeSingle();
    if (prior.data) return prior.data;
  }
  const d = await db.from("documents").insert({
    owner_user_id: user.id,
    document_type: "lms_mock_training",
    title: name || "DOT Mock Training Documentation",
    description: "Learner-submitted DOT mock training documentation for certificate review.",
    storage_bucket: BUCKET,
    storage_path: path,
    mime_type: mime,
    file_size: size,
    is_confidential: true,
    visibility: "private",
    metadata: { source: "training_portal", enrollment_id: eid, course_id: e.data.course_id }
  }).select().single();
  if (d.error) throw Error(`Document record failed: ${d.error.message}`);

  const ld = await db.from("lms_learner_documents").insert({
    user_id: user.id,
    enrollment_id: eid,
    document_id: d.data.id,
    category: "mock_training",
    status: "submitted",
    uploaded_by: user.id
  }).select().single();
  if (ld.error) throw Error(`Learner document record failed: ${ld.error.message}`);
  await notifyUpload(db, user, e, ld, name);
  return ld.data;
}

function extensionForMime(mime: string) {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx"
  };
  return map[mime] || "";
}

function downloadName(title: string, mime: string, category: string) {
  if (category === "onboarding_acknowledgment") return "screenings4u-learning-center-onboarding-acknowledgment.pdf";
  const ext = extensionForMime(mime);
  const base = safe(title || "learning-center-document").replace(/\.[a-z0-9]{1,6}$/i, "");
  return `${base}${ext}`;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return reply(req, { error: "Method not allowed" }, 405);

  try {
    const db = admin();
    const auth = await userFor(req, db);
    if (auth.error) return reply(req, { error: auth.error }, 401);
    const user = auth.user;
    const b = await req.json().catch(() => ({}));
    const a = String(b.action || "");

    if (a === "status") {
      const q = await db.from("lms_onboarding_consents").select("*").eq("user_id", user.id).eq("consent_version", VERSION).maybeSingle();
      if (q.error) throw Error(`Onboarding query failed: ${q.error.message}`);
      let document: any = null;
      if (q.data) document = await ensureOnboardingDocument(db, user.id, q.data, user.id);
      return reply(req, { consent: q.data || null, hasDocument: !!document });
    }

    if (a === "enrollments") {
      const q = await db.from("lms_enrollments").select("id,course_id,status,progress_percent,expires_at,enrolled_at,lms_courses(title)").eq("user_id", user.id).order("enrolled_at", { ascending: false });
      if (q.error) throw Error(`Enrollment query failed: ${q.error.message}`);
      return reply(req, { enrollments: q.data || [] });
    }

    if (a === "consent") {
      const first = String(b.firstName || "").trim();
      const last = String(b.lastName || "").trim();
      const email = String(b.email || "").trim().toLowerCase();
      const phone = String(b.phone || "").trim();
      if (!first || !last || !email) return reply(req, { error: "First name, last name, and email are required." }, 400);
      if (!b.acceptedTerms || !b.acceptedRefund || !b.acceptedDisclaimer || !b.acceptedMock) return reply(req, { error: "All four acknowledgments are required." }, 400);

      const q = await db.from("lms_onboarding_consents").upsert({
        user_id: user.id,
        consent_version: VERSION,
        first_name: first,
        last_name: last,
        email,
        phone: phone || null,
        accepted_terms: true,
        accepted_refund_policy: true,
        accepted_disclaimer: true,
        accepted_mock_requirements: true,
        acceptance_snapshot: { source: "training_portal", version: VERSION },
        user_agent: req.headers.get("user-agent"),
        accepted_at: new Date().toISOString()
      }, { onConflict: "user_id,consent_version" }).select().single();
      if (q.error) throw Error(`Onboarding save failed: ${q.error.message}`);

      const link = await ensureOnboardingDocument(db, user.id, q.data, user.id);
      const learner = `${first} ${last}`.trim();
      await mail(
        db,
        `Learning Center onboarding completed — ${learner}`,
        emailShell("LEARNER ONBOARDING", "Onboarding completed", `<p style="font-size:16px;line-height:1.65"><strong>${esc(learner)}</strong> (${esc(email)}) completed Learning Center onboarding.</p><p style="font-size:16px;line-height:1.65">The branded signed acknowledgment is stored in Documents.</p>`),
        `onboarding-${q.data.id}-${q.data.accepted_at}`
      );
      return reply(req, { consent: q.data, document: link });
    }

    if (a === "list") {
      const c = await db.from("lms_onboarding_consents").select("*").eq("user_id", user.id).eq("consent_version", VERSION).maybeSingle();
      if (c.error) throw Error(`Onboarding query failed: ${c.error.message}`);
      if (c.data) await ensureOnboardingDocument(db, user.id, c.data, user.id);

      const q = await db.from("lms_learner_documents")
        .select("id,category,status,admin_notes,created_at,enrollment_id,documents(id,title,description,mime_type,file_size,created_at,metadata)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (q.error) throw Error(`Document list failed: ${q.error.message}`);
      return reply(req, { documents: q.data || [] });
    }

    if (a === "signed") {
      const q = await db.from("lms_learner_documents")
        .select("category,documents(storage_bucket,storage_path,title,mime_type)")
        .eq("id", String(b.id || ""))
        .eq("user_id", user.id)
        .single();
      if (q.error) return reply(req, { error: "Document not found." }, 404);

      const d: any = Array.isArray(q.data.documents) ? q.data.documents[0] : q.data.documents;
      if (!d?.storage_bucket || !d?.storage_path) return reply(req, { error: "Document file is unavailable." }, 404);

      const fileName = downloadName(d.title || "Learning Center Document", d.mime_type || "", q.data.category || "");
      const s = await db.storage.from(d.storage_bucket).createSignedUrl(d.storage_path, 300, { download: fileName });
      if (s.error) throw Error(`Download failed: ${s.error.message}`);
      return reply(req, {
        url: s.data.signedUrl,
        title: d.title,
        mimeType: d.mime_type,
        category: q.data.category,
        fileName
      });
    }

    if (a === "prepare_mock_upload") {
      const eid = String(b.enrollmentId || "");
      const f = b.file || {};
      const mime = String(f.mimeType || "");
      const size = Number(f.size || 0);
      const e = await enrollment(db, user.id, eid);
      if (e.error) return reply(req, { error: "Choose one of your enrolled courses." }, 404);
      if (!types.has(mime)) return reply(req, { error: "Upload PDF, Word, JPG, PNG, or WebP." }, 400);
      if (!size || size > MAX) return reply(req, { error: "Each file must be 25 MB or smaller." }, 400);
      const path = `learners/${user.id}/mock-training/${eid}/${Date.now()}-${crypto.randomUUID()}-${safe(f.name)}`;
      const s = await db.storage.from(BUCKET).createSignedUploadUrl(path);
      if (s.error) throw Error(`Unable to prepare upload: ${s.error.message}`);
      return reply(req, { bucket: BUCKET, path, token: s.data.token });
    }

    if (a === "finalize_mock_upload") {
      const eid = String(b.enrollmentId || "");
      const path = String(b.path || "");
      const f = b.file || {};
      const mime = String(f.mimeType || "");
      const name = String(f.name || "DOT Mock Training Documentation");
      const size = Number(f.size || 0);
      const prefix = `learners/${user.id}/mock-training/${eid}/`;
      if (!path.startsWith(prefix)) return reply(req, { error: "Invalid upload path." }, 400);
      const e = await enrollment(db, user.id, eid);
      if (e.error) return reply(req, { error: "Choose one of your enrolled courses." }, 404);
      if (!types.has(mime) || !size || size > MAX) return reply(req, { error: "The uploaded file is not valid." }, 400);

      const folder = path.slice(0, path.lastIndexOf('/'));
      const fileName = path.slice(path.lastIndexOf('/') + 1);
      const listed = await db.storage.from(BUCKET).list(folder, { search: fileName, limit: 10 });
      if (listed.error) throw Error(`Upload verification failed: ${listed.error.message}`);
      const object = (listed.data || []).find((x: any) => x.name === fileName);
      if (!object) throw Error("Upload did not finish. Please try again.");
      const actual = Number(object.metadata?.size || size);
      if (actual > MAX) throw Error("The uploaded file exceeds 25 MB.");
      const ld = await createMockRecord(db, user, e, eid, path, name, mime, actual);
      return reply(req, { document: ld });
    }

    if (a === "upload_mock") {
      const eid = String(b.enrollmentId || "");
      const f = b.file || {};
      const e = await enrollment(db, user.id, eid);
      if (e.error) return reply(req, { error: "Choose one of your enrolled courses." }, 404);
      const mime = String(f.mimeType || "");
      if (!types.has(mime)) return reply(req, { error: "Upload PDF, Word, JPG, PNG, or WebP." }, 400);
      const file = bytes(f.base64);
      if (!file.length || file.length > MAX) return reply(req, { error: "Each file must be 25 MB or smaller." }, 400);
      const path = `learners/${user.id}/mock-training/${eid}/${Date.now()}-${crypto.randomUUID()}-${safe(f.name)}`;
      const up = await db.storage.from(BUCKET).upload(path, file, { contentType: mime });
      if (up.error) throw Error(`Upload failed: ${up.error.message}`);
      const ld = await createMockRecord(db, user, e, eid, path, String(f.name || "DOT Mock Training Documentation"), mime, file.length);
      return reply(req, { document: ld });
    }

    return reply(req, { error: "Unknown action." }, 400);
  } catch (e) {
    console.error("lms-learner-documents", e);
    return reply(req, { error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
