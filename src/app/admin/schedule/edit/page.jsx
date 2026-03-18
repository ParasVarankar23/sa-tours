import { Suspense } from "react";
import EditScheduleClient from "@/components/admin/EditScheduleClient";

export default function Page() {
    return (
        <Suspense fallback={<div className="p-6">Loading edit schedule...</div>}>
            <EditScheduleClient />
        </Suspense>
    );
}