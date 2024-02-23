import { action, useOptimisticThemeMode } from "#app/root"
import { Theme } from "#app/utils/theme.server"
import { useForm, getFormProps } from "@conform-to/react"
import { useFetcher } from "@remix-run/react"
import { Icon } from "./ui/icon"
import { useRequestInfo } from "#app/utils/request-info"

export default function ThemeSwitch() {
    const fetcher = useFetcher<typeof action>()

    const [form] = useForm({
        id: 'theme-switch',
        lastResult: fetcher.data?.result,
    })

    const requestInfo = useRequestInfo()
    const optimisticMode = useOptimisticThemeMode()
    const mode = optimisticMode ?? requestInfo.userPrefs.theme ?? 'system'
    const nextMode =
        mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'
    const modeLabel = {
        light: (
            <Icon name="sun">
                <span className="sr-only">Light</span>
            </Icon>
        ),
        dark: (
            <Icon name="moon">
                <span className="sr-only">Dark</span>
            </Icon>
        ),
        system: (
            <Icon name="laptop">
                <span className="sr-only">System</span>
            </Icon>
        ),
    }

    return (
        <fetcher.Form method="POST" action="/"{...getFormProps(form)}>
            <input type="hidden" name="theme" value={nextMode} />
            <div className="flex gap-2">
                <button
                    type="submit"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center"
                >
                    {modeLabel[mode]}
                </button>
            </div>
        </fetcher.Form>
    )
}

