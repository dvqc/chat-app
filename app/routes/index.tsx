import { getUserId } from "#app/utils/auth.server"
import { LoaderFunction, LoaderFunctionArgs, redirect } from "@remix-run/server-runtime"

export const loader: LoaderFunction = async ({ request }: LoaderFunctionArgs) => {
    const userId = await getUserId(request)
    if (userId)
        return redirect('/channels')
    return redirect('/public')
}

export default function Index() { return <></> }

