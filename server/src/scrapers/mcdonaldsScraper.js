const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://careers.mcdonalds.com.au";
const START_URL = `${BASE_URL}/restaurant-jobs/page/1`;

// Development limit.
// Change this later when we are ready for a larger scrape.
const MAX_PAGES = 5;

// Small delay between requests so we do not hammer the website.
const REQUEST_DELAY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url) {
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "GradGuideJobDiscovery/1.0",
    },
    timeout: 20000,
  });

  return response.data;
}

function parseJobLinks(html) {
  const $ = cheerio.load(html);

  const jobs = [];

  $("h3.results-list__item-title a").each((index, element) => {
    const title = $(element)
      .text()
      .replace(/\s+/g, " ")
      .trim();

    const relativeUrl = $(element).attr("href");

    if (!relativeUrl) {
      return;
    }

    const jobUrl = new globalThis.URL(
      relativeUrl,
      BASE_URL
    ).href;

    jobs.push({
      title,
      jobUrl,
    });
  });

  return jobs;
}

function parseJobPage(html, jobUrl) {
  const $ = cheerio.load(html);

  const title = $("h1")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const pageText = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  // -----------------------------
  // Posted date
  // -----------------------------

  let postedDate = null;

  const dateMatch = pageText.match(
    /Date Posted\s+(\d{2}\/\d{2}\/\d{4})/
  );

  if (dateMatch) {
    postedDate = dateMatch[1];
  }

  // -----------------------------
  // Job type
  // -----------------------------

  const jobType = [];

  if (/Casual/i.test(pageText)) {
    jobType.push("Casual");
  }

  if (/Part-Time/i.test(pageText)) {
    jobType.push("Part-Time");
  }

  if (/Full-Time/i.test(pageText)) {
    jobType.push("Full-Time");
  }

  // -----------------------------
  // Location
  // -----------------------------

  let location = null;

  const locationMatch = pageText.match(
    /Location\(s\)\s+(.+?)\s+Job ID/
  );

  if (locationMatch) {
    location = locationMatch[1].trim();
  }

  // -----------------------------
  // Return normalized job
  // -----------------------------

  return {
    title,
    company: "McDonald's Australia",
    location,
    jobType,
    salary: null,
    postedDate,
    jobUrl,
    source: "McDonald's Careers",
    scrapedAt: new Date().toISOString(),
  };
}

async function scrapeMcDonalds() {
  try {
    console.log("================================");
    console.log("McDonald's Scraper");
    console.log("================================");
    console.log(`Maximum pages: ${MAX_PAGES}`);
    console.log("");

    // --------------------------------
    // STEP 1: Collect job links
    // --------------------------------

    const allJobLinks = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const pageUrl =
        `${BASE_URL}/restaurant-jobs/page/${page}`;

      console.log(
        `Fetching listing page ${page}/${MAX_PAGES}...`
      );

      try {
        const html = await fetchPage(pageUrl);

        const jobs = parseJobLinks(html);

        console.log(
          `  Found ${jobs.length} jobs`
        );

        allJobLinks.push(...jobs);

        await sleep(REQUEST_DELAY_MS);
      } catch (error) {
        console.error(
          `  Failed to fetch page ${page}: ${error.message}`
        );
      }
    }

    // --------------------------------
    // STEP 2: Remove duplicate URLs
    // --------------------------------

    const uniqueJobLinks = Array.from(
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

    // --------------------------------
    // STEP 3: Visit individual jobs
    // --------------------------------

    const jobs = [];

    console.log("");
    console.log("================================");
    console.log("SCRAPING INDIVIDUAL JOBS");
    console.log("================================");

    for (let i = 0; i < uniqueJobLinks.length; i++) {
      const jobLink = uniqueJobLinks[i];

      console.log(
        `[${i + 1}/${uniqueJobLinks.length}] ${jobLink.title}`
      );

      try {
        const html = await fetchPage(
          jobLink.jobUrl
        );

        const job = parseJobPage(
          html,
          jobLink.jobUrl
        );

        jobs.push(job);

        await sleep(REQUEST_DELAY_MS);
      } catch (error) {
        console.error(
          `  Failed: ${error.message}`
        );
      }
    }

    // --------------------------------
    // STEP 4: Summary
    // --------------------------------

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

    // Show only first 3 jobs for verification
   // Save scraped jobs to JSON
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
  "mcdonaldsJobs.json"
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

  } catch (error) {
    console.error("");
    console.error("================================");
    console.error("SCRAPER FAILED");
    console.error("================================");

    if (error.response) {
      console.error(
        `Status: ${error.response.status}`
      );

      console.error(
        `Message: ${error.message}`
      );
    } else {
      console.error(error.message);
    }

    return [];
  }
}

scrapeMcDonalds();