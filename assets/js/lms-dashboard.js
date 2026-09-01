/* ============================================================
   SCREENINGS4U LEARNING CENTER
   LEARNER DASHBOARD — LIVE SUPABASE DATA
   ============================================================ */

(function () {
  "use strict";

  function startDashboard() {
    initializeDashboard().catch(function (error) {
      console.error("[LMS Dashboard]", error);
      showDashboardError(error);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startDashboard, { once: true });
  } else {
    startDashboard();
  }

  async function initializeDashboard() {
    if (!window.LMS || !window.LMS.ready) {
      throw new Error("Shared LMS authentication is unavailable.");
    }

    var state = await window.LMS.ready;
    var db = state.client;
    var user = state.user;
    var profile = state.profile || {};

    setGreeting(profile, user);

    var enrollmentResult = await db
      .from("lms_enrollments")
      .select(`
        id,
        user_id,
        course_id,
        status,
        progress_percent,
        enrolled_at,
        started_at,
        completed_at,
        last_activity_at,
        course:lms_courses(
          id,
          slug,
          title,
          short_description,
          description,
          status,
          certificate_enabled,
          thumbnail_media_id
        )
      `)
      .eq("user_id", user.id)
      .in("status", ["active", "completed"])
      .order("last_activity_at", { ascending: false, nullsFirst: false });

    if (enrollmentResult.error) {
      throw enrollmentResult.error;
    }

    var enrollments = enrollmentResult.data || [];

    await hydrateCourseImages(db, enrollments);

    var certificateResult = await db
      .from("lms_certificates")
      .select(`
        id,
        enrollment_id,
        status,
        issued_at,
        certificate_number,
        enrollment:lms_enrollments!inner(user_id)
      `)
      .eq("enrollment.user_id", user.id)
      .eq("status", "issued");

    if (certificateResult.error) {
      console.warn(
        "[LMS Dashboard] Certificates could not be loaded:",
        certificateResult.error
      );
    }

    var lessonProgressResult = await db
      .from("lms_lesson_progress")
      .select(`
        id,
        enrollment_id,
        lesson_id,
        progress_percent,
        started_at,
        completed_at,
        last_activity_at,
        lesson:lms_lessons(
          id,
          title,
          section:lms_sections(
            id,
            course_id,
            title
          )
        )
      `)
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .limit(20);

    if (lessonProgressResult.error) {
      console.warn(
        "[LMS Dashboard] Lesson activity could not be loaded:",
        lessonProgressResult.error
      );
    }

    renderContinueLearning(enrollments);
    renderCourseGrid(enrollments);
    renderStats(
      enrollments,
      certificateResult.data || [],
      lessonProgressResult.data || []
    );
    renderRecentActivity(
      enrollments,
      lessonProgressResult.data || []
    );
  }

  async function hydrateCourseImages(db, enrollments) {
    var mediaIds = Array.from(new Set(
      enrollments
        .map(function (enrollment) {
          return enrollment.course && enrollment.course.thumbnail_media_id;
        })
        .filter(Boolean)
    ));

    if (!mediaIds.length) return;

    var mediaResult = await db
      .from("lms_media")
      .select("id,storage_bucket,storage_path,thumbnail_url,playback_url")
      .in("id", mediaIds);

    if (mediaResult.error) {
      console.warn("[LMS Dashboard] Course images could not be loaded:", mediaResult.error);
      return;
    }

    var urls = new Map();
    await Promise.all((mediaResult.data || []).map(async function (media) {
      var directUrl = media.thumbnail_url || media.playback_url || "";
      if (directUrl) {
        urls.set(media.id, directUrl);
        return;
      }

      if (!media.storage_bucket || !media.storage_path) return;
      var signed = await db.storage
        .from(media.storage_bucket)
        .createSignedUrl(media.storage_path, 3600);

      if (signed.error) {
        console.warn("[LMS Dashboard] Signed course image URL failed:", signed.error);
        return;
      }

      urls.set(media.id, signed.data && signed.data.signedUrl || "");
    }));

    enrollments.forEach(function (enrollment) {
      if (!enrollment.course) return;
      enrollment.course.thumbnail_url =
        urls.get(enrollment.course.thumbnail_media_id) || "";
    });
  }

  function setGreeting(profile, user) {
    var name =
      profile.display_name ||
      profile.first_name ||
      (user.email ? user.email.split("@")[0] : "Learner");

    var first =
      profile.first_name ||
      String(name).trim().split(/\s+/)[0] ||
      "Learner";

    var title = document.querySelector(".lms-page-title");
    if (title) {
      title.textContent =
        greetingForHour(new Date().getHours()) + ", " + first + ".";
    }
  }

  function greetingForHour(hour) {
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  function renderContinueLearning(enrollments) {
    var card = document.querySelector(".lms-continue-card");
    if (!card) return;

    var active = enrollments.find(function (e) {
      return (
        e.status === "active" &&
        Number(e.progress_percent || 0) > 0
      );
    }) || enrollments.find(function (e) {
      return e.status === "active";
    });

    if (!active || !active.course) {
      card.innerHTML = `
        <div class="lms-continue-content" style="grid-column:1/-1;">
          <span class="lms-card-label">Continue Learning</span>
          <h2 class="lms-continue-title">No active course yet</h2>
          <p class="lms-continue-description">
            Your assigned or purchased training courses will appear here once enrollment is active.
          </p>
          <div class="lms-continue-actions">
            <a href="lms-courses.html" class="lms-button">View Courses</a>
          </div>
        </div>
      `;
      return;
    }

    var progress = clampPercent(active.progress_percent);
    var course = active.course;

    var title = card.querySelector(".lms-continue-title");
    var desc = card.querySelector(".lms-continue-description");
    var progressStrong = card.querySelector(".lms-progress-meta strong");
    var fill = card.querySelector(".lms-progress-fill");
    var resume = card.querySelector(".lms-continue-actions .lms-button");
    var details = card.querySelector(
      ".lms-continue-actions .lms-button-secondary"
    );
    var visualSmall = card.querySelector(".lms-visual-card small");
    var visualStrong = card.querySelector(".lms-visual-card strong");

    if (title) title.textContent = course.title || "Training Course";
    if (desc) {
      desc.textContent =
        course.short_description ||
        "Continue your course from your latest progress.";
    }
    if (progressStrong) {
      progressStrong.textContent = progress + "% Complete";
    }
    if (fill) fill.style.width = progress + "%";

    if (resume) {
      resume.href =
        "lms-course-player.html?course=" +
        encodeURIComponent(course.id) +
        "&enrollment=" +
        encodeURIComponent(active.id);
    }

    if (details) {
      details.href =
        "lms-course-details.html?course=" +
        encodeURIComponent(course.id);
    }

    if (visualSmall) visualSmall.textContent = "Active Course";
    if (visualStrong) visualStrong.textContent = course.title || "Course";

    var visual = card.querySelector(".lms-visual-card") ||
      card.querySelector(".lms-continue-visual");
    if (visual && course.thumbnail_url) {
      visual.style.backgroundImage =
        "linear-gradient(rgba(11,50,111,.12),rgba(11,50,111,.12)),url(\"" +
        String(course.thumbnail_url).replace(/\"/g, "%22") + "\")";
      visual.style.backgroundSize = "cover";
      visual.style.backgroundPosition = "center";
      visual.setAttribute("aria-label", (course.title || "Course") + " cover image");
      if (visualSmall) visualSmall.style.display = "none";
      if (visualStrong) visualStrong.style.display = "none";
    }
  }

  function renderCourseGrid(enrollments) {
    var grid = document.querySelector(".lms-course-grid");
    if (!grid) return;

    var active = enrollments
      .filter(function (e) {
        return e.course;
      })
      .slice(0, 3);

    if (!active.length) {
      grid.innerHTML = `
        <div class="lms-widget" style="grid-column:1/-1;">
          <h2 class="lms-widget-title">No courses in your learning plan</h2>
          <p class="lms-section-subtitle" style="margin-top:8px;">
            Enrolled courses will appear here automatically.
          </p>
        </div>
      `;
      return;
    }

    grid.innerHTML = active
      .map(function (e, index) {
        var progress = clampPercent(e.progress_percent);
        var course = e.course;
        var coverClass = [
          "lms-course-cover-one",
          "lms-course-cover-two",
          "lms-course-cover-three"
        ][index % 3];

        return `
          <a
            href="lms-course-details.html?course=${encodeURIComponent(course.id)}"
            class="lms-course-card"
          >
            <div class="lms-course-cover ${coverClass}"${course.thumbnail_url ? ` style="background-image:url('${escapeHtml(course.thumbnail_url)}');background-size:cover;background-position:center"` : ""}>
              <div class="lms-course-cover-icon"${course.thumbnail_url ? ' style="display:none"' : ""}>▶</div>
            </div>

            <div class="lms-course-body">
              <div class="lms-course-category">
                ${escapeHtml(e.status === "completed" ? "Completed" : "In Progress")}
              </div>

              <h3 class="lms-course-title">
                ${escapeHtml(course.title || "Training Course")}
              </h3>

              <div class="lms-course-meta">
                ${escapeHtml(course.short_description || statusText(e.status))}
              </div>

              <div class="lms-course-card-footer">
                <div class="lms-mini-progress">
                  <div class="lms-mini-progress-track">
                    <div
                      class="lms-mini-progress-fill"
                      style="width:${progress}%;"
                    ></div>
                  </div>
                </div>
                <span class="lms-progress-number">${progress}%</span>
              </div>
            </div>
          </a>
        `;
      })
      .join("");
  }

  function renderStats(enrollments, certificates, lessonProgress) {
    var values = document.querySelectorAll(".lms-stat-value");

    var inProgress = enrollments.filter(function (e) {
      return e.status === "active";
    }).length;

    var learningMinutes = lessonProgress.reduce(function (total, row) {
      if (!row.started_at || !row.completed_at) return total;

      var start = new Date(row.started_at).getTime();
      var end = new Date(row.completed_at).getTime();

      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        return total;
      }

      return total + Math.min((end - start) / 60000, 480);
    }, 0);

    var hours = Math.round((learningMinutes / 60) * 10) / 10;

    if (values[0]) values[0].textContent = String(inProgress);
    if (values[1]) values[1].textContent = String(hours);
    if (values[2]) values[2].textContent = String(certificates.length);
  }

  function renderRecentActivity(enrollments, lessonProgress) {
    var list = document.querySelector(".lms-activity-list");
    if (!list) return;

    var enrollmentIds = new Set(
      enrollments.map(function (e) {
        return e.id;
      })
    );

    var rows = lessonProgress
      .filter(function (row) {
        return enrollmentIds.has(row.enrollment_id);
      })
      .slice(0, 5);

    if (!rows.length) {
      list.innerHTML = `
        <div class="lms-activity-item">
          <span class="lms-activity-marker"></span>
          <div>
            <p class="lms-activity-title">No learning activity yet</p>
            <div class="lms-activity-time">
              Your lesson progress will appear here.
            </div>
          </div>
        </div>
      `;
      return;
    }

    list.innerHTML = rows
      .map(function (row) {
        var completed = Boolean(row.completed_at);
        var title =
          row.lesson && row.lesson.title
            ? row.lesson.title
            : "Lesson";

        return `
          <div class="lms-activity-item">
            <span class="lms-activity-marker ${completed ? "complete" : ""}"></span>
            <div>
              <p class="lms-activity-title">
                ${completed ? "Completed" : "Continued"} ${escapeHtml(title)}
              </p>
              <div class="lms-activity-time">
                ${escapeHtml(relativeDate(row.last_activity_at || row.completed_at || row.started_at))}
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function clampPercent(value) {
    var n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function relativeDate(value) {
    if (!value) return "Recently";

    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric"
    }).format(date);
  }

  function statusText(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (c) {
        return c.toUpperCase();
      });
  }

  function escapeHtml(value) {
    var div = document.createElement("div");
    div.textContent = String(value == null ? "" : value);
    return div.innerHTML;
  }

  function showDashboardError(error) {
    var content = document.querySelector(".lms-content");
    if (!content) return;

    var panel = document.createElement("div");
    panel.className = "lms-widget";
    panel.style.marginBottom = "18px";
    panel.innerHTML =
      "<strong>Unable to load learning data.</strong>" +
      "<p class='lms-section-subtitle' style='margin-top:6px;'>" +
      escapeHtml(error && error.message ? error.message : "Please refresh and try again.") +
      "</p>";

    content.insertBefore(panel, content.firstChild);
  }
})();
