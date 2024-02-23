import { requireUserId } from "#app/utils/auth.server";
import { Outlet } from "@remix-run/react";
import { LoaderFunction, LoaderFunctionArgs } from "@remix-run/server-runtime";

export const loader: LoaderFunction = ({ request }: LoaderFunctionArgs) => {
    const userId = requireUserId(request)
    return null
}

export default function ChannelsLayout() {
    return (
        <div className="flex h-full">
            <aside className="max-w-xs w-screen bg-background">aside</aside>
            <div className="flex-1 bg-muted"><Outlet /></div>
        </div>
    )
}
