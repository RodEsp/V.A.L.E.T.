import bodyParser from 'body-parser';
import Cap from 'cap';
import express from 'express';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fetch from 'node-fetch';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// TODO: Use a log file instead of console.log()/console.error() so that we ca debug issues if the server/computer crashes.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get the personal access token from a local file in './../pat'
// This PAT will be used so V.A.L.E.T. can interact with the RC API by itself, not on behalf of a specific user.
const pat = fs.readFileSync(path.join(__dirname, '..', 'pat')).toString().trim();

// Create express server
const app = express();
app.use(express.static(path.join(__dirname)));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Create HTTP server that redirects to HTTPS
const httpServer = http.createServer((req, res) => {
	res.writeHead(301, { 'Location': `https://${req.headers['host'].replace('80', '443')}${req.url}` });
	res.end();
});
// Create HTTPS server with a self-signed certificate
const credentials = {
	key: fs.readFileSync(path.join(__dirname, '..', './key.pem'), 'utf8'),
	cert: fs.readFileSync(path.join(__dirname, '..', './cert.pem'), 'utf8'),
};
const httpsServer = https.createServer(credentials, app);

// Setup and configure lowdb to write data to db.json
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const defaultData = {
	users: {},
	macAddresses: {}
};
const db = new Low(adapter, defaultData);
// Read data from JSON file, this will set db.data content, if JSON file doesn't exist, defaultData is used instead
await db.read();

let rc_user = '';

