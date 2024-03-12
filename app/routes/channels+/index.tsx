import { CheckboxField, ErrorList, Field } from "#app/components/forms";
import { SearchBar } from "#app/components/search-bar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#app/components/ui/dialog";
import { Icon } from "#app/components/ui/icon";
import { StatusButton } from "#app/components/ui/status-button";
import UserDropdown from "#app/components/user-dropdown";
import { requireUser, requireUserId } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { checkHoneypot } from "#app/utils/honeypot.server";
import { getAbbreviation, getChannelImgSrc, useDelayedIsPending } from "#app/utils/misc";
import { userHasPermission } from "#app/utils/user";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from "@remix-run/server-runtime";
import { useEffect, useRef, useState } from "react";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { z } from "zod";

const ChannelSearchResultSchema = z.object({
    id: z.string(),
    name: z.string(),
    imageId: z.string().optional(),
})

const ChannelSearchResultsSchema = z.array(ChannelSearchResultSchema)

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireUser(request)
    const searchTerm = new URL(request.url).searchParams.get('search')
    if (searchTerm === '') {
        return redirect('/channels')
    }

    const like = `%${searchTerm ?? ''}%`
    const isAdmin = userHasPermission(user, 'read:channel:any')

    const rawChannels = await prisma.$queryRaw`
		SELECT DISTINCT Channel.id, Channel.name, ChannelImage.id AS ImageId
		FROM Channel
        LEFT JOIN ChannelImage ON ChannelImage.channelId = Channel.id
        LEFT JOIN PrivateChannel on PrivateChannel.channelId = Channel.id
        LEFT JOIN Membership on Membership.channelId = PrivateChannel.channelId
		WHERE Channel.name LIKE ${like} 
        AND ( PrivateChannel.channelId is null 
        OR Membership.userId = ${user.id} 
        OR Channel.ownerId = ${user.id} 
        OR ${isAdmin ? 'TRUE' : 'FALSE'} ) 
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
    isPrivate: z.boolean().default(false)
})

export async function action({ request, params }: ActionFunctionArgs) {
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
        return json(
            { result: submission.reply() },
            { status: 400 },
        )

    const { isPrivate, ...values } = submission.value
    await prisma.channel.create({
        data: {
            ...values, ownerId: user.id, ...(isPrivate ? {} : {
                private: {
                    create: {
                    }
                }
            })
        }
    })

    return json(
        { result: { ...submission.reply({ resetForm: true }), ...submission.reply() } },
        { status: 201 },
    )
}

export default function ChannelsLayout() {
    const data = useLoaderData<typeof loader>()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="flex h-full">
            <aside className="max-w-xs space-y-5 w-screen flex flex-col  bg-background  max-h-screen overflow-y-auto">
                <div className="flex justify-between items-center  shadow-lg shadow-black/30 px-10 py-4">
                    <h1 className="text-foreground text-lg font-bold">Channels</h1>
                    <CreateChannelDialog {...{ isOpen, setIsOpen }} />
                </div>
                <div className="flex flex-col flex-grow px-10 space-y-4">
                    <SearchBar autoSubmit autoFocus status={data.status} route="/channels" />
                    <div className="flex-grow">
                        {data.status === 'idle' ? (
                            data.channels.length ? (
                                <ul
                                    className={'w-full items-center justify-center space-y-4 delay-200'}
                                >
                                    {data.channels.map(channel => (
                                        <li key={channel.id}>
                                            <Link
                                                to={channel.name}
                                                className="flex space-x-4 items-center justify-center rounded-lg group"
                                            >
                                                {channel.imageId ?
                                                    <img
                                                        alt={channel.name}
                                                        src={getChannelImgSrc(channel.imageId)}
                                                        className="h-16 w-16 rounded-full"
                                                    />
                                                    :
                                                    <div className="h-10 w-10 font-semibold rounded  flex justify-center items-center bg-muted text-foreground">
                                                        {getAbbreviation(channel.name)}
                                                    </div>
                                                }
                                                <span className="w-full overflow-hidden text-ellipsis whitespace-nowrap 
                                            text-muted-foreground text-body-md group-hover:text-foreground transition">
                                                    {channel.name}
                                                </span>
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
                <div className="px-10 bg-black/40 flex justify-center py-2"><UserDropdown /></div>
            </aside>
            <main className="flex-1 bg-muted">
                <div className="py-4 px-20 font-bold text-lg shadow-lg shadow-black/30 "><Icon size="lg" name="logo"></Icon>{" "}devChallenges Chat App</div>
                <section className="px-20 py-14">
                    <h1 className="text-4xl">Welcome to chat 🎊🎉</h1>
                    <img className="my-10 max-w-xl w-full aspect-auto" src="/img/welcome.gif" alt="welcome meme" />
                </section>
            </main>
        </div>
    )
}

const initialFormValues = { name: '', description: '', isPrivate: false }

function CreateChannelDialog({ isOpen, setIsOpen }:
    { isOpen: boolean, setIsOpen: (newState: boolean) => void }) {
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
        defaultValue: initialFormValues
    })

    useEffect(() => {
        if (actionData?.result.status === "success")
            setIsOpen(false)
    }, [actionData?.result.status])

    return (
        <Dialog open={isOpen} modal={true} onOpenChange={setIsOpen}>
            <DialogTrigger
                className="bg-muted h-6 w-6  text-muted-foreground transition rounded flex justify-center items-center 
            hover:text-foreground"
            >
                <Icon name="plus" />
            </DialogTrigger>
            <DialogContent>
                <Form method="POST" {...getFormProps(form)} >
                    <DialogHeader >
                        <DialogTitle className="text-foreground font-semibold text-lg">New Channel</DialogTitle>
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
                                    type: 'text'
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
                            variant={"secondary"}
                            disabled={isPending}
                        >
                            Save
                        </StatusButton>
                    </DialogFooter>
                </Form>
            </DialogContent>
        </Dialog >
    )
}
