'use client';

import Header from '@/app/components/header';

import { getProviders, signIn } from "next-auth/react";
import { Button, Spacer } from '@nextui-org/react';

// eslint-disable-next-line @next/next/no-async-client-component
export default async function SignIn() {
	const providers = await getProviders();

	return (
		<>
			<Header />
			<Spacer y={5} />
			{Object.values(providers as Object).map((provider) => (
				<div key={provider.name}>
					<Button onClick={() => signIn(provider.id)}>
						Sign in with {provider.name}
					</Button>
				</div>
			))}
		</>
	);
}
