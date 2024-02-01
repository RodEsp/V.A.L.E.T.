import fs from 'node:fs';

const pat = fs.readFileSync('./pat').toString().trim();

async function fetchDataUntilDate (targetDate) {
	let today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
	let url = `https://www.recurse.com/api/v1/hub_visits?start_date=${targetDate}&end_date=${today}&page=1`;
	let valetVisits = [];
	let page = 1;

	while (true) {
		let response = await fetch(url, {
			headers: {
				'Authorization': `Bearer ${pat}`
			}
		});

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		let visits = await response.json();

		if (visits.length > 0) {
			for (let visit of visits) {
				if (visit.created_by_app === 'V.A.L.E.T.' || visit.updated_by_app === 'V.A.L.E.T.') {
					valetVisits.push(visit);
				}
			}

			// Set the next URL for pagination
			page += 1;
			url = `https://www.recurse.com/api/v1/hub_visits?start_date=${targetDate}&end_date=${today}&page=${page}`;
		} else {
			break;
		}
	}

	return valetVisits;
}


let date = Date.parse(process.argv[2]);
let since = '2023-08-03';

if (date) {
  since = new Intl.DateTimeFormat('en-US', {year:'numeric', month:'2-digit', day:'2-digit', timeZone:'UTC'}).format(date);
  console.log(since);
}

fetchDataUntilDate(since)
	.then(data => console.log(`Total V.A.L.E.T. visits since ${new Date(since).toDateString()}: ${data.length}`))
	.catch(error => console.error("Error fetching data: ", error));
