const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

/* =========================================================
   LOAD JSON FILE
========================================================= */

function loadJobs(fileName) {
  const filePath = path.join(
    __dirname,
    "data",
    fileName
  );

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${fileName}`);
      return [];
    }

    const fileData = fs.readFileSync(
      filePath,
      "utf8"
    );

    const jobs = JSON.parse(fileData);

    return Array.isArray(jobs) ? jobs : [];
  } catch (error) {
    console.error(
      `Error loading ${fileName}:`,
      error.message
    );

    return [];
  }
}

/* =========================================================
   LOAD ALL JOBS
========================================================= */

function getAllJobs() {
  const mcdonaldsJobs = loadJobs(
    "mcdonaldsJobs.json"
  );

  const colesJobs = loadJobs(
    "colesJobs.json"
  );

  const boeingJobs = loadJobs(
    "boeingJobs.json"
  );

  return [
    ...mcdonaldsJobs,
    ...colesJobs,
    ...boeingJobs,
  ];
}

/* =========================================================
   REMOVE DUPLICATES
========================================================= */

function removeDuplicates(jobs) {
  const uniqueJobs = [];
  const seen = new Set();

  jobs.forEach((job) => {
    const uniqueKey =
      job.jobUrl ||
      job.jobReference ||
      job.jobId ||
      job.id ||
      `${job.title}-${job.company}-${job.location}`;

    if (!seen.has(uniqueKey)) {
      seen.add(uniqueKey);
      uniqueJobs.push(job);
    }
  });

  return uniqueJobs;
}

/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {
  res.json({
    message: "Jobly Job Discovery API",
    status: "running",
  });
});

/* =========================================================
   API STATS
========================================================= */

app.get("/api/stats", (req, res) => {
  try {
    const allJobs = getAllJobs();
    const jobs = removeDuplicates(allJobs);

    const stats = {
      totalJobs: jobs.length,

      sources: {},
      companies: {},
      jobTypes: {},
    };

    jobs.forEach((job) => {
      /* -----------------------------------------------
         SOURCE
      ------------------------------------------------ */

      const source =
        job.source || "Unknown";

      stats.sources[source] =
        (stats.sources[source] || 0) + 1;

      /* -----------------------------------------------
         COMPANY
      ------------------------------------------------ */

      const company =
        job.company || "Unknown";

      stats.companies[company] =
        (stats.companies[company] || 0) + 1;

      /* -----------------------------------------------
         JOB TYPE
      ------------------------------------------------ */

      if (Array.isArray(job.jobType)) {
        job.jobType.forEach((type) => {
          const cleanType = String(type).trim();

          if (cleanType) {
            stats.jobTypes[cleanType] =
              (stats.jobTypes[cleanType] || 0) + 1;
          }
        });
      }
    });

    res.json(stats);
  } catch (error) {
    console.error(
      "GET /api/stats error:",
      error
    );

    res.status(500).json({
      message: "Failed to load statistics",
      error: error.message,
    });
  }
});

/* =========================================================
   GET JOBS
========================================================= */

app.get("/api/jobs", (req, res) => {
  try {
    let jobs = getAllJobs();

    const {
      search,
      location,
      company,
      source,
    } = req.query;

    /* =====================================================
       SEARCH
    ===================================================== */

    if (search && search.trim()) {
      const searchTerm =
        search.trim().toLowerCase();

      jobs = jobs.filter((job) => {
        const title =
          String(job.title || "")
            .toLowerCase();

        const employer =
          String(job.company || "")
            .toLowerCase();

        const jobLocation =
          String(job.location || "")
            .toLowerCase();

        const description =
          String(job.description || "")
            .toLowerCase();

        const jobType =
          Array.isArray(job.jobType)
            ? job.jobType
                .join(" ")
                .toLowerCase()
            : "";

        return (
          title.includes(searchTerm) ||
          employer.includes(searchTerm) ||
          jobLocation.includes(searchTerm) ||
          description.includes(searchTerm) ||
          jobType.includes(searchTerm)
        );
      });
    }

    /* =====================================================
       LOCATION
    ===================================================== */

    if (location && location.trim()) {
      const locationTerm =
        location.trim().toLowerCase();

      jobs = jobs.filter((job) =>
        String(job.location || "")
          .toLowerCase()
          .includes(locationTerm)
      );
    }

    /* =====================================================
       COMPANY
    ===================================================== */

    if (company && company.trim()) {
      const companyTerm =
        company.trim().toLowerCase();

      jobs = jobs.filter((job) =>
        String(job.company || "")
          .toLowerCase()
          .includes(companyTerm)
      );
    }

    /* =====================================================
       SOURCE
    ===================================================== */

    if (source && source.trim()) {
      const sourceTerm =
        source.trim().toLowerCase();

      jobs = jobs.filter((job) =>
        String(job.source || "")
          .toLowerCase()
          .includes(sourceTerm)
      );
    }

    /* =====================================================
       REMOVE DUPLICATES
    ===================================================== */

    const uniqueJobs =
      removeDuplicates(jobs);

    /* =====================================================
       RESPONSE
    ===================================================== */

    res.json({
      count: uniqueJobs.length,
      jobs: uniqueJobs,
    });
  } catch (error) {
    console.error(
      "GET /api/jobs error:",
      error
    );

    res.status(500).json({
      message: "Failed to load jobs",
      error: error.message,
    });
  }
});

/* =========================================================
   404 HANDLER
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    message: "Endpoint not found",
  });
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log(
    `Jobly API running at http://localhost:${PORT}`
  );
});