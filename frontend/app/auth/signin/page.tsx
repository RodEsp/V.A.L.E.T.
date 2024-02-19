// TODO: Figure out how to use a custom signing page
// Might have to wait until next-auth support Next.js's App Router with v5.

import Header from '@/app/components/header';

import { getProviders, signIn } from "next-auth/react";
import { Button, Spacer } from '@nextui-org/react';

// eslint-disable-next-line @next/next/no-async-client-component
export default async function SignIn() {
	const providers = await getProviders();

	return (
		<>
			<Header />
			<Spacer />
			{Object.values(providers as Object).map((provider) => (
				<div key='Recurse Center'>
					<Button onClick={() => signIn('recurse')}>
						Sign in with RC
					</Button>
				</div>
			))}
		</>
	);
}
