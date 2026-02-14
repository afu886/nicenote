'use client'

import { cn } from '../../lib/utils'

type CardProps = React.ComponentPropsWithRef<'div'>
type CardItemGroupProps = React.ComponentPropsWithRef<'div'> & {
  orientation?: 'horizontal' | 'vertical'
}

function Card({ className, ref, ...props }: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-background shadow-sm',
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ref, ...props }: CardProps) {
  return (
    <div
      ref={ref}
      className={cn('border-b border-border bg-muted/30 px-4 py-3', className)}
      {...props}
    />
  )
}

function CardBody({ className, ref, ...props }: CardProps) {
  return <div ref={ref} className={cn('p-2', className)} {...props} />
}

function CardItemGroup({ className, orientation = 'vertical', ref, ...props }: CardItemGroupProps) {
  return (
    <div
      ref={ref}
      data-orientation={orientation}
      className={cn(
        'flex gap-1',
        orientation === 'vertical' ? 'flex-col' : 'flex-row items-center',
        className
      )}
      {...props}
    />
  )
}

function CardGroupLabel({ className, ref, ...props }: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'px-2 pt-3 pb-1 text-xs font-semibold text-muted-foreground capitalize',
        className
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ref, ...props }: CardProps) {
  return <div ref={ref} className={cn('p-4 pt-0', className)} {...props} />
}

export { Card, CardBody, CardFooter, CardGroupLabel, CardHeader, CardItemGroup }
