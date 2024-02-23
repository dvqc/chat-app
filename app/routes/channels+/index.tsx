import { requireUserId } from "#app/utils/auth.server";
import { type LoaderFunctionArgs, type LoaderFunction } from "@remix-run/server-runtime";

export const loader: LoaderFunction = ({ request }: LoaderFunctionArgs) => {
    const userId = requireUserId(request)
    return null
}

export default function ChannelsRoute() {
    return (
        <div className="text-4xl text-white">Channels</div>
    )
}
