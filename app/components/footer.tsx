import Logo from "./logo";
import ThemeSwitch from "./theme-switch";

export default function Footer() {
    return (
        <div className="container mt-auto mb-0 flex justify-between pb-5">
            <Logo />
            <ThemeSwitch />
        </div>
    )
}
