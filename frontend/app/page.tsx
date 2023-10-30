import Header from './components/header';
import { Button, Spacer } from '@nextui-org/react';

export default function VALET() {
  return (
    <>
      <Header />
      <Button>
        <a href="/api/auth/signout">Logout</a>
      </Button>
    </>
  );
}
