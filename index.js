const express = require('express');
var cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const dotenv = require('dotenv');
const fs = require('fs');

const noop = () => {};

/**
 * CONFIG
 */
const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();

// API URL : https://imdb-parental-advisory.xsaudahmed.repl.co

/**
 * CONSTANTS
 */
const SELECTORS = {
  TITLES_SECTION: '[name="tt"]',
  FOUND_RESULT_ROW: '.findResult',
};

const LOG_FILE = 'requests.log';
const API_KEY = process.env.OMDB_API_KEY;
const OMDB_URL = `http://www.omdbapi.com/?apikey=${API_KEY}`;

/**
 * URLS
 */
const searchURL = (titleName) =>
  `https://www.imdb.com/find?q=${encodeURIComponent(
    titleName
  )}&s=tt&ref_=fn_al_tt_mr`;
const contentAdvisoryURL = (titleID) =>
  `https://www.imdb.com/title/${titleID}/parentalguide?ref_=tt_stry_pg`;

/**
 * HELPER FUNCTIONS
 */
function getSectionInformation(isSpoilersSection) {
  return function (section) {
    try {
      const result = {};

      const currentSection = cheerio.load(section);

      const sectionName = currentSection('h4').text();

      if (!isSpoilersSection) {
        const [advisory, ...entries] = Array.from(currentSection('ul li'));

        const advisorySection = cheerio.load(advisory);
        const summary = advisorySection(
          '.advisory-severity-vote__container span'
        ).html();
        const voteCount = advisorySection(
          '.advisory-severity-vote__container a'
        )
          .text()
          .trim();

        result.advisory = {
          summary,
          voteCount,
        };
        result.entries = entries.map((entry) => entry.children[0].data.trim());
      } else {
        result.entries = Array.from(currentSection('ul li')).map((entry) =>
          entry.children[0].data.trim()
        );
      }

      result.sectionName = sectionName;

      return result;
    } catch (err) {
      return { entries: [] };
    }
  };
}

async function getContentAdvisory(titleID) {
  const res = await axios.get(contentAdvisoryURL(titleID));
  const wholeDocument = cheerio.load(res.data);

  const parentalGuideSection = wholeDocument('[id^="advisory"]').slice(0, 5);
  const spoilersGuideSection = wholeDocument('#advisory-spoilers section');
  const title = wholeDocument('h3[itemprop="name"]').text();
  console.log(title);
  const parentalGuide = Array.from(parentalGuideSection).map(
    getSectionInformation(false)
  );

  const spoilersGuide = Array.from(spoilersGuideSection).map(
    getSectionInformation(true)
  );

  return {
    title,
    parentalGuide,
    spoilersGuide,
  };
}

async function getTitlesFromIMDB(titleName) {
  try {
    const res = await axios.get(searchURL(titleName));

    const wholeDocument = cheerio.load(res.data);
    const scrapedTitles = wholeDocument(SELECTORS.TITLES_SECTION)
      .parent()
      .parent()
      .html();

    if (scrapedTitles) {
      const titleSection = cheerio.load(scrapedTitles);

      const resultRows = titleSection(SELECTORS.FOUND_RESULT_ROW)
        .toArray()
        .slice(0, 15);

      const responseArray = resultRows.map((row) => {
        const rowChildren = cheerio.load(row.children);

        const id = rowChildren('a')[0].attribs.href.split('/')[2];
        const imageURL = rowChildren('img')[0].attribs.src;
        const title = cheerio.load(row).text();

        return {
          id,
          imageURL,
          title,
        };
      });

      return responseArray;
    } else {
      return [];
    }
  } catch (error) {
    console.log(error);
  }
}

/**
 * ROUTES
 */

app.get('/', (req, res) => {
  res.redirect('https://shabnamrahmed.github.io/imdb-parental-guide/');
});

app.post('/findTitles', async (req, res) => {
  const { titleName } = req.body;

  if (titleName) {
    const titlesInformationArray = await getTitlesFromIMDB(titleName);

    const log = [
      new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
      titleName,
      '\n',
    ].join(' ');

    fs.appendFile(LOG_FILE, log, noop);
    // console.log(titlesInformationArray)
    res.send(titlesInformationArray);
  } else {
    res.status(404);
    res.send({ message: 'titleName is required' });
  }
});

app.post('/parentalGuide', async (req, res) => {
  const { titleId } = req.body;

  const contentAdvisory = await getContentAdvisory(titleId);

  if (contentAdvisory.parentalGuide.every((guide) => !guide.entries.length)) {
    contentAdvisory.selectedTitleURL = contentAdvisoryURL(titleId);
  }
  res.send(contentAdvisory);
});

app.post('/getRatings', async (req, res) => {
  const { titleId } = req.body;

  try {
    if (titleId) {
      const response = await axios.post(OMDB_URL + `&i=${titleId}`);

      res.send(response.data);
    } else {
      res.status(404);
      res.send({ message: 'titleId is required' });
    }
  } catch (error) {
    console.log(error);
    res.status(404);
    res.send(error.message || { message: 'womp womp wooooommmp' });
  }
});

app.listen(3000, () => {
  console.log('server started');
});
