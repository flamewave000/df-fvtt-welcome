const fs = require('fs');
const express = require('express');
const router = express.Router();
eval('var config=' + fs.readFileSync('config.jsonc', 'utf8'));

/* GET home page. */
router.get('/', function (req, res, next) {
	res.render('index', {
		title: config.server_title,
		fvtt_host: config.fvtt_host,
		fvtt_port: config.fvtt_port
	});
});

module.exports = router;
