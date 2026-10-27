import { Skeleton } from "@/components/ui/Marks";

// Flat blocks in the shape of the catalogue: masthead, filter rows, card
// grid. No shimmer gradients (DESIGN.md).
export default function CatalogLoading() {
    return (
        <div className="mx-auto w-full max-w-[84rem] px-4 pb-16 sm:px-6 lg:px-10">
            <header className="pt-12 lg:pt-20">
                <div className="border-b border-line pb-5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="mt-3 h-9 w-72 max-w-full" />
                </div>
            </header>

            <div className="border-t border-line py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <Skeleton className="h-11 flex-1" />
                    <Skeleton className="h-11 w-56" />
                    <Skeleton className="h-11 w-28" />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 border-b border-line py-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-11" />
                ))}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i}>
                        <Skeleton className="aspect-[16/10] w-full" />
                        <Skeleton className="mt-3 h-4 w-3/4" />
                        <Skeleton className="mt-2 h-3 w-1/2" />
                        <Skeleton className="mt-3 h-4 w-2/3" />
                    </div>
                ))}
            </div>
        </div>
    );
}
