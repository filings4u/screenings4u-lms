/* ============================================================
   SCREENINGS4U LEARNING CENTER
   MY COURSES — LIVE LEARNER DATA
   ============================================================ */

(function () {
  "use strict";

  var state = {
    db: null,
    user: null,
    enrollments: [],
    courses: new Map(),
    sections: [],
    lessons: [],
    certificates: []
  };

  document.addEventListener("DOMContentLoaded", function () {
    initializeMyCourses().catch(function (error) {
      console.error("[LMS My Courses]", error);
      renderError(error);
    });
  });

  async function initializeMyCourses() {
    if (!window.LMS || !window.LMS.ready) {
      throw new Error("Shared LMS authentication is unavailable.");
    }

    var auth = await window.LMS.ready;

    state.db = auth.client;
    state.user = auth.user;

    await loadLearnerData();

    renderContinueLearning();
    renderCourseGrid();
  }

  async function loadLearnerData() {
    var enrollmentResult = await state.db
      .from("lms_enrollments")
      .select(
        "id,user_id,course_id,status,progress_percent,enrolled_at,started_at,completed_at,last_activity_at"
      )
      .eq("user_id", state.user.id)
      .in("status", ["active", "completed"])
      .order("last_activity_at", {
        ascending: false,
        nullsFirst: false
      });

    if (enrollmentResult.error) {
      throw enrollmentResult.error;
    }

    state.enrollments = enrollmentResult.data || [];

    var courseIds = unique(
      state.enrollments.map(function (row) {
        return row.course_id;
      })
    );

    if (!courseIds.length) {
      state.courses = new Map();
      state.sections = [];
      state.lessons = [];
      state.certificates = [];
      return;
    }

    var courseResult = await state.db
      .from("lms_courses")
      .select(
        "id,slug,title,short_description,description,status,certificate_enabled,published_at"
      )
      .in("id", courseIds);

    if (courseResult.error) {
      throw courseResult.error;
    }

    state.courses = new Map(
      (courseResult.data || []).map(function (course) {
        return [course.id, course];
      })
    );

    var sectionResult = await state.db
      .from("lms_sections")
      .select("id,course_id,title,sort_order,is_published")
      .in("course_id", courseIds)
      .order("sort_order", { ascending: true });

    if (sectionResult.error) {
      throw sectionResult.error;
    }

    state.sections = sectionResult.data || [];

    var sectionIds = state.sections.map(function (section) {
      return section.id;
    });

    if (sectionIds.length) {
      var lessonResult = await state.db
        .from("lms_lessons")
        .select(
          "id,section_id,title,status,sort_order,is_required,estimated_minutes"
        )
        .in("section_id", sectionIds)
        .order("sort_order", { ascending: true });

      if (lessonResult.error) {
        throw lessonResult.error;
      }

      state.lessons = lessonResult.data || [];
    }

    var certificateResult = await state.db
      .from("lms_certificates")
      .select(
        "id,enrollment_id,certificate_number,status,issued_at,certificate_media_id"
      )
      .in(
        "enrollment_id",
        state.enrollments.map(function (row) {
          return row.id;
        })
      )
      .order("issued_at", { ascending: false });

    if (certificateResult.error) {
      console.warn(
        "[LMS My Courses] Certificates could not be loaded:",
        certificateResult.error
      );
      state.certificates = [];
    } else {
      state.certificates = certificateResult.data || [];
    }
  }

  function renderContinueLearning() {
    var card = document.getElementById("my-learning-continue-card");
    if (!card) return;

    var enrollment =
      state.enrollments.find(function (row) {
        return (
          row.status === "active" &&
          Number(row.progress_percent || 0) > 0 &&
          state.courses.has(row.course_id)
        );
      }) ||
      state.enrollments.find(function (row) {
        return (
          row.status === "active" &&
          state.courses.has(row.course_id)
        );
      });

    if (!enrollment) {
      card.innerHTML = `
        <div class="continue-course-body" style="grid-column:1/-1;">
          <div class="continue-course-top">
            <span class="continue-course-status">
              <span class="continue-course-status-dot"></span>
              No Active Course
            </span>
          </div>

          <h2>Your learning plan is ready for enrollment.</h2>

          <p>
            Assigned and purchased courses will appear here automatically
            when your enrollment becomes active.
          </p>

          <div class="continue-course-actions">
            <a href="lms-courses.html" class="course-action-primary">
              Browse Courses
            </a>
          </div>
        </div>
      `;
      return;
    }

    var course = state.courses.get(enrollment.course_id);
    var progress = percent(enrollment.progress_percent);
    var lessonCount = lessonsForCourse(course.id).length;
    var completedLessons = completedLessonEstimate(
      lessonCount,
      progress
    );

    card.innerHTML = `
      <div class="continue-course-visual">
        <div class="continue-course-visual-content">
          <div class="continue-course-category">
            ${escapeHtml(enrollment.status === "completed" ? "Completed" : "In Progress")}
          </div>
          <div class="continue-course-visual-title">
            ${escapeHtml(course.title || "Training Course")}
          </div>
        </div>
      </div>

      <div class="continue-course-body">
        <div class="continue-course-top">
          <span class="continue-course-status">
            <span class="continue-course-status-dot"></span>
            ${escapeHtml(statusText(enrollment.status))}
          </span>
        </div>

        <h2>${escapeHtml(course.title || "Training Course")}</h2>

        <p>
          ${escapeHtml(
            course.short_description ||
            "Continue your assigned Screenings4u training."
          )}
        </p>

        <div class="continue-course-meta">
          <span class="continue-course-meta-item">
            ${lessonCount} ${lessonCount === 1 ? "lesson" : "lessons"}
          </span>
          <span class="continue-course-meta-item">
            ${completedLessons} estimated complete
          </span>
          <span class="continue-course-meta-item">
            Last activity ${escapeHtml(formatDate(enrollment.last_activity_at))}
          </span>
        </div>

        <div class="continue-course-progress">
          <div class="continue-course-progress-row">
            <span>Course Progress</span>
            <strong>${progress}%</strong>
          </div>

          <div class="continue-course-progress-track">
            <div
              class="continue-course-progress-fill"
              style="width:${progress}%;"
            ></div>
          </div>
        </div>

        <div class="continue-course-actions">
          <a
            href="lms-course-details.html?course=${encodeURIComponent(course.id)}"
            class="course-action-secondary"
          >
            View Details
          </a>

          <a
            href="lms-course-player.html?course=${encodeURIComponent(course.id)}&enrollment=${encodeURIComponent(enrollment.id)}"
            class="course-action-primary"
          >
            ${progress > 0 ? "Resume Course" : "Start Course"}
          </a>
        </div>
      </div>
    `;
  }

  function renderCourseGrid() {
    var grid = document.getElementById("my-learning-course-grid");
    if (!grid) return;

    var rows = state.enrollments.filter(function (enrollment) {
      return state.courses.has(enrollment.course_id);
    });

    if (!rows.length) {
      grid.innerHTML = `
        <div class="my-learning-empty" style="grid-column:1/-1;">
          <div class="my-learning-empty-icon">✓</div>
          <div>
            <h3>No enrolled courses yet</h3>
            <p>
              Courses assigned or purchased for this account will appear here.
            </p>
          </div>
          <a href="lms-courses.html">Browse Courses</a>
        </div>
      `;
      return;
    }

    grid.innerHTML = rows
      .map(function (enrollment, index) {
        var course = state.courses.get(enrollment.course_id);
        var progress = percent(enrollment.progress_percent);
        var completed = enrollment.status === "completed" || progress >= 100;
        var lessonCount = lessonsForCourse(course.id).length;
        var certificate = certificateForEnrollment(enrollment.id);

        var topClass =
          index % 3 === 1
            ? "course-light"
            : index % 3 === 2
              ? "course-orange"
              : "";

        var statusClass = completed ? "completed" : "in-progress";
        var statusLabel = completed
          ? "Completed"
          : progress > 0
            ? "In Progress"
            : "Not Started";

        var actionHref;
        var actionLabel;

        if (completed && certificate && certificate.status === "issued") {
          actionHref =
            "lms-certificates.html?certificate=" +
            encodeURIComponent(certificate.id);
          actionLabel = "Certificate";
        } else {
          actionHref =
            "lms-course-player.html?course=" +
            encodeURIComponent(course.id) +
            "&enrollment=" +
            encodeURIComponent(enrollment.id);
          actionLabel = progress > 0 ? "Continue Course" : "Start Course";
        }

        return `
          <article class="my-course-card">
            <div class="my-course-card-top ${topClass}">
              <span class="my-course-card-top-label">
                ${escapeHtml(statusLabel)}
              </span>
            </div>

            <div class="my-course-card-body">
              <span class="my-course-card-status ${statusClass}">
                ${escapeHtml(statusLabel)}
              </span>

              <h3>${escapeHtml(course.title || "Training Course")}</h3>

              <p>
                ${escapeHtml(
                  course.short_description ||
                  "Screenings4u learner training course."
                )}
              </p>

              <div class="my-course-card-progress">
                <div class="my-course-card-progress-row">
                  <span>Progress</span>
                  <strong>${progress}%</strong>
                </div>

                <div class="my-course-card-track">
                  <div
                    class="my-course-card-fill"
                    style="width:${progress}%;"
                  ></div>
                </div>
              </div>

              <div class="my-course-card-footer">
                <span class="my-course-card-meta">
                  ${lessonCount}
                  ${lessonCount === 1 ? "lesson" : "lessons"}
                </span>

                <a
                  href="${actionHref}"
                  class="my-course-card-link"
                >
                  ${actionLabel}
                </a>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function lessonsForCourse(courseId) {
    var sectionIds = new Set(
      state.sections
        .filter(function (section) {
          return section.course_id === courseId;
        })
        .map(function (section) {
          return section.id;
        })
    );

    return state.lessons.filter(function (lesson) {
      return sectionIds.has(lesson.section_id);
    });
  }

  function certificateForEnrollment(enrollmentId) {
    return state.certificates.find(function (certificate) {
      return certificate.enrollment_id === enrollmentId;
    }) || null;
  }

  function completedLessonEstimate(total, progress) {
    if (!total) return 0;
    return Math.min(total, Math.round(total * (progress / 100)));
  }

  function percent(value) {
    var number = Number(value || 0);

    if (!Number.isFinite(number)) {
      number = 0;
    }

    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function unique(values) {
    return Array.from(
      new Set(
        values.filter(Boolean)
      )
    );
  }

  function formatDate(value) {
    if (!value) return "—";

    var date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(date);
  }

  function statusText(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function escapeHtml(value) {
    var div = document.createElement("div");
    div.textContent = String(value == null ? "" : value);
    return div.innerHTML;
  }

  function renderError(error) {
    var grid = document.getElementById("my-learning-course-grid");

    if (grid) {
      grid.innerHTML = `
        <div class="my-learning-empty" style="grid-column:1/-1;">
          <div class="my-learning-empty-icon">!</div>
          <div>
            <h3>Unable to load your courses</h3>
            <p>${escapeHtml(
              error && error.message
                ? error.message
                : "Please refresh and try again."
            )}</p>
          </div>
          <a href="lms-dashboard.html">Dashboard</a>
        </div>
      `;
    }
  }
})();
