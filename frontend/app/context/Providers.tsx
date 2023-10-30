'use client';

import { NextUIProvider } from '@nextui-org/react';
import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export default function Providers({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<SessionProvider>
			<NextUIProvider>
				{children}
			</NextUIProvider>
		</SessionProvider>
	);
}