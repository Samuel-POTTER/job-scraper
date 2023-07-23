import { gotScraping } from "got-scraping";
import { JSDOM } from "jsdom";
import { FRONT_DICTIONARY, REMOTE_DICTIONARY } from "./constants";
import { convertArrayToCSV } from "convert-array-to-csv";
import fs from "fs";

type IJob = {
  name: string;
  url: string;
};

const remoteJobToApply: IJob[] = [];

const isFrontEndJob = (jobTitle: string) => {
  return FRONT_DICTIONARY.some((word: string) =>
    jobTitle.toUpperCase().includes(word)
  );
};

const isRemoteJob = (jobSpec: NodeListOf<Element>, companyLocation: string) => {
  return (
    REMOTE_DICTIONARY.some((word: string) =>
      jobSpec.forEach((spec) => {
        spec.textContent?.toUpperCase().includes(word);
      })
    ) ||
    REMOTE_DICTIONARY?.some((word: string) =>
      companyLocation?.toUpperCase().includes(word)
    )
  );
};

const scrapIndeedJob = async (pageIndex: number) => {
  const INDEED_URL = `https://fr.indeed.com/jobs?q=frontend&start=${pageIndex}&l=Remote&from=searchOnHP`;

  try {
    const { body } = await gotScraping.get(INDEED_URL);
    const dom = new JSDOM(body);

    const jobs = dom.window.document.querySelectorAll("div.job_seen_beacon");

    jobs.forEach((job) => {
      const jobTitle = job.querySelector("td.resultContent span")?.textContent;

      const jobSpec = job.querySelectorAll("div.metadata");
      const companyLocation = job.querySelector(
        "div.companyLocation"
      )?.textContent;
      const hrefUrl = job.querySelector("h2.jobTitle a")?.getAttribute("href");
      const isRemote = isRemoteJob(jobSpec, companyLocation!);

      if ((jobTitle && !isFrontEndJob(jobTitle)) || !isRemote) return;

      remoteJobToApply.push({
        name: jobTitle!,
        url: `https://indeed.com${hrefUrl}`,
      });
    });
  } catch (error) {
    console.error("Error scraping Indeed:", error);
  }
};

const main = async () => {
  try {
    const scrapePromises = [];
    for (let i = 0; i < 5; i++) {
      scrapePromises.push(scrapIndeedJob(i * 10));
    }

    await Promise.all(scrapePromises);

    const csvFromArrayOfObjects = convertArrayToCSV(remoteJobToApply, {
      header: ["name", "url"],
      separator: ";",
    });

    fs.writeFile("remoteJobToApply.csv", csvFromArrayOfObjects, (err) => {
      if (err) throw err;
      console.log("The file has been saved!");
    });
  } catch (error) {
    console.error("Error in main:", error);
  }
};

main();
