import {
	type LoaderFunction,
	type LoaderFunctionArgs,
	redirect,
} from '@remix-run/server-runtime'
import { getUserId } from '#app/utils/auth.server'

export const loader: LoaderFunction = async ({
	request,
}: LoaderFunctionArgs) => {
	const userId = await getUserId(request)
	if (userId) return redirect('/channels')
	return redirect('/public')
}

export default function Index() {
	return <></>
}
