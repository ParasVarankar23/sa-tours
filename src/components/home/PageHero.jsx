export default function PageHero({ title, subtitle }) {
    return (
        <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
            <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <p className="text-sm font-medium text-orange-300">SA Tours & Travels</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                    {subtitle}
                </p>
            </div>
        </section>
    );
}