const RC_PAT = process.env.RC_PAT;

async function fetchDataUntilDate(targetDate) {
	const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
	let url = `https://www.recurse.com/api/v1/hub_visits?start_date=${targetDate}&end_date=${today}&page=1`;
	const valetVisits = [];
	let page = 1;

	while (true) {
		process.stdout.write(`\rFetching page ${page}...`);
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${RC_PAT}`,
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const visits = await response.json();

		if (visits.length > 0) {
			for (const visit of visits) {
				if (
					visit.created_by_app === "V.A.L.E.T." ||
					visit.updated_by_app === "V.A.L.E.T."
				) {
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
	process.stdout.write(`\r\x1b[K`); // Clear the entire line
	process.stdout.write(`Fetched ${page} pages of Hub Visits\n`);

	return valetVisits;
}

const date = Date.parse(process.argv[2]);
let since = "2023-08-03";

if (date) {
	since = new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		timeZone: "UTC",
	}).format(date);
	console.log(`Getting visits since ${since}`);
}

fetchDataUntilDate(since)
	.then((data) =>
		console.log(
			`\nTotal V.A.L.E.T. visits since ${new Date(since).toDateString()}: ${data.length}`,
		),
	)
	.catch((error) => console.error("Error fetching data: ", error));
