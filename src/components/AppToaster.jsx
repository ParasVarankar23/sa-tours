"use client";

import { Toaster } from "react-hot-toast";

export default function AppToaster() {
    return (
        <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
                duration: 3000,
                style: {
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    background: "#ffffff",
                    color: "#111827",
                },
                success: {
                    iconTheme: {
                        primary: "#16a34a",
                        secondary: "#ffffff",
                    },
                },
                error: {
                    iconTheme: {
                        primary: "#dc2626",
                        secondary: "#ffffff",
                    },
                },
            }}
        />
    );
}