// Define the API for the express server
app.get('/', (req, res) => {
	// Reset the rc_user everytime index is reloaded.
	rc_user = '';
	res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/login', async (req, res) => {
	const email = Buffer.from(req.body.email, 'base64').toString('utf-8');

	try {
		const response = await fetch(`https://www.recurse.com/api/v1/profiles?query=${email}`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${pat}`
			}
		});
		if (response.ok) {
			const rc_users = await response.json();
			if (Array.isArray(rc_users)) {
				if (rc_users.length !== 0) {
					// We should only ever get a single user from a search for an e-mail address, so we can take the first result.
					rc_user = rc_users[0];

					let user = db.data.users[rc_user.id];
					// If the user does not exist create a new user 
					if (!user) {
						user = {
							email,
							id: rc_user.id,
							PAT: undefined,
							macAddresses: []
						};
						db.data.users[rc_user.id] = user;
						db.write();
					}

					res.status(200).send({ name: rc_user.name, macAddresses: user.macAddresses, hasPAT: user.PAT === undefined ? false : true });
				} else {
					// If the response length was 0 there is no user with that e-mail address at RC.
					throw new Error('Could not find a user with that e-mail address.');
				}
			} else {
				// If the response wasn't an array then something about the RC API changed.
				throw new Error(`Recurse Center API returned unexpected results: ${rc_users}`);
			}
		} else {
			// If the RC API returned something other than a 200 http status code.
			throw new Error(`RC API Error
			Status code: ${response.status}
			Response: ${await response.text()}`);
		}
	} catch (error) {
		console.error(error);
		if (error.message === 'Could not find a user with that e-mail address.') {
			res.status(404).send(error.message);
		} else {
			res.status(500).send(error.message);
		}
	}
});

app.post('/getPAT', async (req, res) => {
	const password = Buffer.from(req.body.password, 'base64').toString('utf-8');

	try {
		let user = db.data.users[rc_user.id];

		const response = await fetch('https://www.recurse.com/api/v1/tokens', {
			method: 'POST',
			headers: {
				'Authorization': `Basic ${Buffer.from(`${user.email}:${password}`).toString('base64')}`,
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': '*/*'
			},
			body: 'description=V.A.L.E.T.'
		});

		if (response.ok) {
			const data = await response.json();
			user.PAT = data.token; // TODO: Encrypt PAT
			db.write();

			res.status(200).send();
		} else {
			throw new Error(`Recurse Center API Error: 
			http status code: ${response.status},
			message: ${await response.text()}`);
		}
	} catch (error) {
		console.error('Failed to generate a PAT.\n' + error);
		res.status(500).send('Failed to generate a PAT.');
	}

});

app.post('/macaddress', async (req, res) => {
	const macAddress = req.body['mac-address'];

	// Validate the MAC address
	const macAddressRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
	if (!macAddressRegex.test(macAddress)) {
		res.status(400).send('Invalid MAC address!');
		return;
	} else if (db.data.users[rc_user.id].macAddresses.includes(macAddress)) {
		res.status(500).send('MAC Address is already registered for this user.');
		return;
	} else if (db.data.macAddresses[macAddress] !== undefined) {
		res.status(500).send('This MAC Address has already been registered for a different user.');
		return;
	}

	// Save the MAC address to the database
	db.data.macAddresses[macAddress] = { user_id: rc_user.id, last_visit_created_on: undefined };
	db.data.users[rc_user.id].macAddresses.push(macAddress);
	await db.write(); // This writes it to db.json

	res.status(200).send(macAddress);
});

app.delete('/macaddress', async (req, res) => {
	const macAddress = req.body.macAddress;

	try {
		// Remove the MAC Address from the user's MAC Addresses
		const user = db.data.users[rc_user.id];
		const macAddressIndex = user.macAddresses.indexOf(macAddress);
		user.macAddresses.splice(macAddressIndex, 1);

		// Remove the MAC Address from the registered MAC Addresses
		delete db.data.macAddresses[macAddress];

		// Persist the changes in the db
		await db.write();

		res.status(200).send(`Successfully deleted ${macAddress}`);
	} catch (error) {
		console.error(`Error deleting MAC Address: ${error.message}`);
		res.status(500).send('Error deleting MAC Address.');
	}
});

//Start servers
httpServer.listen(80, () => {
	console.log('HTTP Server is running on http://localhost:80');
});
httpsServer.listen(443, () => {
	console.log(`HTTPS Server is running on https://localhost:443`);
});

/*
 * The code below this line monitors the WiFi space for ARP packets and extracts the MAC Addresses of the senders of these packets
 * If it sees a MAC Address that has been registered with the server above then it will create a RC Hub Visit for the user it pertains to, but only once per day.
 */
const PROTOCOL = Cap.decoders.PROTOCOL;

// List all network devices on machine
// console.log(JSON.stringify(Cap.deviceList(), null, 2));

const cap = new Cap.Cap();
// The device needs to be changed to the appropriate network device for the machine this is being run on, you can also use the IP address assigned to the machine with Cap.findDevice(IP_ADDRESS);
const device = "wlan0"; // This should be 'wlan0' for a RaspberryPI and will typically will be 'en0' for a MacBook.

const pcap_filter = 'arp'; // We are only interested in ARP packets - https://en.wikipedia.org/wiki/Address_Resolution_Protocol
const bufSize = 10 * 1024 * 1024;
const buffer = Buffer.alloc(65535);

const linkType = cap.open(device, pcap_filter, bufSize, buffer);

cap.setMinBytes && cap.setMinBytes(0);

// Log packet info for debugging purposes
function logPacketInfo (packet) {
	console.log(`New packet:
  ${nbytes} bytes, truncated? ${trunc}`);
	console.log(`  Sender MAC Address: ${packet.info.sendermac}${packet.info.sendermac === 'c8:2a:dd:b0:7d:9d' ? ' - MY PHONE!!!' : ''}`);
	console.log(`  Sender IP Address: ${packet.info.senderip}
  Target IP Address: ${packet.info.targetip}
  IPv4 Protocol: ${PROTOCOL.ETHERNET[packet.info.protocol]}`);
};

async function createVisit (macAddress) {
	const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

	const registeredMacAddress = db.data.macAddresses[macAddress];
	if (registeredMacAddress !== undefined) {
		const user_id = registeredMacAddress.user_id;
		const user = db.data.users[user_id];

		// If a visit has already been created for a given MAC Address today then don't create another one.
		// This is to avoid spamming the RC API with requests to create visits since we will likely see the same MAC Address many many times per day
		//  Often we will see them many many times per minute because of the nature of ARP requests.
		if (user.last_visit_created_on !== today) {
			if (user.PAT !== undefined) {
				console.log(`
				Saw ${macAddress}
				It belongs to ${user.email}
				Creating a visit on ${today} for them!`);

				try {
					const response = await fetch(`https://www.recurse.com/api/v1/hub_visits/${user_id}/${today}`, {
						method: 'PATCH',
						headers: {
							'User-Agent': 'V.A.L.E.T.',
							'Authorization': `Bearer ${user.PAT}`,
							'Content-Type': 'application/x-www-form-urlencoded',
							'Accept': '*/*'
						}
					});

					user.last_visit_created_on = today;
					db.write();
				} catch (error) {
					console.error(error);
				}
			} else {
				console.log(`
				Saw ${macAddress}
				Tried to create a visit for ${user.email} on ${today}
				But we do not have a PAT for them.`);
			}
		}/* else {
			console.log(`
			Visit for ${macAddress} has already been created today. Skipping.
			It belongs to ${user.email}`);
		}*/
	}
}

function throttle (cb, delay = 1000) {
	let shouldWait = false;

	return (...args) => {
		if (shouldWait) return;

		cb(...args);
		shouldWait = true;
		setTimeout(() => {
			shouldWait = false;
		}, delay);
	};
};
const throttledCreateVisit = throttle(createVisit);

cap.on('packet', async (nbytes, trunc) => {
	if (linkType === 'ETHERNET') {
		let packet = Cap.decoders.Ethernet(buffer);
		packet = Cap.decoders.ARP(buffer, packet.offset);
		// logPacketInfo(packet);

		const macAddress = packet.info.sendermac;
		throttledCreateVisit(macAddress);
	}
});
