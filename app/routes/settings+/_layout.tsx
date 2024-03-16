import { Outlet } from '@remix-run/react'
import Footer from '#app/components/footer'
import Navbar from '#app/components/navbar'

export default function SettingsLayout() {
	return (
		<>
			<Navbar />
			<Outlet />
			<Footer />
		</>
	)
}
