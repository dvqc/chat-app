import { Link } from '@remix-run/react'
import { Icon } from './ui/icon'

export default function Logo() {
	return (
		<Link to="/" className="group grid leading-snug">
			<Icon
				name="logo"
				size="lg"
				className="font-light transition group-hover:translate-x-1"
			>
				<span className="text-sm text-foreground transition group-hover:translate-x-1">
					devChallenges
				</span>
			</Icon>
			<span className="font-bold transition group-hover:-translate-x-1">
				Chat App
			</span>
		</Link>
	)
}
