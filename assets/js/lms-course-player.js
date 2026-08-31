/* ============================================================
   SCREENINGS4U LEARNING CENTER
   COURSE PLAYER — LIVE LEARNER DATA
   ============================================================ */

(function () {
  "use strict";

  var state = {
    db: null,
    user: null,
    enrollment: null,
    course: null,
    sections: [],
    lessons: [],
    progress: new Map(),
    currentIndex: 0
  };

  document.addEventListener("DOMContentLoaded", function () {
    initialize().catch(function (error) {
      console.error("[LMS Course Player]", error);
      showError(error);
    });
  });

  async function initialize() {
    if (!window.LMS || !window.LMS.ready) {
      throw new Error("Shared LMS authentication is unavailable.");
    }

    var auth = await window.LMS.ready;
    state.db = auth.client;
    state.user = auth.user;

    var params = new URLSearchParams(location.search);
    var courseId = params.get("course") || params.get("course_id") || "";
    var enrollmentId = params.get("enrollment") || params.get("enrollment_id") || "";
    var lessonId = params.get("lesson") || params.get("lesson_id") || "";

    await loadEnrollment(courseId, enrollmentId);
    await loadCourse();
    await loadCurriculum();
    await loadProgress();

    if (lessonId) {
      var requested = state.lessons.findIndex(function (lesson) {
        return lesson.id === lessonId;
      });
      if (requested >= 0) state.currentIndex = requested;
    } else {
      state.currentIndex = firstIncompleteIndex();
    }

    renderCourseHeader();
    renderCurriculum();
    bindNavigation();
    renderCurrentLesson(false);
  }

  async function loadEnrollment(courseId, enrollmentId) {
    var query = state.db
      .from("lms_enrollments")
      .select("*")
      .eq("user_id", state.user.id);

    if (enrollmentId) query = query.eq("id", enrollmentId);
    else if (courseId) query = query.eq("course_id", courseId);
    else throw new Error("A course or enrollment ID is required.");

    var result = await query
      .in("status", ["active", "completed"])
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (result.error) throw result.error;
    if (!result.data) {
      throw new Error("You do not have an active enrollment for this course.");
    }

    state.enrollment = result.data;
  }

  async function loadCourse() {
    var result = await state.db
      .from("lms_courses")
      .select("*")
      .eq("id", state.enrollment.course_id)
      .single();

    if (result.error) throw result.error;
    state.course = result.data;
  }

  async function loadCurriculum() {
    var sectionResult = await state.db
      .from("lms_sections")
      .select("*")
      .eq("course_id", state.course.id)
      .order("sort_order", { ascending: true });

    if (sectionResult.error) throw sectionResult.error;
    state.sections = sectionResult.data || [];

    var sectionIds = state.sections.map(function (section) {
      return section.id;
    });

    if (!sectionIds.length) {
      state.lessons = [];
      return;
    }

    var lessonResult = await state.db
      .from("lms_lessons")
      .select("*")
      .in("section_id", sectionIds)
      .order("sort_order", { ascending: true });

    if (lessonResult.error) throw lessonResult.error;

    var sectionOrder = new Map(
      state.sections.map(function (section, index) {
        return [section.id, index];
      })
    );

    state.lessons = (lessonResult.data || []).sort(function (a, b) {
      var sectionCompare =
        (sectionOrder.get(a.section_id) || 0) -
        (sectionOrder.get(b.section_id) || 0);

      if (sectionCompare !== 0) return sectionCompare;
      return Number(a.sort_order || 0) - Number(b.sort_order || 0);
    });
  }

  async function loadProgress() {
    if (!state.lessons.length) return;

    var lessonIds = state.lessons.map(function (lesson) {
      return lesson.id;
    });

    var result = await state.db
      .from("lms_lesson_progress")
      .select("*")
      .eq("enrollment_id", state.enrollment.id)
      .in("lesson_id", lessonIds);

    if (result.error) throw result.error;

    state.progress = new Map(
      (result.data || []).map(function (row) {
        return [row.lesson_id, row];
      })
    );
  }

  function renderCourseHeader() {
    setText(".course-player-kicker", "Learning Center");
    setText(".course-player-title", state.course.title || "Training Course");
    setText(
      ".course-player-subtitle",
      state.course.short_description ||
        state.course.description ||
        "Continue your training from where you left off."
    );

    var detailLink = document.querySelector(
      ".course-player-breadcrumb a[href^='lms-course-details']"
    );

    if (detailLink) {
      detailLink.textContent = state.course.title || "Course";
      detailLink.href =
        "lms-course-details.html?course=" +
        encodeURIComponent(state.course.id);
    }

    updateProgressSummary();
  }

  function renderCurriculum() {
    var host = document.querySelector(".course-player-sidebar-scroll");
    if (!host) return;

    if (!state.sections.length || !state.lessons.length) {
      host.innerHTML =
        '<div style="padding:20px;color:#687386;">No published lessons are available for this course yet.</div>';
      return;
    }

    host.innerHTML = state.sections
      .map(function (section, sectionIndex) {
        var lessons = state.lessons.filter(function (lesson) {
          return lesson.section_id === section.id;
        });

        if (!lessons.length) return "";

        return `
          <div
            class="course-player-module is-open"
            data-section-id="${escapeHtml(section.id)}"
          >
            <button
              type="button"
              class="course-player-module-button"
              aria-expanded="true"
            >
              <span class="course-player-module-left">
                <span class="course-player-module-number">
                  ${String(sectionIndex + 1).padStart(2, "0")}
                </span>
                <span class="course-player-module-name">
                  ${escapeHtml(section.title || "Module " + (sectionIndex + 1))}
                </span>
              </span>

              <svg
                class="course-player-module-chevron"
                viewBox="0 0 24 24"
              >
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </button>

            <div class="course-player-lessons">
              ${lessons
                .map(function (lesson) {
                  var index = state.lessons.findIndex(function (row) {
                    return row.id === lesson.id;
                  });

                  var completed = isLessonComplete(lesson.id);

                  return `
                    <button
                      type="button"
                      class="course-player-lesson-link ${
                        completed ? "is-complete" : ""
                      }"
                      data-live-lesson-index="${index}"
                    >
                      <span class="course-player-lesson-status">
                        ${
                          completed
                            ? '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>'
                            : ""
                        }
                      </span>

                      <span class="course-player-lesson-copy">
                        <span class="course-player-lesson-name">
                          ${escapeHtml(lesson.title || "Lesson")}
                        </span>

                        <span class="course-player-lesson-meta">
                          ${lessonMeta(lesson)}
                        </span>
                      </span>
                    </button>
                  `;
                })
                .join("")}
            </div>
          </div>
        `;
      })
      .join("");

    host
      .querySelectorAll(".course-player-module-button")
      .forEach(function (button) {
        button.addEventListener("click", function () {
          var module = button.closest(".course-player-module");
          var open = module.classList.toggle("is-open");
          button.setAttribute("aria-expanded", open ? "true" : "false");
        });
      });

    host
      .querySelectorAll("[data-live-lesson-index]")
      .forEach(function (button) {
        button.addEventListener("click", function () {
          var index = Number(button.dataset.liveLessonIndex);
          if (Number.isFinite(index)) {
            state.currentIndex = index;
            renderCurrentLesson(true);
          }
        });
      });
  }

  function bindNavigation() {
    var prev = document.querySelector("[data-course-prev]");
    var next = document.querySelector("[data-course-next]");

    if (prev) {
      prev.onclick = function () {
        if (state.currentIndex > 0) {
          state.currentIndex -= 1;
          renderCurrentLesson(true);
        }
      };
    }

    if (next) {
      next.onclick = function () {
        completeCurrentLesson().catch(function (error) {
          console.error("[LMS Course Player]", error);
          alert(error.message || "Unable to save lesson progress.");
        });
      };
    }
  }

  function renderCurrentLesson(scrollTop) {
    if (!state.lessons.length) {
      setText("[data-current-title]", "Course content is not available yet");
      setText(
        "[data-current-intro]",
        "This course does not currently contain learner lessons."
      );
      return;
    }

    state.currentIndex = Math.max(
      0,
      Math.min(state.currentIndex, state.lessons.length - 1)
    );

    var lesson = state.lessons[state.currentIndex];
    var section = state.sections.find(function (row) {
      return row.id === lesson.section_id;
    });

    setText(
      "[data-current-module]",
      section ? section.title || "Module" : "Module"
    );
    setText("[data-current-title]", lesson.title || "Lesson");
    setText(
      "[data-current-intro]",
      lesson.description ||
        lesson.content_text ||
        "Complete this lesson to continue through the course."
    );
    setText(
      "[data-current-note]",
      lesson.is_required === false
        ? "This lesson is optional."
        : "Complete this lesson to record your progress."
    );
    setText(
      "[data-current-lesson-label]",
      "Lesson " +
        (state.currentIndex + 1) +
        " · " +
        (lesson.title || "Lesson")
    );
    setText(
      "[data-current-lesson-count]",
      state.currentIndex +
        1 +
        " of " +
        state.lessons.length +
        " lessons"
    );

    document
      .querySelectorAll("[data-live-lesson-index]")
      .forEach(function (button) {
        var index = Number(button.dataset.liveLessonIndex);
        var row = state.lessons[index];
        var completed = row ? isLessonComplete(row.id) : false;

        button.classList.toggle("is-active", index === state.currentIndex);
        button.classList.toggle("is-complete", completed);

        var status = button.querySelector(".course-player-lesson-status");
        if (status) {
          status.innerHTML = completed
            ? '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>'
            : "";
        }
      });

    var prev = document.querySelector("[data-course-prev]");
    var next = document.querySelector("[data-course-next]");
    var nextLabel = document.querySelector("[data-course-next-label]");

    if (prev) prev.disabled = state.currentIndex === 0;

    if (next) {
      next.disabled = false;
    }

    if (nextLabel) {
      nextLabel.textContent =
        state.currentIndex === state.lessons.length - 1
          ? isLessonComplete(lesson.id)
            ? "Course Complete"
            : "Complete Course"
          : isLessonComplete(lesson.id)
            ? "Continue"
            : "Complete & Continue";
    }

    updateProgressSummary();

    var url = new URL(location.href);
    url.searchParams.set("course", state.course.id);
    url.searchParams.set("enrollment", state.enrollment.id);
    url.searchParams.set("lesson", lesson.id);
    history.replaceState(null, "", url.toString());

    if (scrollTop) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function completeCurrentLesson() {
    var lesson = state.lessons[state.currentIndex];
    if (!lesson) return;

    var now = new Date().toISOString();
    var existing = state.progress.get(lesson.id);

    var payload = {
      enrollment_id: state.enrollment.id,
      lesson_id: lesson.id,
      completed_at: now,
      is_completed: true,
      last_activity_at: now
    };

    var result;

    if (existing && existing.id) {
      result = await state.db
        .from("lms_lesson_progress")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await state.db
        .from("lms_lesson_progress")
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) throw result.error;
    state.progress.set(lesson.id, result.data);

    var completedCount = state.lessons.filter(function (row) {
      return isLessonComplete(row.id);
    }).length;

    var progressPercent = state.lessons.length
      ? Math.round((completedCount / state.lessons.length) * 100)
      : 0;

    var enrollmentUpdate = {
      progress_percent: progressPercent,
      last_activity_at: now
    };

    if (!state.enrollment.started_at) {
      enrollmentUpdate.started_at = now;
    }

    if (progressPercent >= 100) {
      enrollmentUpdate.status = "completed";
      enrollmentUpdate.completed_at = now;
    }

    var enrollmentResult = await state.db
      .from("lms_enrollments")
      .update(enrollmentUpdate)
      .eq("id", state.enrollment.id)
      .eq("user_id", state.user.id)
      .select()
      .single();

    if (enrollmentResult.error) throw enrollmentResult.error;
    state.enrollment = enrollmentResult.data;

    renderCurriculum();

    if (state.currentIndex < state.lessons.length - 1) {
      state.currentIndex += 1;
      renderCurrentLesson(true);
    } else {
      renderCurrentLesson(false);
    }
  }

  function firstIncompleteIndex() {
    var index = state.lessons.findIndex(function (lesson) {
      return !isLessonComplete(lesson.id);
    });

    return index >= 0 ? index : Math.max(0, state.lessons.length - 1);
  }

  function isLessonComplete(lessonId) {
    var row = state.progress.get(lessonId);
    return !!(row && (row.completed_at || row.is_completed));
  }

  function updateProgressSummary() {
    var completed = state.lessons.filter(function (lesson) {
      return isLessonComplete(lesson.id);
    }).length;

    var progress = state.lessons.length
      ? Math.round((completed / state.lessons.length) * 100)
      : Number(state.enrollment.progress_percent || 0);

    progress = Math.max(0, Math.min(100, progress));

    setText("[data-course-progress-text]", progress + "%");

    var fill = document.querySelector("[data-course-progress-fill]");
    if (fill) fill.style.width = progress + "%";
  }

  function lessonMeta(lesson) {
    var minutes = Number(lesson.estimated_minutes || 0);

    if (minutes > 0) {
      return minutes + (minutes === 1 ? " minute" : " minutes");
    }

    return lesson.is_required === false ? "Optional lesson" : "Required lesson";
  }

  function setText(selector, value) {
    var element = document.querySelector(selector);
    if (element) element.textContent = value == null ? "" : String(value);
  }

  function escapeHtml(value) {
    var div = document.createElement("div");
    div.textContent = String(value == null ? "" : value);
    return div.innerHTML;
  }

  function showError(error) {
    var title = document.querySelector("[data-current-title]");
    var intro = document.querySelector("[data-current-intro]");
    var note = document.querySelector("[data-current-note]");

    if (title) title.textContent = "Unable to open this course";
    if (intro) {
      intro.textContent =
        error && error.message
          ? error.message
          : "Please return to My Courses and try again.";
    }
    if (note) {
      note.textContent =
        "Only courses attached to your authenticated learner enrollment can be opened.";
    }
  }
})();
