"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {

  const pathname = usePathname()

  const pathNames = pathname.split("/").filter(Boolean)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">

      <div className="flex w-full items-center gap-2 px-4 lg:px-6">

        <SidebarTrigger className="-ml-1" />

        <Separator
          orientation="vertical"
          className="mx-2 h-4"
        />

        <div className="flex items-center gap-2 text-sm">

          <Link
            href="/dashboard"
            className="font-medium hover:underline"
          >
            SRMS
          </Link>

          {pathNames.map((name, index) => {

            const href =
              "/" + pathNames.slice(0, index + 1).join("/")

            const formattedName =
              name.charAt(0).toUpperCase() + name.slice(1)

            return (
              <div
                key={href}
                className="flex items-center gap-2"
              >
                <span className="text-muted-foreground">
                  &gt;
                </span>

                <Link
                  href={href}
                  className="font-medium hover:underline"
                >
                  {formattedName}
                </Link>
              </div>
            )
          })}

        </div>



      </div>
    </header>
  )
}