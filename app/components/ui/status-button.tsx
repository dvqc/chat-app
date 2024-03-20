import * as React from 'react'
import { useSpinDelay } from 'spin-delay'
import { cn } from '#app/utils/misc.tsx'
import { Button, type ButtonProps } from './button.tsx'
import { Icon, IconName } from './icon.tsx'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './tooltip.tsx'

export const StatusButton = React.forwardRef<
    HTMLButtonElement,
    ButtonProps & {
        status: 'pending' | 'success' | 'error' | 'idle'
        message?: string | null
        spinDelay?: Parameters<typeof useSpinDelay>[1]
        idleIcon?: IconName
    }
>(({ message, status, className, children, spinDelay, idleIcon, ...props }, ref) => {
    const delayedPending = useSpinDelay(status === 'pending', {
        delay: 400,
        minDuration: 300,
        ...spinDelay,
    })

    const idle = idleIcon ? <div className="inline-flex h-6 w-6 items-center justify-center">
        <Icon name={idleIcon} />
    </div>
        : null
    
    const companion = {
        pending: delayedPending ? (
            <div className="inline-flex h-6 w-6 items-center justify-center">
                <Icon name="update" className="animate-spin" />
            </div>
        ) : idle,
        success: (
            <div className="inline-flex h-6 w-6 items-center justify-center">
                <Icon name="check" />
            </div>
        ),
        error: (
            <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive">
                <Icon name="cross-1" className="text-destructive-foreground" />
            </div>
        ),
        idle
    }[status]

    return (
        <Button
            ref={ref}
            className={cn('flex justify-center gap-4', className)}
            {...props}
        >
            {message ? (
                <>
                    {children}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>{companion}</TooltipTrigger>
                            <TooltipContent>{message}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </>
            ) :
                <>{children} {companion}</>
            }
        </Button>
    )
})
StatusButton.displayName = 'Button'
