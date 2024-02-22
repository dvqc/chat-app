import { type MetaFunction } from '@remix-run/node'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { cn } from '#app/utils/misc.tsx'
import { Icon } from '#app/components/ui/icon'

export const meta: MetaFunction = () => [{ title: 'Chat App | Dev Challenges' }]

// Tailwind Grid cell classes lookup
const columnClasses: Record<(typeof logos)[number]['column'], string> = {
    1: 'xl:col-start-1',
    2: 'xl:col-start-2',
    3: 'xl:col-start-3',
    4: 'xl:col-start-4',
    5: 'xl:col-start-5',
}
const rowClasses: Record<(typeof logos)[number]['row'], string> = {
    1: 'xl:row-start-1',
    2: 'xl:row-start-2',
    3: 'xl:row-start-3',
    4: 'xl:row-start-4',
    5: 'xl:row-start-5',
    6: 'xl:row-start-6',
}

export default function Index() {
    return (
        <main className="font-poppins grid h-full place-items-center">
            <div className="grid place-items-center px-4 py-16 xl:grid-cols-2 xl:gap-24">
                <div className="flex max-w-md flex-col items-center text-center xl:order-2 xl:items-start xl:text-left">
                    <a
                        href='https://legacy.devchallenges.io/challenges/UgCqszKR7Q7oqb4kRfI0#'
                        target='_blank'
                        className="animate-slide-top [animation-fill-mode:backwards] xl:animate-slide-left xl:[animation-delay:0.5s] xl:[animation-fill-mode:backwards]"
                    >
                        <Icon name='logo' className='w-36 h-36' />
                    </a>
                    <h1
                        data-heading
                        className="mt-8 animate-slide-top text-4xl font-medium text-foreground [animation-fill-mode:backwards] [animation-delay:0.3s] md:text-5xl xl:mt-4 xl:animate-slide-left xl:text-6xl xl:[animation-fill-mode:backwards] xl:[animation-delay:0.8s]"
                    >
                        Chat App
                    </h1>
                    <p
                        data-paragraph
                        className="mt-6 animate-slide-top text-xl/7 text-muted-foreground [animation-fill-mode:backwards] [animation-delay:0.8s] xl:mt-8 xl:animate-slide-left xl:text-xl/6 xl:leading-10 xl:[animation-fill-mode:backwards] xl:[animation-delay:1s]"
                    >
                        This web app is built using{' '}
                        <a href="https://www.epicweb.dev/stack"
                            className="underline hover:no-underline"
                        >
                            The Epic Stack
                        </a>{' '}
                    </p>
                </div>
            </div>
        </main>
    )
}
