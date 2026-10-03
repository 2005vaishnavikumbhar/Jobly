# Jobly

### Student Job Discovery

Jobly is a student-focused job discovery tool that collects real job
opportunities directly from employer career websites and presents them in
one searchable interface.

The project was built as a technical assignment to demonstrate web
scraping, data normalization, backend API development, and a React-based
job discovery experience.

## Features

- Search jobs by title, skills, employer, or keyword
- Filter by location
- Filter by employer
- Filter by source
- Student Friendly filter for explicitly listed casual or part-time roles
- Save jobs locally for later
- View saved jobs
- Sort jobs by newest or title
- Open the original employer job listing directly
- Responsive job discovery interface

## Job Sources

Jobly currently collects listings directly from:

- McDonald's Australia Careers
- Coles Careers
- Boeing Careers

The application does not depend on a third-party job API.

## Current Dataset

The current scraped dataset contains **95 job listings**.

| Source | Jobs |
|---|---:|
| McDonald's Careers | 50 |
| Coles Careers | 25 |
| Boeing Careers | 20 |
| **Total** | **95** |

## Student Friendly

Jobly includes a **Student Friendly** filter.

A job is marked Student Friendly when its scraped job type explicitly
contains:

- Casual
- Part-Time

This feature is intended to help students quickly find flexible
employment opportunities.

**Important:** Student Friendly does not guarantee that a particular job
is available to international students or that the position satisfies
visa, work-right, or other eligibility requirements. Students should check
the original employer listing before applying.

## Data Collected

Where available, Jobly normalizes employer listing information into a
common structure including:

- Job title
- Employer
- Location
- Job type
- Salary/pay information
- Posted date
- Original job URL
- Source
- Job reference or ID
- Scrape timestamp
- Description where available

Some employer websites do not expose salary or posted-date information
consistently. In those cases, the corresponding field may be unavailable.

## Architecture

```text
Employer Career Sites
        ↓
   Custom Scrapers
        ↓
 Normalized Job Data
        ↓
    JSON Dataset
        ↓
 Node.js + Express API
        ↓
 React + Vite Frontend
        ↓
      Jobly UI
