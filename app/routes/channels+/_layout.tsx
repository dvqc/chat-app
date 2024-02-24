import { ErrorList } from "#app/components/forms";
import { SearchBar } from "#app/components/search-bar";
import { Icon } from "#app/components/ui/icon";
import UserDropdown from "#app/components/user-dropdown";
import { requireUserId } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { cn, getAbbreviation, getChannelImgSrc, getUserImgSrc, useDelayedIsPending } from "#app/utils/misc";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { LoaderFunction, LoaderFunctionArgs, json, redirect } from "@remix-run/server-runtime";
import { z } from "zod";

const ChannelSearchResultSchema = z.object({
    id: z.string(),
    name: z.string(),
    imageId: z.string().optional(),
})

const ChannelSearchResultsSchema = z.array(ChannelSearchResultSchema)

export async function loader({ request }: LoaderFunctionArgs) {
    await requireUserId(request)
    const searchTerm = new URL(request.url).searchParams.get('search')
    if (searchTerm === '') {
        return redirect('/channels')
    }

    const like = `%${searchTerm ?? ''}%`
    const rawChannels = await prisma.$queryRaw`
		SELECT Channel.id, Channel.name, ChannelImage.id AS ImageId
		FROM Channel
        LEFT JOIN ChannelImage ON ChannelImage.channelId = Channel.id
		WHERE Channel.name LIKE ${like}
        AND Channel.isPrivate = 0
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

export default function ChannelsLayout() {
    const data = useLoaderData<typeof loader>()
    const isPending = useDelayedIsPending({
        formMethod: 'GET',
        formAction: '/channels',
    })

    if (data.status === 'error') {
        console.error(data.error)
    }

    return (
        <div className="flex h-full">
            <aside className="max-w-xs space-y-4 w-screen py-2 px-10 bg-background flex flex-col max-h-screen overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h1 className="text-foreground text-lg font-bold">Channels</h1>
                    <button className="bg-muted h-6 w-6  text-muted-foreground transition rounded flex justify-center items-center hover:text-foreground">
                        <Icon name="plus" />
                    </button>
                </div>
                <div><SearchBar autoSubmit autoFocus status="idle" route="/channels" /> </div>
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
                <div className="flex justify-center py-2"><UserDropdown /></div>
            </aside>
            <div className="flex-1 bg-muted"><Outlet /></div>
        </div>
    )
}
