import Footer from "#app/components/footer"
import Navbar from "#app/components/navbar"
import { Outlet } from "@remix-run/react"

export default function SettingsLayout() {
    return <>
        <Navbar />
        <Outlet />
        <Footer />
    </>
}
