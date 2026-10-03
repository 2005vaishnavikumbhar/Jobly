import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:5000/api/jobs";

function App() {
  /* =======================================================
     STATE
  ======================================================= */

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState("");

  const [studentFriendly, setStudentFriendly] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  /* =======================================================
     SAVED JOBS
  ======================================================= */

  const [savedJobs, setSavedJobs] = useState(() => {
    try {
      // First use the new Jobly storage key.
      const joblySaved = JSON.parse(
        localStorage.getItem("joblySavedJobs")
      );

      if (Array.isArray(joblySaved)) {
        return joblySaved;
      }

      // Keep old saved jobs from the previous GradGuide version.
      const oldSaved = JSON.parse(
        localStorage.getItem("gradguideSavedJobs")
      );

      if (Array.isArray(oldSaved)) {
        return oldSaved;
      }

      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "joblySavedJobs",
      JSON.stringify(savedJobs)
    );
  }, [savedJobs]);

  /* =======================================================
     JOB KEY
  ======================================================= */

  const getJobKey = (job) => {
    return (
      job.jobUrl ||
      job.jobReference ||
      job.jobId ||
      job.id ||
      `${job.title}-${job.company}-${job.location}`
    );
  };

  /* =======================================================
     SAVED CHECK
  ======================================================= */

  const isSaved = (job) => {
    const key = getJobKey(job);

    return savedJobs.some(
      (savedJob) => getJobKey(savedJob) === key
    );
  };

  /* =======================================================
     SAVE / REMOVE JOB
  ======================================================= */

  const toggleSaveJob = (job) => {
    const key = getJobKey(job);

    setSavedJobs((current) => {
      const exists = current.some(
        (savedJob) => getJobKey(savedJob) === key
      );

      if (exists) {
        return current.filter(
          (savedJob) => getJobKey(savedJob) !== key
        );
      }

      return [...current, job];
    });
  };

  /* =======================================================
     FETCH JOBS
  ======================================================= */

  const fetchJobs = async (params = {}) => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(API_URL, {
        params,
      });

      setJobs(
        Array.isArray(response.data.jobs)
          ? response.data.jobs
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        "Could not load jobs. Please make sure the Jobly backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    fetchJobs();
  }, []);

  /* =======================================================
     BUILD FILTER PARAMETERS
  ======================================================= */

  const buildParams = ({
    nextSearch = search,
    nextLocation = location,
    nextCompany = company,
    nextSource = source,
  } = {}) => {
    const params = {};

    if (nextSearch.trim()) {
      params.search = nextSearch.trim();
    }

    if (nextLocation.trim()) {
      params.location = nextLocation.trim();
    }

    if (nextCompany.trim()) {
      params.company = nextCompany.trim();
    }

    if (nextSource.trim()) {
      params.source = nextSource.trim();
    }

    return params;
  };

  /* =======================================================
     APPLY FILTERS
  ======================================================= */

  const applyFilters = (options = {}) => {
    setShowSavedOnly(false);

    const params = buildParams(options);

    fetchJobs(params);
  };

  /* =======================================================
     SEARCH
  ======================================================= */

  const handleSearch = () => {
    applyFilters();
  };

  /* =======================================================
     LOCATION
  ======================================================= */

  const handleLocationChange = (event) => {
    const value = event.target.value;

    setLocation(value);

    applyFilters({
      nextLocation: value,
    });
  };

  /* =======================================================
     COMPANY
  ======================================================= */

  const handleCompanyChange = (event) => {
    const value = event.target.value;

    setCompany(value);

    applyFilters({
      nextCompany: value,
    });
  };

  /* =======================================================
     SOURCE
  ======================================================= */

  const handleSourceChange = (event) => {
    const value = event.target.value;

    setSource(value);

    applyFilters({
      nextSource: value,
    });
  };

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  const clearFilters = () => {
    setSearch("");
    setLocation("");
    setCompany("");
    setSource("");
    setStudentFriendly(false);
    setShowSavedOnly(false);
    setSortBy("newest");

    fetchJobs();
  };

  /* =======================================================
     STUDENT FRIENDLY
  ======================================================= */

  const isStudentFriendly = (job) => {
    if (!Array.isArray(job.jobType)) {
      return false;
    }

    return job.jobType.some((type) => {
      const value = String(type)
        .toLowerCase()
        .trim();

      return (
        value === "casual" ||
        value === "part-time"
      );
    });
  };

  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const locationOptions = useMemo(() => {
    const values = new Set();

    jobs.forEach((job) => {
      if (job.location) {
        values.add(String(job.location).trim());
      }
    });

    return Array.from(values).sort();
  }, [jobs]);

  const companyOptions = useMemo(() => {
    const values = new Set();

    jobs.forEach((job) => {
      if (job.company) {
        values.add(String(job.company).trim());
      }
    });

    return Array.from(values).sort();
  }, [jobs]);

  const sourceOptions = useMemo(() => {
    const values = new Set();

    jobs.forEach((job) => {
      if (job.source) {
        values.add(String(job.source).trim());
      }
    });

    return Array.from(values).sort();
  }, [jobs]);

  /* =======================================================
     VISIBLE JOBS
  ======================================================= */

  const visibleJobs = useMemo(() => {
    let result = [...jobs];

    // Student Friendly filter
    if (studentFriendly) {
      result = result.filter(isStudentFriendly);
    }

    // Saved Jobs filter
    if (showSavedOnly) {
      result = result.filter(isSaved);
    }

    // Sorting
    if (sortBy === "title") {
      result.sort((a, b) =>
        String(a.title || "").localeCompare(
          String(b.title || "")
        )
      );
    } else {
      result.sort((a, b) => {
        const dateA = new Date(
          a.postedDate || 0
        ).getTime();

        const dateB = new Date(
          b.postedDate || 0
        ).getTime();

        return dateB - dateA;
      });
    }

    return result;
  }, [
    jobs,
    studentFriendly,
    showSavedOnly,
    savedJobs,
    sortBy,
  ]);

  /* =======================================================
     SCROLL TO RESULTS
  ======================================================= */

  const showSavedJobs = () => {
    setShowSavedOnly(true);

    setTimeout(() => {
      document
        .getElementById("results")
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }, 50);
  };

  /* =======================================================
     FORMAT JOB TYPE
  ======================================================= */

  const formatJobType = (jobType) => {
    if (!Array.isArray(jobType) || jobType.length === 0) {
      return "Job type not provided";
    }

    return jobType.join(" • ");
  };

  /* =======================================================
     FORMAT DATE
  ======================================================= */

  const formatDate = (date) => {
    if (!date) {
      return "Date not listed";
    }

    // McDonald's currently provides dates like MM/DD/YYYY.
    // Boeing may provide ISO dates.
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="app">

      {/* =================================================
          HERO
      ================================================= */}

      <header className="hero">

        <div className="hero-inner">

          {/* BRAND */}
          <div className="brand-area">

            <div className="brand-mark">
              J
            </div>

            <div>
              <div className="brand-name">
                Jobly
              </div>

              <div className="brand-tagline">
                Student Job Discovery
              </div>
            </div>

          </div>

          {/* SAVED JOBS */}
          <button
            className="saved-summary"
            onClick={showSavedJobs}
            aria-label="View saved jobs"
          >
            <span className="saved-heart">
              ♥
            </span>

            <strong>
              {savedJobs.length}
            </strong>

            <small>
              Saved Jobs
            </small>
          </button>

        </div>

        {/* HERO MESSAGE */}

        <div className="hero-message">

          <div className="hero-eyebrow">
            DIRECT EMPLOYER OPPORTUNITIES
          </div>

          <h1>
            Find work that fits your next step.
          </h1>

          <p>
            Discover real opportunities from employer career sites - from flexible part-time and casual jobs to graduate roles and professional careers.
          </p>

        </div>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="container">

        {/* =================================================
            SEARCH PANEL
        ================================================= */}

        <section className="search-panel">

          {/* SEARCH */}

          <div className="search-row">

            <div className="search-input-wrapper">

              <span className="search-icon">
                🔎
              </span>

              <input
                type="text"
                value={search}
                placeholder="Search jobs, skills or employers..."
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                  }
                }}
              />

            </div>

            <button
              className="primary-button"
              onClick={handleSearch}
            >
              Search Jobs
            </button>

          </div>

          {/* FILTERS */}

          <div className="filters-grid">

            {/* LOCATION */}

            <div className="filter-field">

              <label>
                Location
              </label>

              <select
                value={location}
                onChange={handleLocationChange}
              >
                <option value="">
                  All locations
                </option>

                {locationOptions.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

            </div>

            {/* EMPLOYER */}

            <div className="filter-field">

              <label>
                Employer
              </label>

              <select
                value={company}
                onChange={handleCompanyChange}
              >
                <option value="">
                  All employers
                </option>

                {companyOptions.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

            </div>

            {/* SOURCE */}

            <div className="filter-field">

              <label>
                Source
              </label>

              <select
                value={source}
                onChange={handleSourceChange}
              >
                <option value="">
                  All sources
                </option>

                {sourceOptions.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

            </div>

            {/* STUDENT FRIENDLY */}

            <div className="filter-field">

              <label>
                Student Friendly
              </label>

              <button
                className={
                  studentFriendly
                    ? "feature-button active"
                    : "feature-button"
                }
                onClick={() =>
                  setStudentFriendly(
                    (current) => !current
                  )
                }
              >
                🎓 Student Friendly
              </button>

            </div>

          </div>

          {/* ACTIONS */}

          <div className="filter-actions">

            <button
              className="clear-button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>

          </div>

          {/* INFO */}

          <div className="student-info">

            <strong>
              🎓 Student Friendly
            </strong>

            <span>
              Highlights jobs where the employer
              explicitly lists Casual or Part-Time.
              This does not guarantee international
              student eligibility.
            </span>

          </div>

        </section>

        {/* =================================================
            RESULTS
        ================================================= */}

        <section
          className="results-section"
          id="results"
        >

          {/* RESULTS HEADER */}

          <div className="results-header">

            <div className="results-title">

              <span className="results-label">
                JOBLY RESULTS
              </span>

              <h2>
                {showSavedOnly
                  ? "Your Saved Jobs"
                  : "Explore Opportunities"}
              </h2>

              <p>
                {visibleJobs.length}{" "}
                {visibleJobs.length === 1
                  ? "job"
                  : "jobs"}{" "}
                shown
              </p>

            </div>

            <div className="results-actions">

              {/* SORT */}

              <select
                className="sort-select"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value)
                }
              >
                <option value="newest">
                  Newest first
                </option>

                <option value="title">
                  Job title A–Z
                </option>
              </select>

              {/* SAVED JOBS */}

              <button
                className={
                  showSavedOnly
                    ? "saved-view-button active"
                    : "saved-view-button"
                }
                onClick={showSavedJobs}
              >
                ♥ Saved Jobs ({savedJobs.length})
              </button>

              {/* VIEW ALL */}

              {showSavedOnly && (
                <button
                  className="all-jobs-button"
                  onClick={() =>
                    setShowSavedOnly(false)
                  }
                >
                  View All
                </button>
              )}

            </div>

          </div>

          {/* LOADING */}

          {loading && (
            <div className="status-box">

              <div className="spinner" />

              <p>
                Loading opportunities...
              </p>

            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="status-box error">

              <div className="error-icon">
                !
              </div>

              <strong>
                Unable to load jobs
              </strong>

              <p>
                {error}
              </p>

            </div>
          )}

          {/* EMPTY */}

          {!loading &&
            !error &&
            visibleJobs.length === 0 && (
              <div className="empty-state">

                <div className="empty-icon">
                  🔎
                </div>

                <h3>
                  {showSavedOnly
                    ? "No saved jobs yet"
                    : "No jobs found"}
                </h3>

                <p>
                  {showSavedOnly
                    ? "Save jobs you are interested in and they will appear here."
                    : "Try changing your filters or search terms."}
                </p>

                {showSavedOnly && (
                  <button
                    className="primary-button small-button"
                    onClick={() =>
                      setShowSavedOnly(false)
                    }
                  >
                    Browse All Jobs
                  </button>
                )}

              </div>
            )}

          {/* JOB GRID */}

          {!loading &&
            !error &&
            visibleJobs.length > 0 && (
              <div className="job-grid">

                {visibleJobs.map((job) => {
                  const saved = isSaved(job);

                  return (
                    <article
                      className="job-card"
                      key={getJobKey(job)}
                    >

                      {/* CARD HEADER */}

                      <div className="job-top">

                        <span className="source-badge">
                          {job.source ||
                            "Employer Careers"}
                        </span>

                        {isStudentFriendly(job) && (
                          <span className="student-badge">
                            🎓 Student Friendly
                          </span>
                        )}

                      </div>

                      {/* CARD CONTENT */}

                      <div className="job-content">

                        <h3>
                          {job.title ||
                            "Untitled Job"}
                        </h3>

                        <p className="company">
                          {job.company ||
                            "Employer not provided"}
                        </p>

                        <div className="job-details">

                          {/* LOCATION */}

                          <div className="job-detail">

                            <span className="detail-icon">
                              📍
                            </span>

                            <span>
                              {job.location ||
                                "Location not provided"}
                            </span>

                          </div>

                          {/* JOB TYPE */}

                          <div className="job-detail">

                            <span className="detail-icon">
                              💼
                            </span>

                            <span>
                              {formatJobType(
                                job.jobType
                              )}
                            </span>

                          </div>

                          {/* POSTED DATE */}

                          {job.postedDate && (
                            <div className="job-detail">

                              <span className="detail-icon">
                                📅
                              </span>

                              <span>
                                Posted{" "}
                                {formatDate(
                                  job.postedDate
                                )}
                              </span>

                            </div>
                          )}

                          {/* SALARY */}

                          {job.salary && (
                            <div className="job-detail">

                              <span className="detail-icon">
                                💰
                              </span>

                              <span>
                                {job.salary}
                              </span>

                            </div>
                          )}

                        </div>

                      </div>

                      {/* CARD ACTIONS */}

                      <div className="job-actions">

                        {/* SAVE */}

                        <button
                          className={
                            saved
                              ? "save-button saved"
                              : "save-button"
                          }
                          onClick={() =>
                            toggleSaveJob(job)
                          }
                        >
                          {saved
                            ? "♥ Saved"
                            : "♡ Save Job"}
                        </button>

                        {/* VIEW JOB */}

                        {job.jobUrl ? (
                          <a
                            className="view-job-button"
                            href={job.jobUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View Job
                            <span>
                              →
                            </span>
                          </a>
                        ) : job.sourceUrl ? (
                          <a
                            className="view-job-button"
                            href={job.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View Job
                            <span>
                              →
                            </span>
                          </a>
                        ) : (
                          <button
                            className="view-job-button disabled"
                            disabled
                          >
                            Link unavailable
                          </button>
                        )}

                      </div>

                    </article>
                  );
                })}

              </div>
            )}

        </section>

      </main>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer>

        <div className="footer-inner">

          <div className="footer-brand">

            <div className="footer-mark">
              J
            </div>

            <strong>
              Jobly
            </strong>

          </div>

          <span>
            Job discovery from direct employer
            career sources.
          </span>

        </div>

      </footer>

    </div>
  );
}

export default App;