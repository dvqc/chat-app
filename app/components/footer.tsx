import Logo from './logo'
import ThemeSwitch from './theme-switch'

export default function Footer() {
	return (
		<div className="container mb-0 mt-auto flex justify-between pb-5">
			<Logo />
			<ThemeSwitch />
		</div>
	)
}
