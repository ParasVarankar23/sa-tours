"use client";

import { toast } from "react-hot-toast";

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
        // react-hot-toast doesn't have toast.warning by default — use generic toast with styling
        toast(message, { icon: "⚠️" });
        return;
    }

    toast(message);
}
