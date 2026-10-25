import type { SVGProps } from "react";

// Hand-drawn icon set. 24px grid, 1.5px stroke, currentColor, square caps.
// Only icons that exist here may be used in the UI — see DESIGN.md. If a
// screen needs something else, add it to this file rather than pulling in an
// icon package.

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = ({ size = 20, ...props }: IconProps) => ({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
    "aria-hidden": true,
    focusable: false as const,
    ...props,
});

export const SearchIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5 21 21" />
    </svg>
);

export const CartIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M3 4h2.5l2 12h11l2-8H7" />
        <path d="M9 20h.01M17 20h.01" />
    </svg>
);

export const UserIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
);

export const ChevronRightIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="m9 5 7 7-7 7" />
    </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="m5 9 7 7 7-7" />
    </svg>
);

export const ArrowRightIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M4 12h15" />
        <path d="m13 6 6 6-6 6" />
    </svg>
);

export const CloseIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M5 5l14 14M19 5 5 19" />
    </svg>
);

export const MenuIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
);

export const CheckIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="m4 12.5 5 5L20 6" />
    </svg>
);

export const DownloadIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 3v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M4 20h16" />
    </svg>
);

export const HeartIcon = ({ filled = false, ...p }: IconProps & { filled?: boolean }) => (
    <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
        <path d="M12 20 4.5 12.8A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 7.5 6.2Z" />
    </svg>
);

export const StarIcon = ({ filled = true, ...p }: IconProps & { filled?: boolean }) => (
    <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
        <path d="m12 3.5 2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 17.3l-5.3 2.9 1.1-6.1L3.4 9.9l6-.8Z" />
    </svg>
);

export const SunIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
    </svg>
);

export const MoonIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
    </svg>
);

export const LockIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="5" y="10.5" width="14" height="9.5" />
        <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    </svg>
);

export const RefreshIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M20 5v5h-5" />
        <path d="M19.4 10A8 8 0 1 0 20 14" />
    </svg>
);

export const PlayIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M7 4.5 19 12 7 19.5Z" />
    </svg>
);

export const TagIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M3 3h8l10 10-8 8L3 11Z" />
        <path d="M7.5 7.5h.01" />
    </svg>
);

export const ShieldIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 3 5 5.5V11c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V5.5Z" />
    </svg>
);

export const ClockIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5.5l3.5 2" />
    </svg>
);

export const MonitorIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="3" y="4.5" width="18" height="12" />
        <path d="M9 20.5h6M12 16.5v4" />
    </svg>
);

export const GiftIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="3.5" y="8.5" width="17" height="4" />
        <path d="M5 12.5V21h14v-8.5M12 8.5V21" />
        <path d="M12 8.5S9.5 4 7.5 5s.5 3.5 4.5 3.5ZM12 8.5s2.5-4.5 4.5-3.5-.5 3.5-4.5 3.5Z" />
    </svg>
);
