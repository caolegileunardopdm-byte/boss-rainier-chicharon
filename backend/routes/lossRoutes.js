const express = require("express");
const router = express.Router();
const { getLosses } = require("../controllers/lossController");

router.get("/", getLosses);

module.exports = router;
