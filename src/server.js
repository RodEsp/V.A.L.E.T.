import bodyParser from 'body-parser';
import Cap from 'cap';
import express from 'express';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fetch from 'node-fetch';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// TODO: Use a log file instead of console.log() for errors and visit creation messages so that we ca debug issues if the server/computer crashes.

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
					body: 'description=V.A.L.E.T.'
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
	const macAddress = req.body['mac-address'];

	// Validate the MAC address
	const macAddressRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
	if (!macAddressRegex.test(macAddress)) {
		res.status(400).send('Invalid MAC address!');
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
		console.log(`Error deleting MAC Address: ${error.message}`);
		res.status(500).send('Error deleting MAC Address.');
	}
});

// Start server
app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});

/*
 * The code below this line monitors the WiFi space for ARP packets and extracts the MAC Addresses of the senders of these packets
 * If it sees a MAC Address that has been registered with the server above then it will create a RC Hub Visit for the user it pertains to, but only once per day.
 */
const PROTOCOL = Cap.decoders.PROTOCOL;

// List all network devices on machine
// console.log(JSON.stringify(Cap.deviceList(), null, 2));

const cap = new Cap.Cap();
// The device needs to be changed to the appropriate network device for the machine this is being run on, you can also use the IP address assigned to the machine with Cap.findDevice();
const device = "en0"; // Cap.findDevice('10.100.2.85');

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
		}/* else {
			console.log(`
			Visit for ${macAddress} has already been created today. Skipping.
			It belongs to ${user.email}`);
		}*/
	}
}

cap.on('packet', async (nbytes, trunc) => {
	if (linkType === 'ETHERNET') {
		let packet = Cap.decoders.Ethernet(buffer);
		packet = Cap.decoders.ARP(buffer, packet.offset);
		// logPacketInfo(packet);

		const macAddress = packet.info.sendermac;
		createVisit(macAddress);
	}
});
