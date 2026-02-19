import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useMemo,
  useState,
} from 'react'

import {
  autoUpdate,
  flip,
  FloatingDelayGroup,
  FloatingPortal,
  offset,
  type Placement,
  type ReferenceType,
  shift,
  useDismiss,
  useFloating,
  type UseFloatingReturn,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
} from '@floating-ui/react'

import { cn } from '../../lib/utils'

interface TooltipProviderProps {
  children: React.ReactNode
  initialOpen?: boolean
  placement?: Placement
  open?: boolean
  onOpenChange?: (open: boolean) => void
  delay?: number
  closeDelay?: number
  timeout?: number
  useDelayGroup?: boolean
}

interface TooltipTriggerProps extends Omit<React.HTMLProps<HTMLElement>, 'ref'> {
  asChild?: boolean
  children: React.ReactNode
}

interface TooltipContentProps extends Omit<React.HTMLProps<HTMLDivElement>, 'ref'> {
  children?: React.ReactNode
  portal?: boolean
  portalProps?: Omit<React.ComponentProps<typeof FloatingPortal>, 'children'>
}

interface TooltipContextValue extends UseFloatingReturn<ReferenceType> {
  open: boolean
  setOpen: (open: boolean) => void
  getReferenceProps: (userProps?: React.HTMLProps<HTMLElement>) => Record<string, unknown>
  getFloatingProps: (userProps?: React.HTMLProps<HTMLDivElement>) => Record<string, unknown>
}

function useTooltip({
  initialOpen = false,
  placement = 'top',
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  delay = 600,
  closeDelay = 0,
}: Omit<TooltipProviderProps, 'children'> = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(initialOpen)

  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = setControlledOpen ?? setUncontrolledOpen

  const data = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({
        crossAxis: placement.includes('-'),
        fallbackAxisSideDirection: 'start',
        padding: 4,
      }),
      shift({ padding: 4 }),
    ],
  })

  const context = data.context

  const hover = useHover(context, {
    mouseOnly: true,
    move: false,
    restMs: delay,
    enabled: controlledOpen == null,
    delay: {
      close: closeDelay,
    },
  })
  const focus = useFocus(context, {
    enabled: controlledOpen == null,
  })
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'tooltip' })

  const interactions = useInteractions([hover, focus, dismiss, role])

  return useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
    }),
    [open, setOpen, interactions, data]
  )
}

const TooltipContext = createContext<TooltipContextValue | null>(null)

function useTooltipContext() {
  const context = useContext(TooltipContext)

  if (context == null) {
    throw new Error('Tooltip components must be wrapped in <TooltipProvider />')
  }

  return context
}

export function Tooltip({ children, ...props }: TooltipProviderProps) {
  const tooltip = useTooltip(props)

  if (!props.useDelayGroup) {
    return <TooltipContext.Provider value={tooltip}>{children}</TooltipContext.Provider>
  }

  return (
    <FloatingDelayGroup
      delay={{ open: props.delay ?? 0, close: props.closeDelay ?? 0 }}
      {...(props.timeout === undefined ? {} : { timeoutMs: props.timeout })}
    >
      <TooltipContext.Provider value={tooltip}>{children}</TooltipContext.Provider>
    </FloatingDelayGroup>
  )
}

export const TooltipTrigger = forwardRef<HTMLElement, TooltipTriggerProps>(function TooltipTrigger(
  { children, asChild = false, ...props },
  propRef
) {
  const context = useTooltipContext()
  const childrenRef = isValidElement(children)
    ? (children as { props: { ref?: React.Ref<unknown> } }).props.ref
    : undefined
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef])

  if (asChild && isValidElement(children)) {
    const dataAttributes = {
      'data-tooltip-state': context.open ? 'open' : 'closed',
    }

    return cloneElement(
      children,
      context.getReferenceProps({
        ref,
        ...props,
        ...(typeof children.props === 'object' ? children.props : {}),
        ...dataAttributes,
      })
    )
  }

  return (
    <button
      type="button"
      ref={ref}
      data-tooltip-state={context.open ? 'open' : 'closed'}
      className="tiptap-tooltip-trigger inline-flex items-center justify-center"
      {...context.getReferenceProps(props)}
    >
      {children}
    </button>
  )
})

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  function TooltipContent({ style, children, portal = true, portalProps = {}, ...props }, propRef) {
    const context = useTooltipContext()
    const ref = useMergeRefs([context.refs.setFloating, propRef])

    if (!context.open) return null

    const content = (
      <div
        ref={ref}
        style={{
          ...context.floatingStyles,
          ...style,
        }}
        {...context.getFloatingProps(props)}
        className={cn(
          'tiptap-tooltip animate-in fade-in-0 zoom-in-95 z-50 overflow-hidden rounded-md bg-muted/90 px-3 py-1.5 text-xs text-foreground',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
        )}
      >
        {children}
      </div>
    )

    if (portal) {
      return <FloatingPortal {...portalProps}>{content}</FloatingPortal>
    }

    return content
  }
)

Tooltip.displayName = 'Tooltip'
TooltipTrigger.displayName = 'TooltipTrigger'
TooltipContent.displayName = 'TooltipContent'
