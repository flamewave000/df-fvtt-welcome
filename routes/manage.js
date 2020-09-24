const fs = require('fs');
const http = require('http');
const querystring = require('querystring');
const express = require('express');
const router = express.Router();

eval('var config=' + fs.readFileSync('config.jsonc', 'utf8'));
let WORLD_PATH = config.fvtt_data + '/Data/worlds';

function getDirectories(path) {
	return fs.readdirSync(path, { withFileTypes: true })
		.filter(dirent => dirent.isDirectory())
		.map(dirent => dirent.name)
}
function getWorlds() {
	let worlds = {};
	for (var world of getDirectories(WORLD_PATH).sort()) {
		worlds[world] = JSON.parse(fs.readFileSync(`${WORLD_PATH}/${world}/world.json`)).title;
	}
	return worlds;
}
function getUsers(world) {
	let data = fs.readFileSync(`${WORLD_PATH}/${world}/data/users.db`, { encoding: 'utf-8' });
	if (!data || data.length == 0) {
		return null;
	}
	var seen = {}
	var result = data.split('\n').reverse().filter(el => !!el).map(el => JSON.parse(el)).filter(x => seen.hasOwnProperty(x._id) ? false : (seen[x._id] = true));
	return result.sort((a, b) => {
		if (a.role > b.role) return -1
		return a.name.localeCompare(b.name);
	});
}

/* GET users listing. */
router.get('/', (req, res, next) => res.render('manage', { title: 'Manage - The Dragon Flagon' }));
router.get('/worlds', (req, res, next) => res.json(getWorlds()));
router.get('/users', function (req, res, next) {
	if (!req.query.w) {
		res.status(400)
		res.send('must specify world');
		return;
	}
	const world = req.query.w;
	if (!(world in getWorlds())) {
		res.status(400)
		res.send('world does not exist');
		return;
	}

	let users = getUsers(world);
	if (!users) {
		res.status(500);
		res.send(`no users are defined for the world "${world}"`);
	}

	let userMap = {}
	users.filter(el => el.role < 3).forEach(el => userMap[el._id] = el.name);

	res.json(userMap);
});
router.post('/update/pass', async function (req, res, _) {
	let [users, errors] = validateBaseRequest(req);
	if (req.body.newp === undefined || req.body.newp === null) errors.push('must provide `newp`');
	if (errors.length > 0) {
		res.status(400).send(errors.join('\n'));
		return;
	}

	let user;
	// validate the user password
	try { user = await validateUser(req, users) }
	catch (error) { res.status(error.status).json(error.message); return }

	// Try authenticating with the server (if the world is running)
	let cookie;
	try { cookie = await authenticate(users) } catch (error) { }

	// update user password
	user.password = req.body.newp;

	try {
		// if the world is loaded, we should have a session cookie
		if (cookie) await updateUsersServer(users, cookie)
		// otherwise the world is not running
		else await updateUsersDatabase(req, users);
		res.json('success');
	}
	catch (error) { res.status(error.status).json(error.message) }
});
router.post('/update/name', async function (req, res, _) {
	let [users, errors] = validateBaseRequest(req);
	if (!req.body.name) errors.push('must provide `name`');
	if (errors.length > 0) {
		res.status(400).send(errors.join('\n'));
		return;
	}
	if (users.find(x => x.name === req.body.name)) {
		res.status(409).send('user name already exists');
		return;
	}

	let user;
	// validate the user password
	try { user = await validateUser(req, users) }
	catch (error) { res.status(error.status).json(error.message); return }

	// return 304 if the name is not being changed
	if (user.name === req.body.name) {
		res.status(304).json('success');
		return;
	}

	// Try authenticating with the server (if the world is running)
	let cookie;
	try { cookie = await authenticate(users) } catch (error) { }

	// update user name
	user.name = req.body.name;

	try {
		// if the world is loaded, we should have a session cookie
		if (cookie) await updateUsersServer(users, cookie)
		// otherwise the world is not running
		else await updateUsersDatabase(req, users);
		res.json('success');
	}
	catch (error) { res.status(error.status).json(error.message) }
});

// #region Request, Authenticate, and Validate User
async function request(options, data, success, fail) {
	options.host = config.fvtt_host.replace(/^https?:\/\//,'');
	options.port = config.fvtt_port;
	options.method = 'POST';
	options.timeout = 3000;
	if (!options.headers) options.headers = {};
	options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
	options.headers['Content-Length'] = Buffer.byteLength(data);
	var authReq = http.request(options, success);
	authReq.on('timeout', authReq.abort);
	authReq.on('error', error => { fail(error); });
	authReq.write(data);
	authReq.end();
}
async function authenticate(users) {
	// Find a Gamemaster account and authenticate using its credentials
	let gmUser = users.find((value, _index, _obj) => value.role == 4);
	return !!gmUser
		? new Promise((resolve, reject) => {
			request({ path: '/join' },
				querystring.stringify({ userid: gmUser._id, password: gmUser.password }),
				authRes => {
					authRes.setEncoding('utf8');
					authRes.on('data', chunk => {
						try {
							let response = JSON.parse(chunk);
							// if the user is for a different world, reject
							if (response.status !== 'success') reject();
							// otherwise, we have succeeded
							else resolve(Object.fromEntries(authRes.headers['set-cookie'][0].split('; ').map(x => x.split('='))));
						}
						// If the server is running, but no world has been loaded
						catch (error) {
							reject(error)
						}
					});
				}, error => {
					reject(error);
				});
		})
		: Promise.reject({ status: 500, error: 'No gamemaster account found.' });
}
async function validateUser(req, users) {
	let user = users.find((value, _index, _obj) => value._id === req.body.user);
	if (!user) // User ID not found in users list
		return Promise.reject({ status: 404, message: 'invalid user id' });
	if (user.password !== req.body.curp) // Password provided does not match the user's current password
		return Promise.reject({ status: 403, message: 'invalid password' });
	return Promise.resolve(user);
}
function validateBaseRequest(req) {
	let errors = []
	// Validate a proper world parameter has been given
	if (!req.body.world) errors.push('must provide `world`');
	if (!(req.body.world in getWorlds())) errors.push('invalid `world`');
	// Validate the world has users
	let users = getUsers(req.body.world);
	if (!users) errors.push('`world` has no users');
	// Validate a user id has been given
	if (!req.body.user) errors.push('must provide `user`');
	if (req.body.curp === undefined || req.body.curp === null) errors.push('must provide `curp`');
	// return the users and/or the errors
	return [users, errors];
}
// #endregion

async function updateUsersDatabase(req, users) {
	return new Promise((resolve, _) => {
		// Write the new user list to the world's users.db file
		fs.writeFile(`${WORLD_PATH}/${req.body.world}/data/users.db`, users.map(x => JSON.stringify(x)).join('\n'), { encoding: 'utf8' }, resolve);
	});
}
async function updateUsersServer(users, cookie) {
	var data = {};
	for (var x of users) {
		data[`users.${x._id}.name`] = x.name;
		data[`users.${x._id}.role`] = x.role;
		data[`users.${x._id}.password`] = x.password;
	}
	data = querystring.stringify(data);
	var options = {
		path: '/players',
		headers: {
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
			'Cookie': 'session=' + cookie.session
		}
	};
	return new Promise((resolve, reject) => request(options, data, resolve, reject));
}

module.exports = router;
