import {
	useForm,
	getFormProps,
	getInputProps,
	getTextareaProps,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	Link,
	useFetcher,
	useLoaderData,
	useRevalidator,
} from '@remix-run/react'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
	redirect,
	redirectDocument,
} from '@remix-run/server-runtime'
import { formatRelative } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { useInterval } from 'usehooks-ts'
import { z } from 'zod'
import {
	Field,
	CheckboxField,
	ErrorList,
	TextareaField,
} from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import {
	DialogHeader,
	DialogFooter,
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogTitle,
} from '#app/components/ui/dialog'
import { Icon } from '#app/components/ui/icon'
import { StatusButton } from '#app/components/ui/status-button'
import UserDropdown from '#app/components/user-dropdown'
import UserImage from '#app/components/user-image'
import { requireUser } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { cn, useDoubleCheck } from '#app/utils/misc'
import {
	requireUserWithPermission,
	userWithPermission,
} from '#app/utils/permissions.server'
import { redirectWithToast } from '#app/utils/toast.server'
import { useOptionalUser } from '#app/utils/user'

const SEND_MESSAGE_INTENT = 'SEND_MESSAGE'
const UPDATE_CHANNEL_INTENT = 'UPDATE_CHANNEL'
const DELETE_CHANNEL_INTENT = 'DELETE_CHANNEL'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const user = await requireUser(request)
	const channel = await prisma.channel.findFirst({
		include: {
			owner: {
				select: {
					name: true,
					image: true,
					username: true,
				},
			},
			private: {
				include: {
					members: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									username: true,
									image: { select: { id: true, altText: true } },
								},
							},
						},
					},
				},
			},
		},
		where: { name: params.channelName },
	})
	invariantResponse(channel, 'Channel not found', { status: 404 })
	const isPrivate = Boolean(channel.private)
	const isOwner = channel.ownerId === user.id
	const isMember = Boolean(
		channel.private?.members.find(member => member.userId === user.id),
	)
	const requiredPermission = isOwner
		? 'read:channel:own'
		: !isPrivate
			? 'read:channel:public'
			: isMember
				? 'read:channel:own'
				: 'read:channel:any'
	await requireUserWithPermission(request, requiredPermission)

	const messages = await prisma.message.findMany({
		where: { channel: { name: params.channelName } },
		include: {
			user: {
				select: {
					id: true,
					username: true,
					image: { select: { id: true, altText: true } },
				},
			},
		},
		orderBy: { createdAt: 'asc' },
		take: 50,
	})

	return json({ channel, messages } as const)
}

const NewMessageSchema = z.object({
	text: z.string().min(1).max(1000),
})

const EditChannelSchema = z.object({
	name: z.string().max(50).min(2),
	description: z.string().max(500).optional(),
	isPrivate: z.boolean().default(false),
})

async function updateChannelAction({
	formData,
	channelName,
	userId,
}: {
	request: Request
	formData: FormData
	channelName?: string
	userId: string
}) {
	const submission = parseWithZod(formData, { schema: EditChannelSchema })
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const channel = await prisma.channel.findUnique({
		where: { name: channelName },
		include: { private: true },
	})
	invariantResponse(channel, 'Channel not found')
	const isOwner = channel.ownerId === userId
	const permission = isOwner ? 'update:channel:own' : 'update:channel:any'
	const { user } = await userWithPermission(userId, permission)
	if (!user)
		return redirectWithToast(`/channels/${channel.name}`, {
			type: 'error',
			title: 'Unauthorized',
			description: "You don't have permission to do this action",
		})
	const { isPrivate, ...payload } = submission.value
	await prisma.channel.update({
		data: {
			...payload,
			...(isPrivate === undefined
				? {}
				: isPrivate === true && !channel.private
					? {
							private: {
								create: {},
							},
						}
					: isPrivate === false && channel.private
						? {
								private: {
									delete: {},
								},
							}
						: {}),
		},
		where: { name: channelName },
	})
	if (!payload.name || payload.name === channel.name)
		return json({ result: submission.reply() }, { status: 200 })
	return redirectDocument(`/channels/${payload.name}`)
}

async function deleteChannelAction({
	userId,
	channelName,
}: {
	request: Request
	userId: string
	channelName?: string
}) {
	const channel = await prisma.channel.findUnique({
		where: { name: channelName },
		include: { private: true },
	})
	invariantResponse(channel, 'Channel not found')
	const isOwner = channel.ownerId === userId
	const permission = isOwner ? 'delete:channel:own' : 'delete:channel:any'
	const { user } = await userWithPermission(userId, permission)
	if (!user)
		return redirectWithToast(`/channels/${channel.name}`, {
			type: 'error',
			title: 'Unauthorized',
			description: "You don't have permission to do this action",
		})
	await prisma.channel.delete({ where: { name: channelName } })
	return redirect('/channels')
}

