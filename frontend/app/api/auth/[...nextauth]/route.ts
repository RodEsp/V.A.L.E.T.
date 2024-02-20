import NextAuth from 'next-auth';
import clientPromise from "../../../db/mongodb";

const handler = NextAuth({
	theme: {
		colorScheme: "dark",
		logo: "https://i.imgur.com/8gWl6El.png",
	},
	// Configure one or more authentication providers
	providers: [
		{
			id: 'recurse',
			name: 'Recurse Center',
			type: 'oauth',
			authorization: { url: 'https://recurse.com/oauth/authorize', params: { scope: '' } },
			token: 'https://www.recurse.com/oauth/token',
			userinfo: 'https://www.recurse.com/api/v1/profiles/me',
			clientId: process.env.RC_OAUTH_CLIENT_ID,
			clientSecret: process.env.RC_OAUTH_CLIENT_SECRET,
			profile(profile) {
				return {
					id: profile.id,
					name: profile.name,
					first_name: profile.first_name,
					image: profile.image_path,
				};
			},
		}
	],
	callbacks: {
		async signIn(params) {
			// console.log(`Signed in
			// ${JSON.stringify(params, null, 4)}`);
			let mongo_client;
			try {
				mongo_client = await clientPromise;
				const db = mongo_client.db("admin");
				console.log(await db.command({ping:1}));
			} catch (e) {
				console.error("Could not establish a connection to MongoDB");
				console.error(e);
			}

			return !!params.profile ? true : false;
		},
		async redirect({ url, baseUrl }) {
			// console.log(`REDIRECTED\n URL = ${url}\n BaseURL = ${baseUrl}`);
			// Allows relative callback URLs;
			if (url.startsWith("/")) return `${baseUrl}${url}`;
			// Allows callback URLs on the same origin
			else if (new URL(url).origin === baseUrl) return url;
			return baseUrl;
		},
		async session({ session, token, user }) {
			// console.log(`SESSION CHECKED\n ${JSON.stringify(session, null, 2)}`);
			return session;
		}
	}
});

export { handler as GET, handler as POST };
