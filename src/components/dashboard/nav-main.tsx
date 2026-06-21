"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { IconChevronRight } from "@tabler/icons-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

type PermissionRule = string | string[]

type NavItem = {
  title: string
  url: string
  icon?: React.ComponentType<{
    className?: string
  }>
  permission?: PermissionRule
  items?: NavItem[]
}

export function NavMain({
  items,
}: {
  items: NavItem[]
}) {
  const pathname = usePathname()

  function isItemActive(item: NavItem): boolean {
    if (item.url !== "#" && pathname === item.url) {
      return true
    }

    if (
      item.url !== "#" &&
      pathname.startsWith(`${item.url}/`)
    ) {
      return true
    }

    if (item.items?.length) {
      return item.items.some((subItem) =>
        isItemActive(subItem)
      )
    }

    return false
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon

          const hasSubItems =
            item.items && item.items.length > 0

          const active = isItemActive(item)

          if (hasSubItems) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={active}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={active}
                    >
                      {Icon && <Icon />}

                      <span>{item.title}</span>

                      <IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => {
                        const SubIcon = subItem.icon
                        const subActive =
                          isItemActive(subItem)

                        return (
                          <SidebarMenuSubItem
                            key={subItem.title}
                          >
                            <SidebarMenuSubButton
                              asChild
                              isActive={subActive}
                            >
                              <Link href={subItem.url}>
                                {SubIcon && (
                                  <SubIcon className="size-4" />
                                )}

                                <span>
                                  {subItem.title}
                                </span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={active}
              >
                <Link href={item.url}>
                  {Icon && <Icon />}

                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}