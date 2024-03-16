import { useSubmit, Link, Form } from '@remix-run/react'
import { useRef } from 'react'
import { useUser } from '#app/utils/user'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuPortal,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from './ui/dropdown-menu'
import { Icon } from './ui/icon'
import UserImage from './user-image'

export default function UserDropdown() {
	const user = useUser()
	const submit = useSubmit()
	const formRef = useRef<HTMLFormElement>(null)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="w-full bg-transparent">
				<Link
					to={`/users/${user.username}`}
					// this is for progressive enhancement
					onClick={e => e.preventDefault()}
					className="flex items-center justify-between space-x-4"
				>
					<UserImage
						imageId={user.image?.id}
						alt={user.name ?? user.username}
					/>
					<span className="text-body-sm font-bold text-muted-foreground">
						{user.name ?? user.username}
					</span>
					<Icon name="chevron-down" />
				</Link>
			</DropdownMenuTrigger>
			<DropdownMenuPortal>
				<DropdownMenuContent
					sideOffset={8}
					align="start"
					className="w-44 rounded-xl p-2"
				>
					<DropdownMenuItem asChild>
						<Link prefetch="intent" to={`/users/${user.username}`}>
							<Icon className="mr-1 text-body-md " name="avatar">
								Profile
							</Icon>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link prefetch="intent" to={`/users/${user.username}/channels`}>
							<Icon className="mr-1 text-body-md" name="chat">
								Channels
							</Icon>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuSeparator className="mx-2 mb-2 bg-muted-foreground" />
					<DropdownMenuItem
						asChild
						// this prevents the menu from closing before the form submission is completed
						onSelect={event => {
							event.preventDefault()
							submit(formRef.current)
						}}
					>
						<Form
							action="/logout"
							method="POST"
							ref={formRef}
							className="group"
						>
							<Icon
								className="mr-1 text-body-md text-red-300 transition group-hover:text-red-500"
								name="exit"
							>
								<button
									className="text-red-300 transition group-hover:text-red-500"
									type="submit"
								>
									Logout
								</button>
							</Icon>
						</Form>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenuPortal>
		</DropdownMenu>
	)
}
