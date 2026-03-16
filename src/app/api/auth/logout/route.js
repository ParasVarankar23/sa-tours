export async function POST(request) {
    try {
        // Logout is handled client-side by removing localStorage items
        // This route is here for consistency and future server-side logout logic if needed

        return Response.json(
            {
                success: true,
                message: "Logged out successfully",
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Logout error:", error);

        return Response.json(
            { error: "Logout failed" },
            { status: 500 }
        );
    }
}
