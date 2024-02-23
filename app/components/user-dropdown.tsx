import { getUserImgSrc } from "#app/utils/misc"
import { useUser } from "#app/utils/user"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu"
import { useSubmit, Link, Form } from "@remix-run/react"
import { useRef } from "react"
import { Icon } from "./ui/icon"
import { Button } from "./ui/button"

export default function UserDropdown() {
    const user = useUser()
    const submit = useSubmit()
    const formRef = useRef<HTMLFormElement>(null)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button asChild variant="default">
                    <Link
                        to={`/users/${user.username}`}
                        // this is for progressive enhancement
                        onClick={e => e.preventDefault()}
                        className="flex items-center gap-2"
                    >
                        <img
                            className="h-8 w-8 rounded-full object-cover"
                            alt={user.name ?? user.username}
                            src={getUserImgSrc(user.image?.id)}
                        />
                        <span className="text-body-sm font-bold">
                            {user.name ?? user.username}
                        </span>
                    </Link>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
                <DropdownMenuContent sideOffset={8} align="start">
                    <DropdownMenuItem asChild>
                        <Link prefetch="intent" to={`/users/${user.username}`}>
                            <Icon className="text-body-md" name="avatar">
                                Profile
                            </Icon>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link prefetch="intent" to={`/users/${user.username}/channels`}>
                            <Icon className="text-body-md" name="chat">
                               Channels 
                            </Icon>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        asChild
                        // this prevents the menu from closing before the form submission is completed
                        onSelect={event => {
                            event.preventDefault()
                            submit(formRef.current)
                        }}
                    >
                        <Form action="/logout" method="POST" ref={formRef}>
                            <Icon className="text-body-md" name="exit">
                                <button type="submit">Logout</button>
                            </Icon>
                        </Form>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenuPortal>
        </DropdownMenu>
    )
}
