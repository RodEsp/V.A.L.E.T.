'use client';

import { Avatar, Button, Navbar, NavbarContent, NavbarItem } from "@nextui-org/react";

export default function VNavbar(props: {name: string, url: string}) {
	return (
	<>
		<Navbar isBlurred={false}>
			<NavbarContent>V.A.L.E.T.</NavbarContent>
			<NavbarContent>Welcome {props.name}!</NavbarContent>
			<NavbarItem>
				<Button>
					<a href="/api/auth/signout">Logout</a>
				</Button>
			</NavbarItem>
			<NavbarItem>
				<Avatar src={props.url} size="lg" alt={`A picture of ${props.name}` as string}/>
			</NavbarItem>
		</Navbar>
	</>
	);
}