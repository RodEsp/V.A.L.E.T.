'use client';

import { NextUIProvider } from '@nextui-org/react';
import { SessionProvider } from 'next-auth/react';

export default function SessionWrapper({children}: {children: React.ReactNode}) {
	return (
		<SessionProvider>
			<NextUIProvider>
				{children}
			</NextUIProvider>
		</SessionProvider>
	);
}
