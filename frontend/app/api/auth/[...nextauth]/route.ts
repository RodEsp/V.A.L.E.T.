import NextAuth from 'next-auth';
import type { AuthOptions } from 'next-auth';

export const authOptions: AuthOptions = {
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
		async signIn({ user, account, profile }) {
			console.log(`Signed in
			User: ${!!user}
			Account: ${!!account}
			Profile: ${!!profile}`);
			return !!profile ? true : false;
		},
		async redirect({ url, baseUrl }) {
			console.log(`REDIRECTED\n${url}\n${baseUrl}`);
			// Allows relative callback URLs;
			if (url.startsWith("/")) return `${baseUrl}${url}`;
			// Allows callback URLs on the same origin
			else if (new URL(url).origin === baseUrl) return url;
			return baseUrl;
		},
		async session({ session, token, user }) {
			console.log('SESSION CHECKED');
			// Send properties to the client, like an access_token and user id from a provider.
			session.accessToken = token.accessToken;
			session.user.id = token.id;

			return session;
		}
	}
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };