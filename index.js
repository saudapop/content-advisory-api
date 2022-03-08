const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const { LOG_FILE, OMDB_URL, contentAdvisoryURL } = require('./constants');

const { getContentAdvisory, getTitlesFromIMDB } = require('./helper-functions');

const noop = () => {};

/**
 * CONFIG
 */
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3000;
const IS_DEV = process.env.IS_DEV;

// API URL : https://content-advisory-api.xsaudahmed.repl.co

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
  try {
    const { titleId } = req.body;

    const contentAdvisory = await getContentAdvisory(titleId);

    if (contentAdvisory.parentalGuide.every((guide) => !guide.entries.length)) {
      contentAdvisory.selectedTitleURL = contentAdvisoryURL(titleId);
    }
    res.send(contentAdvisory);
  } catch (error) {
    res.status(404);
    res.send(error.message);
  }
});

app.post('/getRatings', async (req, res) => {
  const { titleId } = req.body;

  try {
    if (titleId) {
      const response = await axios.post(`${OMDB_URL}&i=${titleId}`);

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

app.listen(PORT, () => {
  if (IS_DEV) {
    console.log(`server started on http://localhost:${PORT}`);
  }
});
