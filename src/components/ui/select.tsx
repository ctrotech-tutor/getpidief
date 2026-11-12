"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { Check as CheckIcon, CaretDown as ChevronDownIcon, CaretUp as ChevronUpIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return <SelectPrimitive.Trigger data-slot="select-trigger" className={cn("flex w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate", className)} {...props}>
    {children}<SelectPrimitive.Icon asChild><ChevronDownIcon className="size-4 shrink-0 opacity-60" /></SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>;
}
function SelectContent({ className, children, position = "popper", ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return <SelectPrimitive.Portal><SelectPrimitive.Content data-slot="select-content" position={position} sideOffset={5} className={cn("relative z-50 max-h-[min(280px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg", className)} {...props}>
    <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1"><ChevronUpIcon className="size-4" /></SelectPrimitive.ScrollUpButton>
    <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1"><ChevronDownIcon className="size-4" /></SelectPrimitive.ScrollDownButton>
  </SelectPrimitive.Content></SelectPrimitive.Portal>;
}
function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return <SelectPrimitive.Item data-slot="select-item" className={cn("relative flex w-full cursor-default select-none items-center rounded-lg py-2.5 pl-3 pr-9 text-sm outline-none data-[highlighted]:bg-accent data-[disabled]:opacity-50", className)} {...props}>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <span className="absolute right-3 flex items-center"><SelectPrimitive.ItemIndicator><CheckIcon className="size-4" /></SelectPrimitive.ItemIndicator></span>
  </SelectPrimitive.Item>;
}
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
