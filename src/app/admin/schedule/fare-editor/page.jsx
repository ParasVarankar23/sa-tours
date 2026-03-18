import { Suspense } from "react";
import FareEditorPage from "@/components/admin/FareEditorPage";

export default function Page() {
    return (
        <Suspense fallback={<div className="p-6">Loading edit schedule...</div>}>
            <FareEditorPage />
        </Suspense>
    );
}