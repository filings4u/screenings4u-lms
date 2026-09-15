(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const EDGE_FUNCTION = "lms-learner-documents";
  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  const ALLOWED_TYPES = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]);

  let db = null;
  let session = null;
  let documents = [];
  let selectedFiles = [];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function readableStatus(value) {
    return String(value || "Pending").replaceAll("_", " ");
  }

  function readableCategory(value) {
    const category = String(value || "document").replaceAll("_", " ");
    if (category === "mock training") return "Mock training";
    if (category === "onboarding acknowledgment") return "Acknowledgment";
    return category.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatFileSize(bytes) {
    const size = Number(bytes || 0);
    if (!size) return "";
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function call(body) {
    const response = await fetch(
      `${window.SCREENINGS4U_SUPABASE_URL}/functions/v1/${EDGE_FUNCTION}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: window.SCREENINGS4U_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      }
    );

    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}

    if (!response.ok) {
      throw new Error(data.error || `Learning Center request failed (${response.status}).`);
    }

    return data;
  }

  async function callBrandedOnboardingPdf() {
    const response = await fetch(
      `${window.SCREENINGS4U_SUPABASE_URL}/functions/v1/lms-branded-onboarding-pdf`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: window.SCREENINGS4U_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`
        },
        body: "{}"
      }
    );

    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
    if (!response.ok) throw new Error(data.error || `PDF request failed (${response.status}).`);
    return data;
  }

  function showPageMessage(message) {
    const box = $("documentsMessage");
    if (!box) return;
    box.hidden = !message;
    box.textContent = message || "";
  }

  function updateSummary() {
    const count = documents.length;
    if ($("documentsCount")) $("documentsCount").textContent = String(count);
    if ($("documentsSummaryText")) {
      $("documentsSummaryText").textContent = count === 1
        ? "Learning Center document"
        : "Learning Center documents";
    }
  }

  function statusBadge(status) {
    const safeStatus = escapeHtml(String(status || "pending").toLowerCase());
    return `<span class="docs-status docs-status-${safeStatus}">${escapeHtml(readableStatus(status))}</span>`;
  }

  function documentText(item) {
    const doc = Array.isArray(item.documents) ? item.documents[0] : item.documents;
    return [
      doc?.title,
      doc?.description,
      item.category,
      item.status,
      formatDate(item.created_at)
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function renderDocuments(list) {
    const body = $("docsBody");
    if (!body) return;

    if (!list.length) {
      body.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="docs-empty">
              <strong>No documents found</strong>
              <span>Your Learning Center acknowledgment and submitted training documents will appear here.</span>
            </div>
          </td>
        </tr>`;
      return;
    }

    body.innerHTML = list.map((item) => {
      const doc = Array.isArray(item.documents) ? item.documents[0] : item.documents;
      const descriptionParts = [doc?.description, formatFileSize(doc?.file_size)].filter(Boolean);

      return `
        <tr>
          <td data-label="Document">
            <b>${escapeHtml(doc?.title || "Document")}</b>
            ${descriptionParts.length ? `<small>${escapeHtml(descriptionParts.join(" · "))}</small>` : ""}
          </td>
          <td data-label="Type">${escapeHtml(readableCategory(item.category))}</td>
          <td data-label="Status">${statusBadge(item.status)}</td>
          <td data-label="Date">${escapeHtml(formatDate(item.created_at))}</td>
          <td data-label="Action">
            <button class="docs-download" data-doc="${escapeHtml(item.id)}" data-category="${escapeHtml(item.category || "")}" type="button">${item.category === "onboarding_acknowledgment" || doc?.mime_type === "application/pdf" ? "Download PDF" : "Download"}</button>
          </td>
        </tr>`;
    }).join("");

    body.querySelectorAll("[data-doc]").forEach((button) => {
      button.addEventListener("click", () => downloadDocument(button));
    });
  }

  function filterDocuments() {
    const query = String($("documentsSearch")?.value || "").trim().toLowerCase();
    if (!query) {
      renderDocuments(documents);
      return;
    }
    renderDocuments(documents.filter((item) => documentText(item).includes(query)));
  }

  async function loadDocuments() {
    showPageMessage("");
    const data = await call({ action: "list" });
    documents = Array.isArray(data.documents) ? data.documents : [];
    updateSummary();
    filterDocuments();
  }

  async function downloadDocument(button) {
    const original = button.textContent;
    let objectUrl = "";
    try {
      button.disabled = true;
      button.textContent = "Preparing…";

      const data = button.dataset.category === "onboarding_acknowledgment"
        ? await callBrandedOnboardingPdf()
        : await call({ action: "signed", id: button.dataset.doc });

      if (!data.url) throw new Error("The document download is unavailable.");

      const response = await fetch(data.url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Document download failed (${response.status}).`);

      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = data.fileName || (data.mimeType === "application/pdf"
        ? "screenings4u-learning-center-document.pdf"
        : (data.title || "learning-center-document"));
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      window.S4UUI?.modal({
        title: "Download Unavailable",
        message: error.message || "Unable to download this document.",
        type: "error",
        confirmText: "Close"
      });
    } finally {
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      button.disabled = false;
      button.textContent = original;
    }
  }

  function validateFile(file) {
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error(`${file.name}: upload PDF, Word, JPG, PNG, or WebP files only.`);
    }
    if (!file.size || file.size > MAX_FILE_SIZE) {
      throw new Error(`${file.name}: each file must be 25 MB or smaller.`);
    }
  }

  function renderSelectedFiles() {
    const target = $("selectedFiles");
    if (!target) return;

    if (!selectedFiles.length) {
      target.textContent = "";
      target.classList.remove("is-populated");
      return;
    }

    target.textContent = `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} selected: ${selectedFiles.map((file) => file.name).join(", ")}`;
    target.classList.add("is-populated");
  }

  function setSelectedFiles(fileList) {
    selectedFiles = Array.from(fileList || []);
    renderSelectedFiles();
  }

  function setupDropzone() {
    const dropzone = $("mockDropzone");
    const input = $("mockFile");
    if (!dropzone || !input) return;

    dropzone.addEventListener("click", () => input.click());
    dropzone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    });

    ["dragenter", "dragover"].forEach((name) => {
      dropzone.addEventListener(name, (event) => {
        event.preventDefault();
        dropzone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach((name) => {
      dropzone.addEventListener(name, (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragover");
      });
    });

    dropzone.addEventListener("drop", (event) => {
      if (event.dataTransfer?.files?.length) {
        setSelectedFiles(event.dataTransfer.files);
      }
    });

    input.addEventListener("change", () => setSelectedFiles(input.files));
  }

  async function uploadOne(enrollmentId, file) {
    validateFile(file);

    const prepared = await call({
      action: "prepare_mock_upload",
      enrollmentId,
      file: {
        name: file.name,
        mimeType: file.type,
        size: file.size
      }
    });

    const uploaded = await db.storage
      .from(prepared.bucket)
      .uploadToSignedUrl(prepared.path, prepared.token, file, {
        contentType: file.type
      });

    if (uploaded.error) {
      throw new Error(`Upload failed for ${file.name}: ${uploaded.error.message}`);
    }

    return call({
      action: "finalize_mock_upload",
      enrollmentId,
      path: prepared.path,
      file: {
        name: file.name,
        mimeType: file.type,
        size: file.size
      }
    });
  }

  async function loadEnrollments() {
    const data = await call({ action: "enrollments" });
    const enrollments = Array.isArray(data.enrollments) ? data.enrollments : [];
    const select = $("enrollment");
    if (!select) return;

    select.innerHTML = `
      <option value="">Select your DOT course</option>
      ${enrollments.map((item) => {
        const course = Array.isArray(item.lms_courses) ? item.lms_courses[0] : item.lms_courses;
        return `<option value="${escapeHtml(item.id)}">${escapeHtml(course?.title || "Course")}</option>`;
      }).join("")}`;
  }

  async function handleUpload() {
    const button = $("uploadBtn");
    const enrollmentId = $("enrollment")?.value || "";

    if (!enrollmentId || !selectedFiles.length) {
      window.S4UUI?.modal({
        title: "Document Upload",
        message: "Choose your course and at least one document.",
        type: "error",
        confirmText: "Review Upload"
      });
      return;
    }

    try {
      selectedFiles.forEach(validateFile);
      button.disabled = true;
      $("uploadStatus").hidden = true;

      for (let index = 0; index < selectedFiles.length; index += 1) {
        button.textContent = `Uploading ${index + 1} of ${selectedFiles.length}…`;
        await uploadOne(enrollmentId, selectedFiles[index]);
      }

      const uploadedCount = selectedFiles.length;
      selectedFiles = [];
      $("mockFile").value = "";
      renderSelectedFiles();

      const status = $("uploadStatus");
      status.hidden = false;
      status.textContent = `${uploadedCount} document${uploadedCount === 1 ? "" : "s"} uploaded successfully. Administrators have been notified and your submission is awaiting review.`;

      await loadDocuments();
    } catch (error) {
      window.S4UUI?.modal({
        title: "Upload Failed",
        message: error.message || "Unable to upload the document.",
        type: "error",
        confirmText: "Close"
      });
    } finally {
      button.disabled = false;
      button.textContent = "Upload for Review";
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      db = await window.getScreenings4uSupabase();
      session = (await db.auth.getSession()).data.session;
      if (!session) return;

      setupDropzone();
      $("documentsSearch")?.addEventListener("input", filterDocuments);
      $("uploadBtn")?.addEventListener("click", handleUpload);

      await Promise.all([
        loadEnrollments(),
        loadDocuments()
      ]);
    } catch (error) {
      console.error("[LMS Documents]", error);
      showPageMessage(error.message || "Unable to load your documents right now.");
      window.S4UUI?.modal({
        title: "Documents Unavailable",
        message: error.message || "Unable to load your documents right now.",
        type: "error",
        confirmText: "Close"
      });
    }
  });
})();
