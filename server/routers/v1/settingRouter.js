const express = require('express');
const cors = require('cors');
const HttpStatus = require('http-status-codes');
const { Setting } = require('../../models');
let router = express.Router();

const { OK, BAD_REQUEST } = HttpStatus
router.get('/setting', cors(), (req, res) => {
  Setting.find()
    .then((settings) => {
      res.status(OK).send(settings);
    })
    .catch((err) => {
      res.status(BAD_REQUEST).send(err);
    })
})

module.exports = router;