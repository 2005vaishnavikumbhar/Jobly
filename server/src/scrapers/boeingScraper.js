const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://boeing.springboard.com.au";
const LISTING_URL = `${BASE_URL}/jobs/Any`;

const OUTPUT_FILE = path.join(
  __dirname,
  "..",
  "data",
  "boeingJobs.json"
);

const REQUEST_DELAY_MS = 500;

const headers = {
  "User-Agent": "GradGuideJobDiscovery/1.0",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function normaliseJobType(employmentType) {
  if (!employmentType) {
    return [];
  }

  const types = Array.isArray(employmentType)
    ? employmentType
    : [employmentType];

  return types.map((type) => {
    const value = String(type).toUpperCase();

    if (value === "FULL_TIME") {
      return "Full-Time";
    }

    if (value === "PART_TIME") {
      return "Part-Time";
    }

    if (value === "CONTRACTOR") {
      return "Contract";
    }

    if (value === "TEMPORARY") {
      return "Temporary";
    }

    if (value === "OTHER") {
      return "Other";
    }

    if (value === "CASUAL") {
      return "Casual";
    }

    return cleanText(type);
  });
}

function extractJobPostingJson($) {
  let jobPosting = null;

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).html();

    if (!raw) {
      return;
    }

    try {
      const data = JSON.parse(raw);

      if (Array.isArray(data)) {
        const match = data.find(
          (item) =>
            item &&
            (item["@type"] === "JobPosting" ||
              (Array.isArray(item["@type"]) &&
                item["@type"].includes("JobPosting")))
        );

        if (match) {
          jobPosting = match;
        }
      } else if (
        data &&
        (data["@type"] === "JobPosting" ||
          (Array.isArray(data["@type"]) &&
            data["@type"].includes("JobPosting")))
      ) {
        jobPosting = data;
      }
    } catch {
      // Ignore invalid JSON-LD blocks.
    }
  });

  return jobPosting;
}

function extractLocationFromPage($) {
  const bodyText = cleanText($("body").text());

  const match = bodyText.match(
    /Location:\s*([A-Za-z][A-Za-z\s-]+?)(?=\s+Category:)/i
  );

  if (match) {
    const location = cleanText(match[1]);

    if (
      location &&
      !location.toLowerCase().includes("anypermanent") &&
      location.length < 100
    ) {
      return location;
    }
  }

  return null;
}

function extractJobLinks($) {
  const links = [];

  $("a").each((_, element) => {
    const href = $(element).attr("href");
    const title = cleanText($(element).text());

    if (!href) {
      return;
    }

    let absoluteUrl;

    try {
      absoluteUrl = new URL(href, BASE_URL).href;
    } catch {
      return;
    }

    if (
      absoluteUrl.includes("/jobs/BOE-") &&
      !links.some((job) => job.url === absoluteUrl)
    ) {
      links.push({
        title: title || "Boeing Job",
        url: absoluteUrl,
      });
    }
  });

  return links;
}

async function fetchPage(url) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Request attempt ${attempt}/3: ${url}`);

      const response = await axios.get(url, {
        headers: {
          ...headers,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Connection: "keep-alive",
        },
        timeout: 60000,
        maxRedirects: 5,
      });

      return response.data;
    } catch (error) {
      lastError = error;

      console.log(
        `Request attempt ${attempt} failed: ${error.message}`
      );

      if (attempt < 3) {
        await sleep(2000);
      }
    }
  }

  throw lastError;
}
async function scrapeJob(job) {
  try {
    const html = await fetchPage(job.url);
    const $ = cheerio.load(html);

    const jobPosting = extractJobPostingJson($);

    if (!jobPosting) {
      console.log(`No JobPosting JSON found: ${job.url}`);
      return null;
    }

    const identifier = jobPosting.identifier;

    let jobReference = null;

    if (identifier && typeof identifier === "object") {
      jobReference = identifier.value || null;
    } else if (identifier) {
      jobReference = String(identifier);
    }

    const title =
      cleanText(jobPosting.title) ||
      cleanText($("h1").first().text()) ||
      job.title;

    const location =
      extractLocationFromPage($) ||
      jobPosting.jobLocation?.address?.addressLocality ||
      null;

    const description = cleanText(jobPosting.description);

    return {
      id: jobReference || job.url,
      title,
      company:
        jobPosting.hiringOrganization?.name ||
        "Boeing Australia",
      location,
      jobType: normaliseJobType(
        jobPosting.employmentType
      ),
      salary: null,
      postedDate: jobPosting.datePosted || null,
      description,
      jobReference,
      jobUrl: job.url,
      source: "Boeing Careers",
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.log(
      `Failed to scrape ${job.url}: ${error.message}`
    );

    return null;
  }
}

async function scrapeBoeing() {
  console.log("Starting Boeing scraper...");
  console.log(`Listing URL: ${LISTING_URL}`);

  try {
    const listingHtml = await fetchPage(LISTING_URL);
    const $ = cheerio.load(listingHtml);

    const jobLinks = extractJobLinks($);

    console.log(`Found ${jobLinks.length} Boeing job links.`);

    const jobs = [];

    for (let i = 0; i < jobLinks.length; i++) {
      const job = jobLinks[i];

      console.log(
        `Scraping ${i + 1}/${jobLinks.length}: ${job.title}`
      );

      const scrapedJob = await scrapeJob(job);

      if (scrapedJob) {
        jobs.push(scrapedJob);
      }

      await sleep(REQUEST_DELAY_MS);
    }

    const uniqueJobs = Array.from(
      new Map(
        jobs.map((job) => [job.jobUrl, job])
      ).values()
    );

    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(uniqueJobs, null, 2),
      "utf8"
    );

    console.log("");
    console.log("Boeing scraper finished.");
    console.log(`Jobs scraped: ${uniqueJobs.length}`);
    console.log(`Saved to: ${OUTPUT_FILE}`);

    if (uniqueJobs.length > 0) {
      console.log("");
      console.log("Sample job:");
      console.log(JSON.stringify(uniqueJobs[0], null, 2));
    }
  } catch (error) {
    console.error("Boeing scraper failed:");
    console.error(error.message);
  }
}

scrapeBoeing();