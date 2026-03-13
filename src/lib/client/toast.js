"use client";

import { toast } from "sonner";

export function showAppToast(type, text) {
    const message = String(text || "").trim();
    if (!message) return;

    if (type === "success") {
        toast.success(message);
        return;
    }

    if (type === "error") {
        toast.error(message);
        return;
    }

    if (type === "warning") {
        toast.warning(message);
        return;
    }

    toast(message);
}
