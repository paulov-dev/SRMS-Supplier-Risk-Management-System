export const announcementCategories = [
    "Geral",
    "Risk",
    "Logística",
    "Sistema",
] as const

export type AnnouncementItem = {
    id: string
    title: string
    content: string
    category: string
    pinned: boolean
    archived: boolean
    createdAt: string
    updatedAt: string

    author: {
        name: string
    }
}

export function announcementInput(value: unknown) {
    if (!value || typeof value !== "object") {
        throw new Error("INVALID_INPUT")
    }

    const body = value as Record<string, unknown>

    if (
        typeof body.title !== "string" ||
        !body.title.trim() ||
        body.title.trim().length > 120 ||

        typeof body.content !== "string" ||
        !body.content.trim() ||
        body.content.trim().length > 10000 ||

        !announcementCategories.includes(
            body.category as
                typeof announcementCategories[number]
        ) ||

        typeof body.pinned !== "boolean" ||
        typeof body.archived !== "boolean"
    ) {
        throw new Error("INVALID_INPUT")
    }

    return {
        title: body.title.trim(),
        content: body.content.trim(),
        category: body.category as string,
        pinned: body.pinned,
        archived: body.archived,
    }
}