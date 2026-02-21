'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  Placement,
  FloatingPortal,
  useFloatingNodeId,
} from '@floating-ui/react';

interface PopoverProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  nodeId: string;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) {
    throw new Error('Popover components must be used within a Popover');
  }
  return ctx;
}

const Popover = React.forwardRef<HTMLDivElement, PopoverProps>(
  ({ className, open, onOpenChange, children, ...props }, ref) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const isControlled = typeof open === 'boolean';
    const actualOpen = isControlled ? (open as boolean) : uncontrolledOpen;
    const nodeId = useFloatingNodeId();

    const setOpen = React.useCallback(
      (next: boolean) => {
        if (!isControlled) {
          setUncontrolledOpen(next);
        }
        onOpenChange?.(next);
      },
      [isControlled, onOpenChange],
    );

    return (
      <PopoverContext.Provider value={{ open: actualOpen, setOpen, nodeId: nodeId || '' }}>
        <div
          ref={ref}
          className={cn('relative', className)}
          data-popover-node-id={nodeId}
          {...props}
        >
          {children}
        </div>
      </PopoverContext.Provider>
    );
  },
);
Popover.displayName = 'Popover';

// PopoverTrigger with proper ref handling for floating-ui
const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
  const ctx = usePopoverContext();
  const [triggerNode, setTriggerNode] = React.useState<HTMLElement | null>(null);

  // Merge external ref with internal trigger ref
  const handleRef = React.useCallback((node: HTMLButtonElement | null) => {
    setTriggerNode(node);
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    }
  }, [ref]);

  // Handle asChild pattern
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref: handleRef,
      'data-popover-trigger': ctx.nodeId,
      'data-popover-node-id': ctx.nodeId,
      onClick: (e: React.MouseEvent) => {
        (children.props as any)?.onClick?.(e);
        if (!e.defaultPrevented) {
          ctx.setOpen(!ctx.open);
        }
      },
    });
  }

  return (
    <button
      ref={handleRef}
      type={props.type ?? 'button'}
      className={cn('', className)}
      aria-expanded={ctx.open}
      data-popover-trigger={ctx.nodeId}
      data-popover-node-id={ctx.nodeId}
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.defaultPrevented) {
          ctx.setOpen(!ctx.open);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
});
PopoverTrigger.displayName = 'PopoverTrigger';

// Enhanced PopoverContent with Floating UI for perfect positioning
const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: 'start' | 'center' | 'end';
    side?: 'top' | 'bottom' | 'left' | 'right';
    sideOffset?: number;
  }
>(({
  className,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  children,
  style,
  ...props
}, ref) => {
  const ctx = usePopoverContext();
  const nodeId = ctx.nodeId;

  // Build placement string from side and align (e.g., 'bottom-start', 'bottom-end')
  const placement = align === 'start'
    ? `${side}-start`
    : align === 'end'
      ? `${side}-end`
      : side;

  // Find trigger element by nodeId
  const [triggerElement, setTriggerElement] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!ctx.open) return;
    const trigger = document.querySelector(
      `[data-popover-trigger="${nodeId}"], [data-popover-node-id="${nodeId}"]`
    ) as HTMLElement | null;
    if (trigger) setTriggerElement(trigger);
  }, [ctx.open, nodeId]);

  // strategy:'fixed' escapes overflow:hidden modal containers.
  // On iOS Safari the visual viewport can differ from layout viewport when the
  // keyboard is open; shift with generous padding keeps the popover on-screen.
  const {
    refs,
    floatingStyles,
    placement: actualPlacement,
  } = useFloating({
    nodeId,
    open: ctx.open,
    placement: placement as Placement,
    middleware: [
      offset(sideOffset),
      flip({
        fallbackPlacements: [
          'top-start', 'top-end', 'top',
          'bottom-start', 'bottom-end', 'bottom',
          'left-start', 'right-start',
        ],
        // Extra padding so the calendar never clips the viewport edge on mobile
        padding: 12,
      }),
      shift({
        // 16px breathing room from every viewport edge (safe-area aware)
        padding: 16,
      }),
    ],
    whileElementsMounted: ctx.open ? autoUpdate : undefined,
    strategy: 'fixed',
  });

  // Update reference when trigger element changes
  React.useEffect(() => {
    if (triggerElement && refs.setReference) {
      refs.setReference(triggerElement);
    }
  }, [triggerElement, refs]);

  // Set floating ref
  const handleFloatingRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      refs.setFloating(node);
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [refs, ref],
  );

  if (!ctx.open) {
    return null;
  }

  // Render via FloatingPortal to avoid layout shifts
  return (
    <FloatingPortal>
      <div
        ref={handleFloatingRef}
        className={cn(
          // z-index above modal overlays (modal is typically z-50)
          'z-[99999] w-auto',
          // Constrain width to viewport on mobile — prevents horizontal overflow
          'max-w-[min(90vw,_560px)]',
          'rounded-md border bg-white shadow-2xl',
          // Allow internal scroll if calendar is taller than available space
          'max-h-[min(80vh,_520px)] overflow-y-auto overflow-x-hidden',
          'pointer-events-auto',
          className,
        )}
        style={{
          ...floatingStyles,
          // Respect iOS safe-area insets so the popover never hides behind
          // the home indicator or notch
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          ...style,
        }}
        data-popover-content={nodeId}
        data-placement={actualPlacement}
        {...props}
      >
        {children}
      </div>
    </FloatingPortal>
  );
});
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };
