const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

const API_KEY = process.env.API_KEY;

/**
 * CONFIG
 */
const app = express();
app.use(express.json());
app.use(cors());

const URL = `http://www.omdbapi.com/?apikey=${API_KEY}`;

app.post("/getRatings", async (req, res) => {
  const { titleId } = req.body;

  try {
    if (titleId) {
      const response = await axios.post(URL + `&i=${titleId}`);
      const log = JSON.stringify({
        date: new Date().toLocaleString(),
        titleId,
        title: response.data.Title,
      });
      fs.appendFile("requests.log", `\n` + log, function (err) {
        if (err) {
          console.log(err);
        }
      });

      res.send(response.data);
    } else {
      res.status(404);
      res.send({ message: "titleId is required" });
    }
  } catch (error) {
    res.status(404);
    res.send(error.message || { message: "womp womp wooooommmp" });
  }
});

app.listen(3000, () => {
  console.log("server started");
});
