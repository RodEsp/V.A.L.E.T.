'use client';

import { useSession } from 'next-auth/react';

import VNavbar from './components/navbar';

export default function VALET() {
  const { data: session } = useSession();

  return (
    <>
      <VNavbar name={session?.user?.name?.split(' ')[0] as string} url={session?.user?.image as string}/>
    </>
  );
}
