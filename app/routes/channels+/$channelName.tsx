import { requireUserId } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { getUserImgSrc } from "#app/utils/misc";
import { invariantResponse } from "@epic-web/invariant";
import { useLoaderData } from "@remix-run/react";
import { type LoaderFunctionArgs, json } from "@remix-run/server-runtime";

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
                                    name: true, image: true, username: true
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
        include: { user: { select: { id: true, username: true, image: { select: { id: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 50
    })

    invariantResponse(channel, 'Channel not found', { status: 404 })

    return json({ channel: channel, messages } as const)
}

export default function ChannelPage() {
    const { channel, messages } = useLoaderData<typeof loader>()

    return (
        <div className="flex h-full">
            <aside className="max-w-xs space-y-5 w-screen flex flex-col  bg-background  max-h-screen overflow-y-auto">
                <div className="flex justify-between items-center  shadow-lg shadow-black/30 px-10 py-4">
                    <button className="text-foreground text-lg font-bold"> {"<"} All Channels</button>
                </div>
                <div className="flex flex-col flex-grow px-10 space-y-4">
                    <h2 className="text-foreground text-lg font-bold">{channel.name}</h2>
                    <p className="text-base font-normal">{"Pellentesque sagittis elit enim, sit amet ultrices tellus accumsan quis. In gravida mollis purus, at interdum arcu tempor non"}</p>
                    <h2 className="text-foreground text-lg font-bold">Members</h2>
                    <ul>
                        {channel.private?.members.map(member =>
                            <li key={member.userId}>{member.user.name}</li>
                        )}
                    </ul>
                </div>
            </aside>
            <main className="flex-1 bg-muted">
                <div className="py-4 px-20 font-bold text-lg shadow-lg shadow-black/30 ">
                    <h1>{channel.name}</h1>
                </div>
                <section className="px-20 py-14">
                    {messages.map(message =>
                        <div key={message.id} className="flex items-center space-x-4">
                            <img className="w-10 h-10 rounded object-cover" src={getUserImgSrc(message.user.image?.id)} />
                            <div>{message.text}</div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}
