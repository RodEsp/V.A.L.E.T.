import bodyParser from 'body-parser';
import Cap from 'cap';
import express from 'express';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fetch from 'node-fetch';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get the personal access token from a local file in './../pat'
// This PAT will be used so V.A.L.E.T. can interact with the RC API by itself, not on behalf of a specific user.
const pat = fs.readFileSync(path.join(__dirname, '..', 'pat')).toString();

// Create express server
const app = express();
const port = 8080;
app.use(express.static(path.join(__dirname)));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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

// Return index.html
app.get('/', (req, res) => {
	// Reset the rc_user everytime index is reloaded.
	rc_user = '';
	res.sendFile(path.join(__dirname, 'index.html'));
});

// This endpoint acts as a CORS proxy for the Recurse Center API
app.post('/login', async (req, res) => {
	const email = Buffer.from(req.body.email, 'base64').toString('utf-8');
	const password = Buffer.from(req.body.password, 'base64').toString('utf-8');
	console.log('/login', email, password);

	try {
		let response = await fetch(`https://www.recurse.com/api/v1/profiles?query=${email}`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${pat}`
			}
		});
		response = await response.json();
		if (!Array.isArray(response) || response.length === 0) {
			throw new Error('Could not find a user with that e-mail address.');
		}

		// We should only ever get a single user from a search for an e-mail address, so we can take the first result.
		rc_user = response[0];

		let user = db.data.users[rc_user.id];
		if (!user) {
			// If the user does not exist create a new user and get a PAT for them.
			try {
				response = await fetch('https://www.recurse.com/api/v1/tokens', {
					method: 'POST',
					headers: {
						'Authorization': `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`,
						'Content-Type': 'application/x-www-form-urlencoded',
						'Accept': '*/*'
					},
					body: 'description=V.A.L.E.T'
				});

				const data = await response.json();
				user = {
					email,
					id: rc_user.id,
					PAT: data.token, // TODO: Encrypt PAT
					macAddresses: []
				};
				db.data.users[rc_user.id] = user;
				db.write();
			} catch (error) {
				throw new Error(error.message);
			}
		}

		res.status(200).send(user.macAddresses);
	} catch (error) {
		console.error(error);
		res.status(500).send('Error logging in: ' + error.message);
	}
});

// Save MAC Address when a user submits it
app.post('/macaddress', async (req, res) => {
	// Log the request's body for debugging purposes
	console.log(req.body);

	const macAddress = req.body['mac-address'];

	// Validate the MAC address
	const macAddressRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
	if (!macAddressRegex.test(macAddress)) {
		res.status(400).send('Invalid MAC address!');
		return;
	}

	// Save the MAC address to the database
	db.data.macAddresses[macAddress] = rc_user.id;
	db.data.users[rc_user.id].macAddresses.push(macAddress);
	await db.write(); // This writes it to db.json

	res.status(200).send(macAddress);
});

app.delete('/macaddress', async (req, res) => {
	// Log the request's body for debugging purposes
	console.log(req.body);

	const macAddress = req.body.macAddress;

	try {
		// Remove the MAC Address from the user's MAC Addresses
		const user = db.data.users[rc_user.id];
		const macAddressIndex = user.macAddresses.indexOf(macAddress);
		user.macAddresses.splice(macAddressIndex, 1);

		// Remove the MAC Address from the registered MAC Addresses
		delete db.data.macAddresses[macAddress];
		await db.write();

		res.status(200).send(`Successfully deleted ${macAddress}`);
	} catch (error) {
		console.log(`Error deleting MAC Address: ${error.message}`);
		res.status(500).send('Error deleting MAC Address.');
	}
});

// Start server
app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});

// ------------- Monitor for MAC Addresses sending ARP packets on local network -------------
const PROTOCOL = Cap.decoders.PROTOCOL;

// List all network devices on machine
// console.log(JSON.stringify(Cap.deviceList(), null, 2));

const cap = new Cap.Cap();
// The device needs to be changes to the appropriate network device for the machine this is being run on, you can also use the IP address assigned to the machine with Cap.findDevice();
const device = "en0"; // Cap.findDevice('10.100.2.85');

console.log(`Device = ${device}`);

const pcap_filter = 'arp'; // We are only interested in ARP packets - https://en.wikipedia.org/wiki/Address_Resolution_Protocol
const bufSize = 10 * 1024 * 1024;
const buffer = Buffer.alloc(65535);

const linkType = cap.open(device, pcap_filter, bufSize, buffer);

cap.setMinBytes && cap.setMinBytes(0);

const hexToIP = (hexString) => {
	let bytes = hexString.match(/.{2}/g);

	return bytes.reduce((acc, hexByte) => `${acc}.${parseInt(hexByte, 16)}`, '').substring(1);
};

const createVisit = (macAddress) => {

};

// Log packet info for debugging purposes
function logPacketInfo (packet) {
	console.log(`New packet:
  ${nbytes} bytes, truncated? ${trunc}`);
	console.log(`  Sender MAC Address: ${packet.info.sendermac}${packet.info.sendermac === 'c8:2a:dd:b0:7d:9d' ? ' - MY PHONE!!!' : ''}`);
	console.log(`  Sender IP Address: ${packet.info.senderip}
  Target IP Address: ${packet.info.targetip}
  IPv4 Protocol: ${PROTOCOL.ETHERNET[packet.info.protocol]}`);
};

function get_rc_api_date () {
	function pad (n) { return n < 10 ? '0' + n : n; }
	const date = new Date();
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

cap.on('packet', async (nbytes, trunc) => {
	if (linkType === 'ETHERNET') {
		let packet = Cap.decoders.Ethernet(buffer);
		packet = Cap.decoders.ARP(buffer, packet.offset);
		// logPacketInfo(packet);

		const macAddress = packet.info.sendermac;
		const user_id = db.data.macAddresses[macAddress];
		if (user_id !== undefined) {
			const user = db.data.users[user_id];
			const date = get_rc_api_date();

			console.log(`
			FOUND ${macAddress}
			It belongs to ${user.email}
			Creating a visit on ${date} for them!`);

			try {
				// TODO: Only create one visit per day per user.
				const response = await fetch(`https://www.recurse.com/api/v1/hub_visits/${user_id}/${date}`, {
					method: 'PATCH',
					headers: {
						'User-Agent': 'V.A.L.E.T.',
						'Authorization': `Bearer ${user.PAT}`,
						'Content-Type': 'application/x-www-form-urlencoded',
						'Accept': '*/*'
					}
				});

				console.log(await response.json());
			} catch (error) {
				console.error(error);
			}
		}
	}
});
