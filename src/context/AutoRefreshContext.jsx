"use client"

import { useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect } from "react"

const AutoRefreshContext = createContext()

export function AutoRefreshProvider({ children }) {
    const router = useRouter()

    useEffect(() => {
        const handle = () => {
            try {
                // Prefer router.refresh() for app-router server-component refresh
                router.refresh()
            } catch (e) {
                // Fallback to full reload
                window.location.reload()
            }
        }

        // BroadcastChannel for cross-tab communication (modern browsers)
        let bc = null
        try {
            if (typeof BroadcastChannel !== "undefined") {
                bc = new BroadcastChannel("upsc_auto_refresh")
                bc.onmessage = (ev) => {
                    if (ev?.data === "refresh") handle()
                }
            }
        } catch (e) {
            bc = null
        }

        // storage event fallback (works across tabs)
        const onStorage = (e) => {
            if (e.key === "upsc_auto_refresh" && e.newValue) handle()
        }
        window.addEventListener("storage", onStorage)

        // Note: we intentionally do NOT refresh on visibility change
        // (avoids unexpected reloads when switching tabs)

        return () => {
            if (bc) bc.close()
            window.removeEventListener("storage", onStorage)
            // nothing to remove for visibilitychange
        }
    }, [router])

    const triggerRefresh = useCallback(() => {
        try {
            if (typeof BroadcastChannel !== "undefined") {
                const b = new BroadcastChannel("upsc_auto_refresh")
                b.postMessage("refresh")
                b.close()
                return
            }
        } catch (e) {
            // ignore and fallback to storage
        }

        try {
            localStorage.setItem("upsc_auto_refresh", String(Date.now()))
        } catch (e) {
            // last resort: reload current window
            window.location.reload()
        }
    }, [])

    const subscribeRefresh = useCallback((cb) => {
        if (typeof cb !== "function") return () => { }

        let bc = null
        try {
            if (typeof BroadcastChannel !== "undefined") {
                bc = new BroadcastChannel("upsc_auto_refresh")
                bc.onmessage = (ev) => {
                    if (ev?.data === "refresh") cb()
                }
            }
        } catch (e) {
            bc = null
        }

        const onStorage = (e) => {
            if (e.key === "upsc_auto_refresh" && e.newValue) cb()
        }
        window.addEventListener("storage", onStorage)

        return () => {
            if (bc) bc.close()
            window.removeEventListener("storage", onStorage)
        }
    }, [])

    return (
        <AutoRefreshContext.Provider value={{ triggerRefresh, subscribeRefresh }}>
            {children}
        </AutoRefreshContext.Provider>
    )
}

export function useAutoRefresh() {
    const ctx = useContext(AutoRefreshContext)
    if (!ctx) throw new Error("useAutoRefresh must be used within AutoRefreshProvider")
    return ctx
}

export default AutoRefreshContext