export default function ProfilePage() {
    return (
        <section className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
            <div className="mt-4">
                <p className="text-slate-600">Name: [User Name]</p>
                <p className="text-slate-600">Email: [User Email]</p>
                <p className="text-slate-600">Role: [User Role]</p>
            </div>
        </section>
    );
}

