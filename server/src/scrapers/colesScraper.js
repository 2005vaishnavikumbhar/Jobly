const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://careers.colesgroup.com.au";

const START_URL =
  `${BASE_URL}/go/Store-Teams-%26-Leadership/5259710/`;

const MAX_PAGES = 2;
const REQUEST_DELAY_MS = 500;
const REQUEST_TIMEOUT_MS = 20000;


// ============================================
// WAIT
// ============================================

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


// ============================================
// FETCH PAGE
// ============================================

async function fetchPage(url) {
  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    },
    timeout: REQUEST_TIMEOUT_MS,
  });

  return response.data;
}


// ============================================
// GET JOB LINKS
// ============================================

function parseJobLinks(html) {
  const $ = cheerio.load(html);

  const jobs = [];

  $("a").each((index, element) => {
    const href = $(element).attr("href");

    const title = $(element)
      .text()
      .replace(/\s+/g, " ")
      .trim();

    if (!href) {
      return;
    }

    if (!href.includes("/job/")) {
      return;
    }

    const jobUrl = new globalThis.URL(
      href,
      BASE_URL
    ).href;

    jobs.push({
      title,
      jobUrl,
    });
  });

  return jobs;
}


// ============================================
// GET LOCATION
// ============================================

function extractLocation(jobUrl, title) {
  /*
    Example URL:

    https://careers.colesgroup.com.au/job/
    Dalby-Baker-Coles-Supermarkets-Dalby-QLD-4405/
    1366865566/

    We extract:

    QLD
    4405

    Then use the final part of the title:

    Baker - Coles Supermarkets - Dalby

    => Dalby
  */

  const match = jobUrl.match(
    /-([A-Z]{2,3})-(\d{4})\/\d+\/?$/
  );

  if (!match) {
    return null;
  }

  const state = match[1];
  const postcode = match[2];

  const parts = title
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  let city = parts[parts.length - 1];

  if (/^Remote Relocation/i.test(city)) {
    if (parts.length >= 2) {
      city = parts[parts.length - 2];
    }
  }

  city = city
    .replace(
      /\s*Remote Relocation.*$/i,
      ""
    )
    .trim();

  if (!city) {
    return null;
  }

  return `${city}, ${state} ${postcode}`;
}


// ============================================
// GET JOB TYPE
// ============================================

function extractJobType(pageText) {
  const jobType = [];

  if (/full[\s-]*time/i.test(pageText)) {
    jobType.push("Full-Time");
  }

  if (/part[\s-]*time/i.test(pageText)) {
    jobType.push("Part-Time");
  }

  if (/casual/i.test(pageText)) {
    jobType.push("Casual");
  }

  return jobType;
}


// ============================================
// GET JOB ID
// ============================================

function extractJobId(pageText) {
  const match = pageText.match(
    /Job ID:\s*(\d+)/i
  );

  if (!match) {
    return null;
  }

  return match[1];
}


// ============================================
// PARSE JOB
// ============================================

function parseJobPage(
  html,
  jobUrl,
  listingTitle
) {
  const $ = cheerio.load(html);

  let title = $("h1")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();

  if (!title) {
    title = listingTitle;
  }

  const pageText = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const jobType =
    extractJobType(pageText);

  const jobId =
    extractJobId(pageText);

  const location =
    extractLocation(
      jobUrl,
      title
    );

  return {
    title,
    company: "Coles Group",
    location,
    jobType,
    salary: null,
    postedDate: null,
    jobId,
    jobUrl,
    source: "Coles Careers",
    scrapedAt: new Date().toISOString(),
  };
}


// ============================================
// MAIN SCRAPER
// ============================================

async function scrapeColes() {
  console.log("================================");
  console.log("Coles Scraper");
  console.log("================================");

  console.log(
    `Maximum pages: ${MAX_PAGES}`
  );

  const allJobLinks = [];


  // ------------------------------------------
  // LISTING PAGES
  // ------------------------------------------

  for (
    let page = 1;
    page <= MAX_PAGES;
    page++
  ) {
    let pageUrl = START_URL;

    if (page > 1) {
      pageUrl =
        `${START_URL}?q=&sortColumn=referencedate&sortDirection=desc&page=${page}`;
    }

    console.log(
      `Fetching listing page ${page}/${MAX_PAGES}...`
    );

    try {
      const html =
        await fetchPage(pageUrl);

      const jobs =
        parseJobLinks(html);

      console.log(
        `  Found ${jobs.length} job links`
      );

      allJobLinks.push(...jobs);

    } catch (error) {
      console.error(
        `  Failed to fetch page ${page}: ${error.message}`
      );
    }

    await sleep(
      REQUEST_DELAY_MS
    );
  }


  // ------------------------------------------
  // REMOVE DUPLICATES
  // ------------------------------------------

  const uniqueJobLinks =
    Array.from(
      new Map(
        allJobLinks.map((job) => [
          job.jobUrl,
          job,
        ])
      ).values()
    );

  console.log("");
  console.log("================================");
  console.log("LINK COLLECTION COMPLETE");
  console.log("================================");

  console.log(
    `Total links found: ${allJobLinks.length}`
  );

  console.log(
    `Unique job links: ${uniqueJobLinks.length}`
  );


  // ------------------------------------------
  // SCRAPE JOB PAGES
  // ------------------------------------------

  const jobs = [];

  console.log("");
  console.log("================================");
  console.log("SCRAPING INDIVIDUAL JOBS");
  console.log("================================");

  for (
    let i = 0;
    i < uniqueJobLinks.length;
    i++
  ) {
    const jobLink =
      uniqueJobLinks[i];

    console.log(
      `[${i + 1}/${uniqueJobLinks.length}] ${jobLink.title}`
    );

    try {
      const html =
        await fetchPage(
          jobLink.jobUrl
        );

      const job =
        parseJobPage(
          html,
          jobLink.jobUrl,
          jobLink.title
        );

      jobs.push(job);

    } catch (error) {
      console.error(
        `  Failed: ${error.message}`
      );
    }

    await sleep(
      REQUEST_DELAY_MS
    );
  }


  // ------------------------------------------
  // SUMMARY
  // ------------------------------------------

  console.log("");
  console.log("================================");
  console.log("SCRAPER COMPLETE");
  console.log("================================");

  console.log(
    `Listing pages scraped: ${MAX_PAGES}`
  );

  console.log(
    `Unique jobs discovered: ${uniqueJobLinks.length}`
  );

  console.log(
    `Jobs successfully scraped: ${jobs.length}`
  );

  console.log("");
const fs = require("fs");
const path = require("path");

const dataDirectory = path.join(
  __dirname,
  "../data"
);

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, {
    recursive: true,
  });
}

const outputPath = path.join(
  dataDirectory,
  "colesJobs.json"
);

fs.writeFileSync(
  outputPath,
  JSON.stringify(jobs, null, 2),
  "utf-8"
);

console.log("");
console.log(
  `Saved ${jobs.length} jobs to ${outputPath}`
);

console.log("");
console.log("Sample results:");

console.log(
  JSON.stringify(
    jobs.slice(0, 3),
    null,
    2
  )
);

return jobs;
}


// ============================================
// RUN
// ============================================

scrapeColes()
  .catch((error) => {
    console.error("");
    console.error(
      "SCRAPER FAILED:"
    );
    console.error(
      error.message
    );
  });