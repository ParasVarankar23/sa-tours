export default function SectionTitle({ eyebrow, title, subtitle, center = false }) {
    return (
        <div className={center ? "text-center" : ""}>
            {eyebrow && (
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                    {eyebrow}
                </p>
            )}
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {title}
            </h2>
            {subtitle && (
                <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                    {subtitle}
                </p>
            )}
        </div>
    );
}