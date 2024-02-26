import { Button } from "#app/components/ui/button";
import UserDropdown from "#app/components/user-dropdown";
import { requireUserId } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { getUserImgSrc } from "#app/utils/misc";
import { invariantResponse } from "@epic-web/invariant";
import { Link, useLoaderData } from "@remix-run/react";
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
            <aside className="max-w-xs space-y-5 w-screen flex flex-col  bg-background  max-h-screen">
                <div className="flex justify-between items-center  shadow-lg shadow-black/30 px-10 py-4">
                    <button className="text-foreground text-lg font-bold"> {"<"} All Channels</button>
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
                                            <img
                                                className="w-10 h-10 object-cover rounded"
                                                src={getUserImgSrc(member.user.image?.id)}
                                                alt={member.user.image?.altText ?? 'user profile picture'}
                                            />
                                            <p>{member.user.name}</p>
                                        </Link>
                                    </Button>
                                </li>
                            )}
                        </ul>
                    </div>
                    <div className="flex justify-center py-2"><UserDropdown /></div>
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
