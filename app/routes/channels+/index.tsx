import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react'
import {
    type ActionFunctionArgs,
    type LoaderFunctionArgs,
    json,
    redirect,
} from '@remix-run/server-runtime'
import { useEffect, useState } from 'react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { CheckboxField, ErrorList, Field } from '#app/components/forms'
import { SearchBar } from '#app/components/search-bar'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '#app/components/ui/dialog'
import { Icon } from '#app/components/ui/icon'
import { StatusButton } from '#app/components/ui/status-button'
import UserDropdown from '#app/components/user-dropdown'
import { requireUser } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { checkHoneypot } from '#app/utils/honeypot.server'
import {
    getAbbreviation,
    getChannelImgSrc,
    useDelayedIsPending,
} from '#app/utils/misc'
import { userHasRole } from '#app/utils/user'

const ChannelSearchResultSchema = z.object({
    id: z.string(),
    name: z.string(),
    imageId: z.string().optional(),
})

const ChannelSearchResultsSchema = z.array(ChannelSearchResultSchema)

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireUser(request)
    const url = new URL(request.url)
    const searchTerm = url.searchParams.get('search')
    if (searchTerm === '') {
        url.searchParams.delete('search')
        return redirect(url.toString())
    }

    const ownerName = new URL(request.url).searchParams.get('owner')
    if (ownerName === '') {
        url.searchParams.delete('owner')
        return redirect(url.toString())
    }

    const likeSearch = `%${searchTerm ?? ''}%`
    const likeOwner = `%${ownerName ?? ''}%`
    const isAdmin = userHasRole(user, 'admin')

    const rawChannels = await prisma.$queryRaw`
		SELECT DISTINCT Channel.id, Channel.name, ChannelImage.id AS ImageId
		FROM Channel
        LEFT JOIN ChannelImage ON ChannelImage.channelId = Channel.id
        LEFT JOIN PrivateChannel on PrivateChannel.channelId = Channel.id
        LEFT JOIN Membership on Membership.channelId = PrivateChannel.channelId
        LEFT JOIN User on User.id = channel.ownerId
		WHERE Channel.name LIKE ${likeSearch} 
        AND User.username LIKE ${likeOwner}
        AND ( PrivateChannel.channelId is null 
        OR Membership.userId = ${user.id} 
        OR Channel.ownerId = ${user.id} 
        OR ${isAdmin ? true : false} ) 
        LIMIT 50
	`

    const result = ChannelSearchResultsSchema.safeParse(rawChannels)
    if (!result.success) {
        return json({ status: 'error', error: result.error.message } as const, {
            status: 400,
        })
    }
    return json({ status: 'idle', channels: result.data } as const)
}

const NewChannelSchema = z.object({
    name: z.string().max(50).min(2),
    description: z.string().max(500).optional(),
    isPrivate: z.boolean().default(false),
})

export async function action({ request }: ActionFunctionArgs) {
    const user = await requireUser(request)
    const formData = await request.formData()
    checkHoneypot(formData)
    const submission = await parseWithZod(formData, {
        schema: NewChannelSchema.superRefine(async (data, ctx) => {
            const existingChannel = await prisma.channel.findUnique({
                where: { name: data.name },
                select: { id: true },
            })
            if (existingChannel) {
                ctx.addIssue({
                    path: ['name'],
                    code: z.ZodIssueCode.custom,
                    message: 'A channel already exists with this name',
                })
                return
            }
        }),
        async: true,
    })

    if (submission.status !== 'success')
        return json({ result: submission.reply() }, { status: 400 })

    const { isPrivate, ...values } = submission.value
    await prisma.channel.create({
        data: {
            ...values,
            ownerId: user.id,
            ...(!isPrivate
                ? {}
                : {
                    private: {
                        create: {},
                    },
                }),
        },
    })

    return json(
        {
            result: {
                ...submission.reply({ resetForm: true }),
                ...submission.reply(),
            },
        },
        { status: 201 },
    )
}

