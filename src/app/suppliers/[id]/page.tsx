"use client"

import { useEffect, useState } from "react"

import { useParams } from "next/navigation"

import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"

export default function SupplierEditPage() {
  const params = useParams()

  const [supplier, setSupplier] =
    useState<any>(null)

  const [loading, setLoading] =
    useState(false)

  async function loadSupplier() {
    const res = await fetch(
      `/api/suppliers/${params.id}`
    )

    const data = await res.json()

    setSupplier(data)
  }

  useEffect(() => {
    loadSupplier()
  }, [])

  async function handleSave() {
    setLoading(true)

    await fetch(
      `/api/suppliers/${params.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(supplier),
      }
    )

    setLoading(false)
  }

  if (!supplier) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-semibold">
          Edit Supplier
        </h1>

        <p className="text-muted-foreground">
          Manage supplier information
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">

        <div className="space-y-2">
          <label>Name</label>

          <Input
            value={supplier.name}
            onChange={(e) =>
              setSupplier({
                ...supplier,
                name: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <label>SAP Code</label>

          <Input
            value={supplier.supplierCodeSap}
            onChange={(e) =>
              setSupplier({
                ...supplier,
                supplierCodeSap:
                  e.target.value,
              })
            }
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={loading}
      >
        Save Changes
      </Button>
    </div>
  )
}