async function sendMessageAction({
	formData,
	channelName,
	userId,
}: {
	request: Request
	formData: FormData
	channelName?: string
	userId: string
}) {
	const submission = parseWithZod(formData, { schema: NewMessageSchema })
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const channel = await prisma.channel.findFirst({
		where: { name: channelName },
		include: { private: { include: { members: true } } },
	})
	invariantResponse(channel, 'Channel not found')

	const isOwner = channel.ownerId === userId
	const isPrivate = Boolean(channel.private)
	const isMember = Boolean(
		channel.private?.members.find(member => (member.userId = userId)),
	)
	if (!isOwner && isPrivate && !isMember)
		throw json(
			{
				error: 'Unauthorized',
				message: `Unauthorized: You dont have access to this chat room`,
			},
			{ status: 403 },
		)
	await prisma.message.create({
		data: { ...submission.value, userId, channelId: channel.id },
	})
	return json({ result: submission.reply() }, { status: 201 })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const user = await requireUser(request)
	const formData = await request.formData()
	const intent = formData.get('intent')

	switch (intent) {
		case SEND_MESSAGE_INTENT:
			return sendMessageAction({
				request,
				formData,
				userId: user.id,
				channelName: params.channelName,
			})
		case UPDATE_CHANNEL_INTENT:
			return updateChannelAction({
				request,
				formData,
				channelName: params.channelName,
				userId: user.id,
			})
		case DELETE_CHANNEL_INTENT:
			return deleteChannelAction({
				request,
				userId: user.id,
				channelName: params.channelName,
			})
		default: {
			throw new Response(`Invalid intent "${intent}"`, { status: 400 })
		}
	}
}

export default function ChannelPage() {
	const { channel, messages } = useLoaderData<typeof loader>()
	const user = useOptionalUser()
	const canEdit =
		Boolean(user?.roles.find(role => role.name === 'admin')) ||
		user?.id === channel.ownerId
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const revalidator = useRevalidator()
	const interval = revalidator.state === 'idle' ? 5000 : null
	useInterval(() => revalidator.revalidate(), interval)

	return (
		<div className="flex h-full">
			<aside className="flex max-h-screen w-screen max-w-xs flex-col  space-y-5  bg-background">
				<div className="flex items-center justify-between  px-10 py-4 shadow-lg shadow-black/30">
					<Link
						to={`/channels`}
						className="flex items-center space-x-4 font-semibold text-muted-foreground transition hover:text-foreground"
					>
						<Icon name="chevron-left" className="h-5 w-5 " /> All Channels
					</Link>
				</div>
				<div className={cn(`flex flex-grow flex-col space-y-4 px-10`)}>
					<div>
						<div className="flex items-center space-x-4">
							<h2 className="my-3 text-lg font-bold text-foreground">
								{channel.name}
							</h2>
							{canEdit && (
								<EditChannelDialog
									isOpen={isDialogOpen}
									setIsOpen={setIsDialogOpen}
								/>
							)}
						</div>
						<p className="text-base font-normal">{channel.description}</p>
					</div>
					<div className="">
						<h2 className="my-3 text-lg font-bold text-foreground">
							Created By
						</h2>
						<div>
							<Button
								variant={'link'}
								className="text-muted-foreground transition hover:text-foreground"
							>
								<Link
									to={`/users/${channel.owner.username}`}
									className="flex items-center space-x-4 font-semibold"
								>
									<UserImage
										imageId={channel.owner.image?.id}
										alt={channel.owner.image?.altText}
									/>
									<p>{channel.owner.name}</p>
								</Link>
							</Button>
						</div>
					</div>
					{channel.private ? (
						<div className="flex h-10 max-h-full flex-grow flex-col">
							<h2 className="my-3 text-lg font-bold text-foreground">
								Members
							</h2>
							<ul className="h-10 max-h-full flex-grow space-y-4 overflow-y-auto">
								{channel.private?.members.map(member => (
									<li key={member.userId}>
										<Button
											variant={'link'}
											className="text-muted-foreground transition hover:text-foreground"
										>
											<Link
												to={`/users/${member.user.username}`}
												className="flex items-center space-x-4 font-semibold"
											>
												<UserImage
													imageId={member.user.image?.id}
													alt={member.user.image?.altText}
												/>
												<p>{member.user.name}</p>
											</Link>
										</Button>
									</li>
								))}
							</ul>
						</div>
					) : (
						<p></p>
					)}
				</div>
				<div className="flex justify-center bg-black/40 px-10 py-2">
					<UserDropdown />
				</div>
			</aside>
			<main className="relative flex h-screen flex-1 flex-col bg-muted">
				<div className="px-20 py-4 text-lg font-bold shadow-lg shadow-black/30 ">
					<h1>{channel.name}</h1>
				</div>
				<section className="h-96 flex-1 space-y-2 overflow-y-auto px-20 pb-28 pt-14">
					{messages.map(message => (
						<div key={message.id} className="flex items-start space-x-4">
							<UserImage
								imageId={message.user.image?.id}
								alt={message.user.image?.altText}
							/>
							<div className="">
								<div className="flex items-center space-x-4">
									<p className="text-lg font-semibold text-muted-foreground">
										{message.user.username}
									</p>
									<p className="text-sm text-muted-foreground">
										{formatRelative(new Date(message.createdAt), new Date())}
									</p>
								</div>
								<p className="text-lg font-medium text-foreground">
									{message.text}
								</p>
							</div>
						</div>
					))}
					<article className="absolute bottom-10 left-20 right-20 ">
						<MessageSender />
					</article>
				</section>
			</main>
		</div>
	)
}

