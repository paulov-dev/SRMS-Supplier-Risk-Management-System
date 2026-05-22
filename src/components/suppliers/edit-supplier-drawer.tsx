"use client"

import { useState } from "react"

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function EditSupplierDrawer({
  supplier,
  open,
  onOpenChange,
  onSaved,
}: any) {
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState(
    supplier?.name || ""
  )

  async function handleSave() {
    setLoading(true)

    await fetch(`/api/suppliers/${supplier.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
      }),
    })

    setLoading(false)

    onSaved()

    onOpenChange(false)
  }

  if (!supplier) return null

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            Edit Supplier
          </DrawerTitle>
        </DrawerHeader>

        <div className="p-4 space-y-4">

          <Input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
          />

          <Button
            onClick={handleSave}
            disabled={loading}
          >
            Save
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}