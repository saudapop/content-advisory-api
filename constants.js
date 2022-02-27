const SELECTORS = {
  TITLES_SECTION: '[name="tt"]',
  FOUND_RESULT_ROW: '.findResult',
};

const LOG_FILE = 'requests.log';
const API_KEY = process.env.OMDB_API_KEY;

const OMDB_URL = `http://www.omdbapi.com/?apikey=${API_KEY}`;

const searchURL = (titleName) =>
  `https://www.imdb.com/find?q=${encodeURIComponent(
    titleName
  )}&s=tt&ref_=fn_al_tt_mr`;
const contentAdvisoryURL = (titleID) =>
  `https://www.imdb.com/title/${titleID}/parentalguide?ref_=tt_stry_pg`;

module.exports = {
  SELECTORS,
  LOG_FILE,
  OMDB_URL,
  searchURL,
  contentAdvisoryURL,
};
