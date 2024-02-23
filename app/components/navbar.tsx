import { useOptionalUser } from "#app/utils/user"
import { Button } from "./ui/button"
import { Link } from "@remix-run/react"
import Logo from "./logo"
import UserDropdown from "./user-dropdown"

export default function Navbar() {
    const user = useOptionalUser()
    return (
        <header className="container py-7">
            <nav className="flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap md:gap-8">
                <Logo />
                <div className="flex items-center gap-10">
                    {user ? (
                        <UserDropdown />
                    ) : (
                        <Button asChild variant="default" size="lg">
                            <Link to="/login">Log In</Link>
                        </Button>
                    )}
                </div>
            </nav>
        </header>
    )
}
