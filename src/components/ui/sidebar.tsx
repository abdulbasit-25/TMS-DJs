import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeftClose, PanelLeftOpen, ShieldAlert } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

/* ============================================================================
   Provider
   ========================================================================== */

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);

    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`;
      },
      [setOpenProp, open],
    );

    const toggleSidebar = React.useCallback(() => {
      return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
    }, [isMobile, setOpen, setOpenMobile]);

    // Case-insensitive so Shift+⌘B / CapsLock also work.
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault();
          toggleSidebar();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    const state = open ? "expanded" : "collapsed";

    const contextValue = React.useMemo<SidebarContextProps>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            data-slot="sidebar-wrapper"
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
              className,
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  },
);
SidebarProvider.displayName = "SidebarProvider";

/* ============================================================================
   Sidebar shell
   ========================================================================== */

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset";
    collapsible?: "offcanvas" | "icon" | "none";
  }
>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (collapsible === "none") {
      return (
        <div
          data-slot="sidebar"
          className={cn(
            "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
            className,
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      );
    }

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            data-sidebar="sidebar"
            data-mobile="true"
            className="w-(--sidebar-width) border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl [&>button]:hidden"
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
              } as React.CSSProperties
            }
            side={side}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Sidebar</SheetTitle>
              <SheetDescription>Displays the mobile sidebar.</SheetDescription>
            </SheetHeader>
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <div
        ref={ref}
        data-slot="sidebar"
        className="group peer hidden text-sidebar-foreground md:block"
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
      >
        {/* Handles the sidebar gap on desktop */}
        <div
          className={cn(
            "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
            "group-data-[collapsible=offcanvas]:w-0",
            "group-data-[side=right]:rotate-180",
            variant === "floating" || variant === "inset"
              ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_--spacing(4))]"
              : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
          )}
        />
        <div
          className={cn(
            "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
            side === "left"
              ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
              : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
            variant === "floating" || variant === "inset"
              ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_--spacing(4)_+2px)]"
              : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
            className,
          )}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className={cn(
              "relative flex h-full w-full flex-col bg-sidebar",
              // Elegant edge: soft gradient hairline instead of flat border color
              "after:pointer-events-none after:absolute after:inset-y-0 after:w-px after:bg-gradient-to-b after:from-transparent after:via-sidebar-border after:to-transparent",
              side === "left" ? "after:right-0" : "after:left-0",
              // Flat variant draws its own border; avoid doubling up
              variant === "sidebar" &&
                "group-data-[side=left]:after:hidden group-data-[side=right]:after:hidden",
              "group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-lg group-data-[variant=floating]:shadow-black/5",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    );
  },
);
Sidebar.displayName = "Sidebar";

/* ============================================================================
   Triggers
   ========================================================================== */

const SidebarTrigger = React.forwardRef<
  React.ComponentRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar, state } = useSidebar();

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn(
        "size-7 rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      {state === "expanded" ? (
        <PanelLeftClose className="size-4" />
      ) : (
        <PanelLeftOpen className="size-4" />
      )}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarClose = React.forwardRef<
  React.ComponentRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar, state } = useSidebar();

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-sidebar="collapse"
      data-slot="sidebar-close"
      className={cn(
        "size-8 rounded-lg text-sidebar-foreground/70 transition-all duration-200 hover:scale-105 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        className,
      )}
      onClick={(e) => {
        onClick?.(e);
        toggleSidebar();
      }}
      {...props}
    >
      {state === "expanded" ? (
        <PanelLeftClose className="size-4" />
      ) : (
        <PanelLeftOpen className="size-4" />
      )}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarClose.displayName = "SidebarClose";

const SidebarRail = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button">>(
  ({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar();

    return (
      <button
        ref={ref}
        data-sidebar="rail"
        data-slot="sidebar-rail"
        aria-label="Toggle Sidebar"
        tabIndex={-1}
        onClick={toggleSidebar}
        title="Toggle Sidebar"
        className={cn(
          "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
          "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
          "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
          "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:hover:bg-sidebar",
          "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
          "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
          // Hover handle: rounded pill grows + fades in
          "after:absolute after:inset-y-auto after:top-1/2 after:left-1/2 after:h-14 after:w-[3px] after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-sidebar-border after:opacity-0 after:transition-all after:duration-200",
          "hover:after:h-20 hover:after:opacity-100",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarRail.displayName = "SidebarRail";

/* ============================================================================
   Layout primitives
   ========================================================================== */

const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<"main">>(
  ({ className, ...props }, ref) => {
    return (
      <main
        ref={ref}
        data-slot="sidebar-inset"
        className={cn(
          "relative flex w-full flex-1 flex-col bg-background",
          "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm",
          "md:transition-[margin] md:duration-200 md:ease-linear",
          "md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarInset.displayName = "SidebarInset";

const SidebarInput = React.forwardRef<
  React.ComponentRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-sidebar="input"
      data-slot="sidebar-input"
      className={cn(
        "h-8 w-full rounded-lg bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className,
      )}
      {...props}
    />
  );
});
SidebarInput.displayName = "SidebarInput";

const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="header"
        data-slot="sidebar-header"
        className={cn("flex flex-col gap-2 p-2", className)}
        {...props}
      />
    );
  },
);
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="footer"
        data-slot="sidebar-footer"
        className={cn("flex flex-col gap-2 p-2", className)}
        {...props}
      />
    );
  },
);
SidebarFooter.displayName = "SidebarFooter";

const SidebarSeparator = React.forwardRef<
  React.ComponentRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      data-slot="sidebar-separator"
      className={cn(
        "mx-2 w-auto bg-gradient-to-r from-transparent via-sidebar-border to-transparent",
        className,
      )}
      {...props}
    />
  );
});
SidebarSeparator.displayName = "SidebarSeparator";

const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="content"
        data-slot="sidebar-content"
        className={cn(
          "scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarContent.displayName = "SidebarContent";

/* ============================================================================
   Groups
   ========================================================================== */

const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="group"
        data-slot="sidebar-group"
        className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
        {...props}
      />
    );
  },
);
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      data-slot="sidebar-group-label"
      className={cn(
        "flex h-8 shrink-0 select-none items-center gap-2 rounded-md px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-3.5 [&>svg]:shrink-0",
        // Hairline rule trailing the label — reads as a section header
        "after:h-px after:flex-1 after:bg-gradient-to-r after:from-sidebar-border after:to-transparent",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className,
      )}
      {...props}
    />
  );
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      data-slot="sidebar-group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 cursor-pointer items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 after:md:hidden",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
});
SidebarGroupAction.displayName = "SidebarGroupAction";

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar="group-content"
      data-slot="sidebar-group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  ),
);
SidebarGroupContent.displayName = "SidebarGroupContent";

/* ============================================================================
   Menus
   ========================================================================== */

const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      data-sidebar="menu"
      data-slot="sidebar-menu"
      className={cn("flex w-full min-w-0 flex-col gap-0.5", className)}
      {...props}
    />
  ),
);
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ className, ...props }, ref) => (
    <li
      ref={ref}
      data-sidebar="menu-item"
      data-slot="sidebar-menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  ),
);
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
  "peer/menu-button relative flex w-full cursor-pointer items-center gap-2.5 overflow-hidden rounded-lg p-2 text-left text-sm outline-none ring-sidebar-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8",
  [
    // Full transition: geometry + color + icon micro-motion
    "transition-[width,height,padding,background-color,color,box-shadow] duration-200 ease-out",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    // Icons get a tiny lift on hover — subtle "alive" feel
    "[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:transition-transform [&>svg]:duration-200",
    "hover:[&>svg]:scale-110",
    "focus-visible:ring-2",
    "active:bg-sidebar-accent active:text-sidebar-accent-foreground",
    // Active: gradient tint + brand indicator bar (inset shadow follows radius)
    "data-[active=true]:bg-gradient-to-r data-[active=true]:from-sidebar-accent data-[active=true]:to-transparent",
    "data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
    "data-[active=true]:shadow-[inset_2px_0_0_0_var(--color-brand)]",
    "group-data-[collapsible=icon]:data-[active=true]:shadow-none",
    "data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground",
    // Collapsed icon mode — trailing "!" (Tailwind v4 syntax)
    "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:p-2! group-data-[collapsible=icon]:hover:[&>svg]:scale-100!",
    // Label fades instead of hard-clipping
    "[&>span:last-child]:truncate [&>span:last-child]:transition-opacity [&>span:last-child]:duration-150",
    "group-data-[collapsible=icon]:[&>span:last-child]:opacity-0",
  ],
  {
    variants: {
      variant: {
        default: "",
        outline:
          "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]",
      },
      size: {
        default: "h-9 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const { isMobile, state } = useSidebar();

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-slot="sidebar-menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    );

    if (!tooltip) {
      return button;
    }

    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip,
      };
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
          {...tooltip}
        />
      </Tooltip>
    );
  },
);
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    showOnHover?: boolean;
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      data-slot="sidebar-menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 cursor-pointer items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1",
        "peer-data-[size=lg]/menu-button:top-3.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className,
      )}
      {...props}
    />
  );
});
SidebarMenuAction.displayName = "SidebarMenuAction";

const SidebarMenuBadge = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar="menu-badge"
      data-slot="sidebar-menu-badge"
      className={cn(
        "pointer-events-none absolute right-1.5 flex h-5 min-w-5 select-none items-center justify-center rounded-full bg-sidebar-accent px-1.5 text-[11px] font-semibold tabular-nums text-sidebar-accent-foreground shadow-sm",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-2",
        "peer-data-[size=lg]/menu-button:top-3.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  ),
);
SidebarMenuBadge.displayName = "SidebarMenuBadge";

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean;
  }
>(({ className, showIcon = false, ...props }, ref) => {
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      data-slot="sidebar-menu-skeleton"
      className={cn("flex h-9 items-center gap-2.5 rounded-lg px-2", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
          data-slot="sidebar-menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        data-slot="sidebar-menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  );
});
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";

const SidebarMenuSub = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      className={cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-0.5 border-l border-sidebar-border px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  ),
);
SidebarMenuSub.displayName = "SidebarMenuSub";

const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ ...props }, ref) => <li ref={ref} data-slot="sidebar-menu-sub-item" {...props} />,
);
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean;
    size?: "sm" | "md";
    isActive?: boolean;
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-slot="sidebar-menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

/* ============================================================================
   App-level: brand header + ADMIN NAV (Delete Panel)
   Built from the primitives above — safe to edit freely.
   ========================================================================== */

const DELETION_ROUTE = "/admin/data-deletion";

export function SidebarBrand({
  name = "TMS Freight Portal",
  subtitle = "Secure Agent Portal · TMS",
  icon,
  href = "/dashboard",
}: {
  name?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  href?: string;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Link
      to={href}
      className="flex items-center gap-2.5 rounded-lg p-1.5 outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-2"
    >
      {/* Logo tile: gradient + top sheen + brand glow */}
      <div className="relative shrink-0">
        <div className="absolute -inset-0.5 rounded-lg bg-[var(--color-brand)] opacity-30 blur-[6px]" />
        <div className="relative grid size-8 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-[var(--color-brand)] to-[var(--plum-600)] text-white shadow-md">
          {icon ?? <ShieldAlert className="size-4" />}
          {/* sheen */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
        </div>
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">{name}</div>
          <div className="truncate text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/50">
            {subtitle}
          </div>
        </div>
      )}
    </Link>
  );
}

export function SidebarAdminSection() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        {/* Label + trailing hairline (from the primitive) */}
        Administration
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="default"
              tooltip="Delete Panel"
              className={cn(
                // Destructive personality: only wakes up on hover/active
                "text-sidebar-foreground/90",
                "hover:bg-[color-mix(in_oklab,var(--color-danger)_12%,transparent)] hover:text-[var(--color-danger)]",
                "data-[active=true]:bg-[color-mix(in_oklab,var(--color-danger)_14%,transparent)] data-[active=true]:text-[var(--color-danger)]",
                "data-[active=true]:shadow-[inset_2px_0_0_0_var(--color-danger)]",
                "group-data-[collapsible=icon]:data-[active=true]:shadow-none",
              )}
            >
              <Link to={DELETION_ROUTE} activeOptions={{ exact: false }}>
                <Trash2 className="size-4" />
                <span>Delete Panel</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/* ============================================================================
   Exports
   ========================================================================== */

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  SidebarClose,
  useSidebar,
};
