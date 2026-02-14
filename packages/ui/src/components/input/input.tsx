import { cn } from '../../lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'tiptap-input flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

function InputGroup({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('tiptap-input-group relative flex w-full items-center', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Input, InputGroup }
