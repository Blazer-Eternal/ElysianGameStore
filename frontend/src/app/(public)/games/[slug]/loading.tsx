import { Skeleton } from "@/components/ui/Marks";

// The detail layout's shape: 8/4 split, spec rows, review rows. Flat blocks.
export default function GameDetailLoading() {
    return (
        <div className="mx-auto w-full max-w-[84rem] px-4 pb-16 sm:px-6 lg:px-10">
            <div className="pt-8">
                <Skeleton className="h-3 w-48" />
            </div>

            <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="lg:col-span-8">
                    <Skeleton className="aspect-[16/10] w-full" />
                    <Skeleton className="mt-6 h-3 w-44" />
                    <Skeleton className="mt-3 h-10 w-3/5" />
                    <Skeleton className="mt-4 h-16 w-full max-w-3xl" />
                    <Skeleton className="mt-6 h-14 w-full" />
                    <div className="mt-5 flex gap-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                </div>
                <div className="lg:col-span-4">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="mt-2 h-4 w-52" />
                    <Skeleton className="mt-6 h-11 w-full" />
                    <Skeleton className="mt-3 h-11 w-full" />
                    <Skeleton className="mt-6 h-40 w-full" />
                </div>
            </div>

            <div className="pt-16">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mt-3 h-7 w-56" />
                <Skeleton className="mt-6 h-40 w-full max-w-3xl" />
            </div>
        </div>
    );
}
