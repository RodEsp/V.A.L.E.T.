'use client';

import { Avatar, Button, CircularProgress, Navbar, NavbarContent, NavbarItem } from "@nextui-org/react";

export default function VNavbar(props: {name: string, url: string}) {
	return (
	<>
		<Navbar isBlurred={false}>
			<NavbarContent>V.A.L.E.T.</NavbarContent>
			<NavbarContent>Welcome {props.name ? `${props.name}!`: ''}</NavbarContent>
			<NavbarItem>
				<Button>
					<a href="/api/auth/signout">Logout</a>
				</Button>
			</NavbarItem>
			<NavbarItem>
				{props.url ? <Avatar src={props.url} size="lg" name={props.name} alt={`A picture of ${props.name}` as string}/>
					: <CircularProgress aria-label="Loading..."/>}
			</NavbarItem>
		</Navbar>
	</>
	);
}