function MessageSender() {
	const formRef = useRef<HTMLFormElement>(null)
	const fetcher = useFetcher<typeof sendMessageAction>()
	const isPending = fetcher.state !== 'idle'

	useEffect(() => {
		if (!isPending) formRef.current?.reset()
	}, [isPending])

	return (
		<fetcher.Form
			ref={formRef}
			method="POST"
			className="border-1 flex items-center rounded-lg border-background bg-zinc-600 p-2"
		>
			<input
				name="text"
				autoComplete="off"
				type="text"
				className="w-full border-none bg-transparent px-4 text-lg outline-none"
			/>
			<StatusButton
				name="intent"
				value={SEND_MESSAGE_INTENT}
				status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
				type="submit"
				variant={'secondary'}
				disabled={isPending}
				className="h-8 w-8 "
			>
				<Icon name="send" className="flex items-center" />
			</StatusButton>
		</fetcher.Form>
	)
}

function EditChannelForm() {
	const fetcher = useFetcher<typeof updateChannelAction>({
		key: 'edit-channel',
	})
	const data = useLoaderData<typeof loader>()
	const isPending = fetcher.state !== 'idle'

	const defaultValues = (({ name, description, private: isPrivate }) => ({
		name,
		description,
		isPrivate: !!isPrivate,
	}))(data.channel)

	const [form, fields] = useForm({
		id: 'new-channel-form',
		constraint: getZodConstraint(EditChannelSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: EditChannelSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: defaultValues,
	})
	const dc = useDoubleCheck()

	return (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			className={cn({
				'pointer-events-none animate-pulse opacity-50':
					fetcher.state !== 'idle',
			})}
		>
			<HoneypotInputs />
			<Field
				labelProps={{ children: 'Name' }}
				inputProps={{
					...getInputProps(fields.name, { type: 'text' }),
					autoFocus: true,
				}}
				errors={fields.name.errors}
			/>

			<TextareaField
				labelProps={{ children: 'Description' }}
				textareaProps={{
					...getTextareaProps(fields.description),
				}}
				errors={fields.description.errors}
			/>

			<div className="flex justify-between">
				<CheckboxField
					labelProps={{
						htmlFor: fields.isPrivate.id,
						children: 'Private',
					}}
					buttonProps={getInputProps(fields.isPrivate, {
						type: 'checkbox',
					})}
					errors={fields.isPrivate.errors}
				/>
			</div>

			<ErrorList errors={form.errors} id={form.errorId} />
			<div className="flex justify-end space-x-4">
				<StatusButton
					name="intent"
					value={UPDATE_CHANNEL_INTENT}
					className="w-fit"
					status={isPending ? 'pending' : 'idle'}
					type="submit"
					variant={'secondary'}
					disabled={isPending}
				>
					Save
				</StatusButton>
				<StatusButton
					{...dc.getButtonProps({
						type: 'submit',
						name: 'intent',
						value: DELETE_CHANNEL_INTENT,
					})}
					variant={dc.doubleCheck ? 'destructive' : 'default'}
					status={
						fetcher.state !== 'idle' &&
						fetcher.formData?.get('intent') === DELETE_CHANNEL_INTENT
							? 'pending'
							: 'idle'
					}
				>
					<Icon name="trash">
						{dc.doubleCheck ? `Are you sure?` : `Delete`}
					</Icon>
				</StatusButton>
			</div>
		</fetcher.Form>
	)
}
function EditChannelDialog({
	isOpen,
	setIsOpen,
}: {
	isOpen: boolean
	setIsOpen: (newState: boolean) => void
}) {
	const fetcher = useFetcher<typeof updateChannelAction>({
		key: 'edit-channel',
	})

	useEffect(() => {
		if (fetcher.data?.result.status === 'success' && fetcher.state === 'idle') {
			setIsOpen(false)
		}
	}, [fetcher.data?.result.status, fetcher.state, setIsOpen])
	return (
		<Dialog open={isOpen} modal={true} onOpenChange={setIsOpen}>
			<DialogTrigger
				className="flex h-6  w-6 items-center  justify-center text-muted-foreground transition 
            hover:text-foreground"
			>
				<Icon name={'pencil-1'} />
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-lg font-semibold text-foreground">
						Edit Channel
					</DialogTitle>
				</DialogHeader>
				<div className="my-4">
					<EditChannelForm />
				</div>
				<DialogFooter className=""></DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
