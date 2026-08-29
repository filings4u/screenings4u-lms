/* ============================================================
   SCREENINGS4U LEARNING CENTER
   COURSE LIBRARY
   ============================================================ */

(function () {
  "use strict";


  /* ==========================================================
     STATE
     ========================================================== */

  const state = {

    courses: [],

    filteredCourses: [],

    featuredCourse: null

  };


  /* ==========================================================
     DOM READY
     ========================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    initializeCoursesPage
  );


  /* ==========================================================
     INITIALIZE
     ========================================================== */

  async function initializeCoursesPage() {

    bindCourseControls();

    await loadCourses();

  }


  /* ==========================================================
     LOAD COURSES
     ========================================================== */

  async function loadCourses() {

    showLoading(true);


    try {

      const client = getSupabaseClient();


      if (!client) {

        throw new Error(
          "Supabase client is not available."
        );

      }


      /*
       * COURSE QUERY
       *
       * We are using the existing LMS course table.
       * The field normalization below allows us to
       * match the exact admin data structure safely.
       */

      const response = await client
        .from("lms_courses")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );


      if (response.error) {

        throw response.error;

      }


      const rawCourses =
        response.data || [];


      /*
       * Only show published / active courses when
       * that status exists.
       */

      state.courses =
        rawCourses
          .filter(isAvailableCourse)
          .map(normalizeCourse);


      state.featuredCourse =
        getFeaturedCourse(
          state.courses
        );


      populateCategories();

      applyFilters();


    } catch (error) {

      console.error(
        "Unable to load LMS courses:",
        error
      );


      state.courses = [];

      state.filteredCourses = [];

      renderCourses();

    } finally {

      showLoading(false);

    }

  }


  /* ==========================================================
     SUPABASE CLIENT
     ========================================================== */

  function getSupabaseClient() {

    /*
     * Supports the existing project's client patterns.
     */

    if (
      window.supabaseClient
    ) {

      return window.supabaseClient;

    }


    if (
      window.supabase &&
      typeof window.supabase
        .from === "function"
    ) {

      return window.supabase;

    }


    if (
      window.supabaseClientInstance
    ) {

      return window.supabaseClientInstance;

    }


    return null;

  }


  /* ==========================================================
     COURSE AVAILABILITY
     ========================================================== */

  function isAvailableCourse(course) {

    const status =
      String(
        course.status || ""
      )
        .toLowerCase()
        .trim();


    /*
     * If no status exists, do not automatically
     * hide the course.
     */

    if (!status) {

      return true;

    }


    return [

      "published",

      "active",

      "available"

    ].includes(status);

  }


  /* ==========================================================
     NORMALIZE COURSE
     ========================================================== */

  function normalizeCourse(course) {

    return {

      id:
        course.id,

      title:
        course.title ||
        course.course_title ||
        "Untitled Course",

      description:
        course.description ||
        course.short_description ||
        "Course information will be available soon.",

      category:
        course.category ||
        course.course_category ||
        "Training",

      duration:
        course.duration ||
        course.duration_minutes ||
        course.estimated_duration ||
        "Self-paced",

      lessonCount:
        course.lesson_count ||
        course.lessons_count ||
        null,

      featured:
        Boolean(
          course.featured ||
          course.is_featured
        ),

      createdAt:
        course.created_at ||
        null,

      raw:
        course

    };

  }


  /* ==========================================================
     FEATURED COURSE
     ========================================================== */

  function getFeaturedCourse(courses) {

    if (!courses.length) {

      return null;

    }


    const explicitlyFeatured =
      courses.find(
        function (course) {

          return course.featured;

        }
      );


    return (
      explicitlyFeatured ||
      courses[0]
    );

  }


  function renderFeaturedCourse() {

    const course =
      state.featuredCourse;


    const section =
      document.getElementById(
        "featuredCourseSection"
      );


    if (!section) {

      return;

    }


    if (!course) {

      section.hidden = true;

      return;

    }


    section.hidden = false;


    setText(
      "featuredCourseCategory",
      course.category
    );


    setText(
      "featuredCourseTitle",
      course.title
    );


    setText(
      "featuredCourseDescription",
      course.description
    );


    setText(
      "featuredCourseDuration",
      formatDuration(
        course.duration
      )
    );


    setText(
      "featuredCourseLessons",
      course.lessonCount
        ? `${course.lessonCount} Lessons`
        : "Training Course"
    );


    const button =
      document.getElementById(
        "featuredCourseButton"
      );


    if (button) {

      button.href =
        getCourseDetailsUrl(
          course.id
        );

    }

  }


  /* ==========================================================
     FILTER CONTROLS
     ========================================================== */

  function bindCourseControls() {

    const searchInput =
      document.getElementById(
        "courseSearchInput"
      );


    const categoryFilter =
      document.getElementById(
        "courseCategoryFilter"
      );


    const sortFilter =
      document.getElementById(
        "courseSortFilter"
      );


    const clearButton =
      document.getElementById(
        "clearCourseFilters"
      );


    if (searchInput) {

      searchInput.addEventListener(
        "input",
        applyFilters
      );

    }


    if (categoryFilter) {

      categoryFilter.addEventListener(
        "change",
        applyFilters
      );

    }


    if (sortFilter) {

      sortFilter.addEventListener(
        "change",
        applyFilters
      );

    }


    if (clearButton) {

      clearButton.addEventListener(
        "click",
        clearFilters
      );

    }

  }


  /* ==========================================================
     CATEGORIES
     ========================================================== */

  function populateCategories() {

    const select =
      document.getElementById(
        "courseCategoryFilter"
      );


    if (!select) {

      return;

    }


    const categories =
      [
        ...new Set(

          state.courses
            .map(
              function (course) {

                return course.category;

              }
            )
            .filter(Boolean)

        )
      ]
        .sort();


    select.innerHTML =
      `
        <option value="all">
          All Categories
        </option>
      `;


    categories.forEach(
      function (category) {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          category;


        option.textContent =
          category;


        select.appendChild(
          option
        );

      }
    );

  }


  /* ==========================================================
     APPLY FILTERS
     ========================================================== */

  function applyFilters() {

    const searchInput =
      document.getElementById(
        "courseSearchInput"
      );


    const categoryFilter =
      document.getElementById(
        "courseCategoryFilter"
      );


    const sortFilter =
      document.getElementById(
        "courseSortFilter"
      );


    const search =
      searchInput
        ? searchInput.value
          .trim()
          .toLowerCase()
        : "";


    const category =
      categoryFilter
        ? categoryFilter.value
        : "all";


    const sort =
      sortFilter
        ? sortFilter.value
        : "newest";


    let courses =
      state.courses.filter(
        function (course) {

          const searchableText =
            [
              course.title,
              course.description,
              course.category
            ]
              .join(" ")
              .toLowerCase();


          const matchesSearch =
            !search ||
            searchableText.includes(
              search
            );


          const matchesCategory =
            category === "all" ||
            course.category === category;


          return (
            matchesSearch &&
            matchesCategory
          );

        }
      );


    courses =
      sortCourses(
        courses,
        sort
      );


    state.filteredCourses =
      courses;


    renderFeaturedCourse();

    renderCourses();

  }


  /* ==========================================================
     SORT
     ========================================================== */

  function sortCourses(
    courses,
    sort
  ) {

    const sorted =
      [...courses];


    if (
      sort === "title-asc"
    ) {

      return sorted.sort(
        function (a, b) {

          return a.title.localeCompare(
            b.title
          );

        }
      );

    }


    if (
      sort === "title-desc"
    ) {

      return sorted.sort(
        function (a, b) {

          return b.title.localeCompare(
            a.title
          );

        }
      );

    }


    return sorted.sort(
      function (a, b) {

        const aDate =
          a.createdAt
            ? new Date(a.createdAt)
            : new Date(0);


        const bDate =
          b.createdAt
            ? new Date(b.createdAt)
            : new Date(0);


        return bDate - aDate;

      }
    );

  }


  /* ==========================================================
     RENDER COURSES
     ========================================================== */

  function renderCourses() {

    const grid =
      document.getElementById(
        "courseGrid"
      );


    const emptyState =
      document.getElementById(
        "courseEmptyState"
      );


    if (!grid) {

      return;

    }


    grid.innerHTML = "";


    updateCourseCounts();


    if (
      !state.filteredCourses.length
    ) {

      if (emptyState) {

        emptyState.hidden = false;

      }


      return;

    }


    if (emptyState) {

      emptyState.hidden = true;

    }


    state.filteredCourses.forEach(
      function (course) {

        grid.appendChild(
          createCourseCard(
            course
          )
        );

      }
    );

  }


  /* ==========================================================
     COURSE CARD
     ========================================================== */

  function createCourseCard(course) {

    const article =
      document.createElement(
        "article"
      );


    article.className =
      "lms-course-card";


    article.innerHTML =
      `

        <div class="lms-course-card-visual">

          <span class="lms-course-card-icon">

            <svg viewBox="0 0 24 24">

              <path
                d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"
              />

              <path d="M4 5.5v16" />

              <path d="M8 8h8" />

              <path d="M8 12h6" />

            </svg>

          </span>

        </div>


        <div class="lms-course-card-body">

          <span class="lms-course-card-category">
            ${escapeHtml(course.category)}
          </span>


          <h3>
            ${escapeHtml(course.title)}
          </h3>


          <p class="lms-course-card-description">
            ${escapeHtml(course.description)}
          </p>


          <div class="lms-course-card-footer">

            <span class="lms-course-card-meta">
              ${escapeHtml(
                formatDuration(
                  course.duration
                )
              )}
            </span>


            <a
              href="${getCourseDetailsUrl(course.id)}"
              class="lms-course-card-action"
            >

              <span>
                View Course
              </span>


              <svg viewBox="0 0 24 24">

                <path d="M5 12h14" />

                <path d="m13 6 6 6-6 6" />

              </svg>

            </a>

          </div>

        </div>

      `;


    return article;

  }


  /* ==========================================================
     COUNTS
     ========================================================== */

  function updateCourseCounts() {

    const total =
      state.courses.length;


    const visible =
      state.filteredCourses.length;


    setText(
      "courseCount",
      total
    );


    setText(
      "courseResultsCount",
      `${visible} ${
        visible === 1
          ? "course"
          : "courses"
      }`
    );

  }


  /* ==========================================================
     CLEAR FILTERS
     ========================================================== */

  function clearFilters() {

    const searchInput =
      document.getElementById(
        "courseSearchInput"
      );


    const categoryFilter =
      document.getElementById(
        "courseCategoryFilter"
      );


    const sortFilter =
      document.getElementById(
        "courseSortFilter"
      );


    if (searchInput) {

      searchInput.value = "";

    }


    if (categoryFilter) {

      categoryFilter.value =
        "all";

    }


    if (sortFilter) {

      sortFilter.value =
        "newest";

    }


    applyFilters();

  }


  /* ==========================================================
     LOADING
     ========================================================== */

  function showLoading(show) {

    const loading =
      document.getElementById(
        "courseLoadingState"
      );


    const grid =
      document.getElementById(
        "courseGrid"
      );


    if (loading) {

      loading.hidden = !show;

    }


    if (grid && show) {

      grid.innerHTML = "";

    }

  }


  /* ==========================================================
     COURSE URL
     ========================================================== */

  function getCourseDetailsUrl(courseId) {

    if (!courseId) {

      return "#";

    }


    return (
      "lms-course-details.html?course=" +
      encodeURIComponent(courseId)
    );

  }


  /* ==========================================================
     DURATION
     ========================================================== */

  function formatDuration(value) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {

      return "Self-paced";

    }


    if (
      typeof value === "number"
    ) {

      if (value < 60) {

        return `${value} min`;

      }


      const hours =
        Math.floor(value / 60);


      const minutes =
        value % 60;


      return minutes
        ? `${hours}h ${minutes}m`
        : `${hours}h`;

    }


    return String(value);

  }


  /* ==========================================================
     TEXT
     ========================================================== */

  function setText(
    id,
    value
  ) {

    const element =
      document.getElementById(id);


    if (element) {

      element.textContent =
        value || "";

    }

  }


  /* ==========================================================
     HTML ESCAPE
     ========================================================== */

  function escapeHtml(value) {

    return String(
      value || ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );

  }


})();