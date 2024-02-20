'use client';

import { useSession } from 'next-auth/react';

import Navbar from './components/navbar';

export default function VALET() {
  const { data: session } = useSession();

  return (
    <>
      <Navbar name={session?.user?.name?.split(' ')[0] as string} url={session?.user?.image as string}/>
    </>
  );
}
