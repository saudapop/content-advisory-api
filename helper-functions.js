const cheerio = require('cheerio');
const axios = require('axios');

const { SELECTORS, searchURL, contentAdvisoryURL } = require('./constants');

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
    }
    return [];
  } catch (error) {
    console.log(error);
  }
}

module.exports = { getContentAdvisory, getTitlesFromIMDB };
