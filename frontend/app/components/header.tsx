import { Spacer } from '@nextui-org/react';

export default function Header() {
	return (
		<div>
			<h1 className="text-5xl leading-4">V.A.L.E.T.</h1>
			<Spacer />
			<span className="text-xl italic mb-5 relative left-3.5 tracking-wide">Beta</span>
		</div>
	);
}