export default function ChannelsLayout() {
    const data = useLoaderData<typeof loader>()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="flex h-full">
            <aside className="flex max-h-screen w-screen max-w-xs flex-col  space-y-5  overflow-y-auto bg-background">
                <div className="flex items-center justify-between  px-10 py-4 shadow-lg shadow-black/30">
                    <h1 className="text-lg font-bold text-foreground">Channels</h1>
                    <CreateChannelDialog {...{ isOpen, setIsOpen }} />
                </div>
                <div className="flex flex-grow flex-col space-y-4 px-10">
                    <SearchBar
                        autoSubmit
                        autoFocus
                        status={data.status}
                        route="/channels"
                    />
                    <div className="flex-grow">
                        {data.status === 'idle' ? (
                            data.channels.length ? (
                                <ul
                                    className={
                                        'w-full items-center justify-center space-y-4 delay-200'
                                    }
                                >
                                    {data.channels.map(channel => (
                                        <li key={channel.id}>
                                            <Link
                                                to={channel.name}
                                                className="group flex items-center justify-center space-x-4 rounded-lg"
                                            >
                                                {channel.imageId ? (
                                                    <img
                                                        alt={channel.name}
                                                        src={getChannelImgSrc(channel.imageId)}
                                                        className="h-16 w-16 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="flex h-10 w-10 items-center  justify-center rounded bg-muted font-semibold text-foreground">
                                                        {getAbbreviation(channel.name)}
                                                    </div>
                                                )}
                                                <div
                                                    className="w-full overflow-hidden text-ellipsis whitespace-nowrap 
                                            text-body-md text-muted-foreground transition group-hover:text-foreground"
                                                >
                                                    {channel.name}
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No channels found</p>
                            )
                        ) : data.status === 'error' ? (
                            <ErrorList errors={['There was an error parsing the results']} />
                        ) : null}
                    </div>
                </div>
                <div className="flex justify-center bg-black/40 px-10 py-2">
                    <UserDropdown />
                </div>
            </aside>
            <main className="flex-1 bg-muted">
                <div className="px-20 py-4 text-lg font-bold shadow-lg shadow-black/30 ">
                    <Icon size="lg" name="logo"></Icon> devChallenges Chat App
                </div>
                <section className="flex items-center justify-center px-20 py-14">
                    <img
                        className="my-10 aspect-auto w-full max-w-2xl"
                        src="/img/welcome.gif"
                        alt="welcome meme"
                    />
                </section>
            </main>
        </div>
    )
}

const initialFormValues = { name: '', description: '', isPrivate: false }

function CreateChannelDialog({
    isOpen,
    setIsOpen,
}: {
    isOpen: boolean
    setIsOpen: (newState: boolean) => void
}) {
    const actionData = useActionData<typeof action>()
    const isPending = useDelayedIsPending()

    const [form, fields] = useForm({
        id: 'new-channel-form',
        constraint: getZodConstraint(NewChannelSchema),
        lastResult: actionData?.result,
        onValidate({ formData }) {
            return parseWithZod(formData, { schema: NewChannelSchema })
        },
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
        defaultValue: initialFormValues,
    })

    useEffect(() => {
        if (actionData?.result.status === 'success') setIsOpen(false)
    }, [actionData?.result.status, setIsOpen])

    return (
        <Dialog open={isOpen} modal={true} onOpenChange={setIsOpen}>
            <DialogTrigger
                className="flex h-6 w-6  items-center justify-center rounded bg-muted text-muted-foreground transition 
            hover:text-foreground"
            >
                <Icon name="plus" />
            </DialogTrigger>
            <DialogContent>
                <Form method="POST" {...getFormProps(form)}>
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-foreground">
                            New Channel
                        </DialogTitle>
                    </DialogHeader>
                    <div>
                        <HoneypotInputs />
                        <Field
                            labelProps={{ children: 'Name' }}
                            inputProps={{
                                ...getInputProps(fields.name, { type: 'text' }),
                                autoFocus: true,
                            }}
                            errors={fields.name.errors}
                        />

                        <Field
                            labelProps={{ children: 'Description' }}
                            inputProps={{
                                ...getInputProps(fields.description, {
                                    type: 'text',
                                }),
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
                    </div>
                    <DialogFooter>
                        <StatusButton
                            className="w-full"
                            status={isPending ? 'pending' : form.status ?? 'idle'}
                            type="submit"
                            variant={'secondary'}
                            disabled={isPending}
                        >
                            Save
                        </StatusButton>
                    </DialogFooter>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
