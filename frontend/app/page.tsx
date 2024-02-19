'use client';

import { useSession } from 'next-auth/react';
import Image from "next/image";

import { Avatar, Button, Spacer } from '@nextui-org/react';

import Header from './components/header';

export default function VALET() {
  const { data: session } = useSession();

  return (
    <>
      <Header />
      <Spacer />
      <Avatar src={session?.user?.image as string} size="lg" alt={`A picture of ${session?.user?.name}` as string}/>
      <h3>Welcome {session?.user?.name}!</h3>
      <Button>
        <a href="/api/auth/signout">Logout</a>
      </Button>
    </>
  );
}
