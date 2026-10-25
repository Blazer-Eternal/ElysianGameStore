import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

// Storefront chrome: header + footer around every public/commerce route.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
        </>
    );
}
