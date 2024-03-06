import { Button } from "#app/components/ui/button";
import { Icon } from "#app/components/ui/icon";
import { StatusButton } from "#app/components/ui/status-button";
import UserDropdown from "#app/components/user-dropdown";
import UserImage from "#app/components/user-image";
import { requireUser, requireUserId } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { useIsPending } from "#app/utils/misc";
import { parseWithZod } from "@conform-to/zod";
import { invariantResponse } from "@epic-web/invariant";
import { Form, Link, useLoaderData, useRevalidator } from "@remix-run/react";
import { useInterval } from "usehooks-ts"
import { type LoaderFunctionArgs, json, ActionFunctionArgs, redirect } from "@remix-run/server-runtime";
import { formatRelative } from "date-fns";
import { useEffect, useRef } from "react";
import { z } from "zod";

export async function loader({ request, params }: LoaderFunctionArgs) {
    await requireUserId(request)
    const channel = await prisma.channel.findFirst({
        include: {
            private: {
                include: {
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true, name: true, username: true, image: { select: { id: true, altText: true } }
                                }
                            }
                        }
                    }
                }
            }
        },
        where: { name: params.channelName }
    })

    const messages = await prisma.message.findMany({
        where: { channel: { name: params.channelName } },
        include: { user: { select: { id: true, username: true, image: { select: { id: true, altText: true } } } } },
        orderBy: { createdAt: 'asc' },
        take: 50
    })

    invariantResponse(channel, 'Channel not found', { status: 404 })

    return json({ channel: channel, messages } as const)
}

const NewMessageSchema = z.object({
    text: z.string().min(1).max(1000),
})

export async function action({ request, params }: ActionFunctionArgs) {
    const user = await requireUser(request)
    const formData = await request.formData()

    const submission = parseWithZod(formData, { schema: NewMessageSchema })
    if (submission.status !== 'success') {
        return json(
            { result: submission.reply() },
            { status: submission.status === 'error' ? 400 : 200 },
        )
    }

    const channel = await prisma.channel.findFirst({ where: { name: params.channelName } })
    invariantResponse(channel, 'Channel not found')

    await prisma.message.create({ data: { ...submission.value, userId: user.id, channelId: channel.id } })
    return json(
        { result: submission.reply() },
        { status: 201 },
    )
}

export default function ChannelPage() {
    const { channel, messages } = useLoaderData<typeof loader>()
    const formRef = useRef<HTMLFormElement>(null)
    const isPending = useIsPending()
    const revalidator = useRevalidator();
    const interval = revalidator.state === 'idle' ? 5000 : null
    useInterval(() => revalidator.revalidate(), interval);

    useEffect(() => {
        if (!isPending)
            formRef.current?.reset()
    }, [isPending])

    return (
        <div className="flex h-full">
            <aside className="max-w-xs space-y-5 w-screen flex flex-col  bg-background  max-h-screen">
                <div className="flex justify-between items-center  shadow-lg shadow-black/30 px-10 py-4">
                    <Button variant="link" className="text-foreground text-lg font-bold">
                        <Link to={`/channels`} className="flex items-center space-x-4 font-semibold">
                            <Icon name="chevron-left" className="w-5 h-5 text-foreground" /> All Channels
                        </Link>
                    </Button>
                </div>
                <div className="flex flex-col flex-grow px-10 space-y-4">
                    <div>
                        <h2 className="text-foreground text-lg font-bold my-3">{channel.name}</h2>
                        <p className="text-base font-normal">{"Pellentesque sagittis elit enim, sit amet ultrices tellus accumsan quis. In gravida mollis purus, at interdum arcu tempor non"}</p>
                    </div>
                    <div className="flex-grow flex flex-col h-10 max-h-full">
                        <h2 className="text-foreground text-lg font-bold my-3">Members</h2>
                        <ul className="space-y-4 flex-grow overflow-y-auto h-10 max-h-full">
                            {channel.private?.members.map(member =>
                                <li key={member.userId} >
                                    <Button variant={"link"} className="transition text-muted-foreground hover:text-foreground">
                                        <Link to={`/users/${member.user.username}`} className="flex items-center space-x-4 font-semibold">
                                            <UserImage
                                                imageId={member.user.image?.id}
                                                alt={member.user.image?.altText}
                                            />
                                            <p>{member.user.name}</p>
                                        </Link>
                                    </Button>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
                <div className="px-10 bg-black/40 flex justify-center py-2"><UserDropdown /></div>
            </aside>
            <main className="flex-1 bg-muted relative h-screen flex flex-col">
                <div className="py-4 px-20 font-bold text-lg shadow-lg shadow-black/30 ">
                    <h1>{channel.name}</h1>
                </div>
                <section className="px-20 pt-14 pb-28 h-96 flex-1 overflow-y-auto space-y-2">
                    {messages.map(message =>
                        <div key={message.id} className="flex items-start space-x-4">
                            <UserImage imageId={message.user.image?.id} alt={message.user.image?.altText} />
                            <div className="">
                                <div className="flex space-x-4 items-center">
                                    <p className="font-semibold text-lg text-muted-foreground">{message.user.username}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatRelative(new Date(message.createdAt), new Date())}
                                    </p>
                                </div>
                                <p className="text-foreground text-lg font-medium">{message.text}</p>
                            </div>
                        </div>
                    )}
                </section>
                <Form ref={formRef} method="POST" className="absolute p-2 left-20 right-20 bottom-10 flex items-center bg-zinc-600 rounded-lg border-background border-1">
                    <input
                        name="text"
                        autoComplete="off"
                        type="text"
                        className="border-none w-full bg-transparent outline-none px-4 text-lg" />
                    <StatusButton
                        status={isPending ? 'pending' : 'idle'}
                        type="submit"
                        variant={"secondary"}
                        disabled={isPending}
                        className="w-8 h-8 ">
                        <Icon name="send" className="flex items-center" />
                    </StatusButton>
                </Form>
            </main>
        </div>
    )
}
