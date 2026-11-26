// Little shaded pictures of each shape for the object palette. Drawn for Crycer: simple lit solids
// in one consistent style, so a row of them reads like a tray of real objects.
import * as React from "react"

type P = { className?: string }
const S = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none" strokeLinejoin="round" strokeLinecap="round">{children}</svg>
)
// one light from the upper left for everything: a lit face, a side face and a shadow face
const L = "currentColor", side = "color-mix(in oklch, currentColor 62%, black)", dark = "color-mix(in oklch, currentColor 38%, black)", hi = "color-mix(in oklch, currentColor 55%, white)"

export const SphereIcon = ({ className }: P) => { const id = "cl" + React.useId().replace(/[^a-zA-Z0-9_-]/g, ""); return <S className={className}><defs><radialGradient id={id} cx=".36" cy=".32" r=".75"><stop offset="0" stopColor={hi} /><stop offset=".45" stopColor={L} /><stop offset="1" stopColor={dark} /></radialGradient></defs><circle cx="16" cy="16" r="11" fill="{`url(#${id})`}" /></S> }
export const CubeIcon = ({ className }: P) => <S className={className}><path d="M16 5 27 10.5 16 16 5 10.5Z" fill={hi} /><path d="M5 10.5 16 16v11L5 21.5Z" fill={L} /><path d="M27 10.5 16 16v11l11-5.5Z" fill={side} /></S>
export const PyramidIcon = ({ className }: P) => <S className={className}><path d="M16 4 5 23l11 5Z" fill={L} /><path d="M16 4l11 19-11 5Z" fill={side} /></S>
export const CylinderIcon = ({ className }: P) => <S className={className}><path d="M7 9v14c0 2.2 4 4 9 4s9-1.8 9-4V9" fill={L} /><path d="M16 27c5 0 9-1.8 9-4V9" fill={side} /><ellipse cx="16" cy="9" rx="9" ry="4" fill={hi} /></S>
export const ConeIcon = ({ className }: P) => <S className={className}><path d="M16 4 6 23c0 2.2 4.5 4 10 4Z" fill={L} /><path d="M16 4l10 19c0 2.2-4.5 4-10 4Z" fill={side} /></S>
export const TorusIcon = ({ className }: P) => { const id = "cl" + React.useId().replace(/[^a-zA-Z0-9_-]/g, ""); return <S className={className}><defs><radialGradient id={id} cx=".4" cy=".3" r=".8"><stop offset="0" stopColor={hi} /><stop offset=".55" stopColor={L} /><stop offset="1" stopColor={dark} /></radialGradient></defs><path fillRule="evenodd" d="M16 8c7.2 0 13 3.6 13 8s-5.8 8-13 8S3 20.4 3 16s5.8-8 13-8Zm0 5c-3.9 0-7 1.3-7 3s3.1 3 7 3 7-1.3 7-3-3.1-3-7-3Z" fill="{`url(#${id})`}" /></S> }
export const DiscIcon = ({ className }: P) => <S className={className}><path d="M3 15v2c0 2.8 5.8 5 13 5s13-2.2 13-5v-2" fill={side} /><ellipse cx="16" cy="15" rx="13" ry="5" fill={hi} /></S>
export const StoneIcon = ({ className }: P) => <S className={className}><path d="M6 20 9 11l8-4 8 5 2 9-7 5-10-1Z" fill={L} /><path d="m17 7 8 5 2 9-7 5-3-11Z" fill={side} /><path d="m9 11 8-4 0 8-11 5Z" fill={hi} opacity=".55" /></S>
export const BlobIcon = ({ className }: P) => { const id = "cl" + React.useId().replace(/[^a-zA-Z0-9_-]/g, ""); return <S className={className}><defs><radialGradient id={id} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor={hi} /><stop offset=".5" stopColor={L} /><stop offset="1" stopColor={dark} /></radialGradient></defs><path d="M9 21c-4-3-3-10 2-11 2-5 9-5 11-1 5 0 7 6 4 10 1 5-5 8-9 6-3 2-7 0-8-4Z" fill="{`url(#${id})`}" /></S> }
export const TreeIcon = ({ className }: P) => <S className={className}><path d="M14.5 19h3v9h-3Z" fill="#8a5a34" /><circle cx="16" cy="13" r="9" fill={L} /><circle cx="13" cy="10" r="4.5" fill={hi} opacity=".5" /></S>
export const PineIcon = ({ className }: P) => <S className={className}><path d="M14.8 23h2.4v6h-2.4Z" fill="#8a5a34" /><path d="M16 3 9 13h4l-6 6h5l-6 6h20l-6-6h5l-6-6h4Z" fill={L} /><path d="M16 3v22h10l-6-6h5l-6-6h4Z" fill={side} /></S>
export const CragIcon = ({ className }: P) => <S className={className}><path d="M4 12 10 8l7 1 6-3 5 5-6 2-9 1Z" fill={hi} /><path d="M4 12l9 2 9-1 6-2-7 9-5 8-4-7Z" fill={L} /><path d="m22 13 6-2-7 9-5 8 2-12Z" fill={side} /></S>
export const ModelIcon = ({ className }: P) => <S className={className}><path d="M16 4 26 9.5v13L16 28 6 22.5v-13Z" fill={side} /><path d="M16 4 26 9.5 16 15 6 9.5Z" fill={hi} /><path d="M6 9.5 16 15v13L6 22.5Z" fill={L} /><path d="M16 15v13" stroke={dark} strokeWidth="1" /></S>
export const TextIcon = ({ className }: P) => <S className={className}><path d="M6 6h20v6h-3l-1-2h-4v14l3 1v2H11v-2l3-1V10h-4l-1 2H6Z" fill={L} /><path d="M26 6v6h-3l-1-2h-4v14l3 1v2h-5V6Z" fill={side} /></S>
export const CutoutIcon = ({ className }: P) => <S className={className}><path d="M6 5h16l4 4v18H6Z" fill={hi} /><path d="M22 5v4h4" fill={side} /><path d="m9 23 5-7 3 4 2-3 4 6Z" fill={side} /><circle cx="12" cy="11" r="2.2" fill={L} /></S>

// planes, land and weather
export const WaterIcon = ({ className }: P) => <S className={className}><path d="M2 20 12 15h18l-10 5Z" fill={L} /><path d="M2 20h18v3H2Z" fill={side} /><path d="M20 20l10-5v3l-10 5Z" fill={dark} /><path d="M8 18c2-1 3 1 5 0s3 1 5 0 3 1 5 0" stroke={hi} strokeWidth="1.2" /></S>
export const GroundIcon = ({ className }: P) => <S className={className}><path d="M2 20 12 15h18l-10 5Z" fill={L} /><path d="M2 20h18v3H2Z" fill={side} /><path d="M20 20l10-5v3l-10 5Z" fill={dark} /><path d="M9 18h2M15 17h3M19 18.5h2M13 19h1.5" stroke={dark} strokeWidth="1.2" /></S>
export const CheckerIcon = ({ className }: P) => <S className={className}><path d="M2 20 12 15h18l-10 5Z" fill={hi} /><path d="m7 17.5 2.5-1.25h4.5L11.5 17.5ZM11 19.5l2.5-1.25H18l-2.5 1.25ZM16 17.5l2.5-1.25H23L20.5 17.5ZM20.5 15.75 23 14.5h4.5L25 15.75Z" fill={dark} /><path d="M2 20h18v3H2Z" fill={side} /><path d="M20 20l10-5v3l-10 5Z" fill={dark} /></S>
export const CloudIcon = ({ className }: P) => <S className={className}><path d="M8 23a5 5 0 0 1-.6-10A7 7 0 0 1 21 10.5a5.5 5.5 0 0 1 3 12.5Z" fill={hi} /><path d="M8 23h16a5.5 5.5 0 0 0 3-4c-3 2-15 3-22 1 .6 1.8 1.9 3 3 3Z" fill={side} /></S>
export const TerrainIcon = ({ className }: P) => <S className={className}><path d="M2 25 11 9l5 7 3-4 11 13Z" fill={L} /><path d="m11 9 5 7-3 9H2Z" fill={side} /><path d="m11 9-2 4 2-1 1.5 1.5Z" fill={hi} /><path d="m19 12-1.6 2.6L19 14l1.3 1Z" fill={hi} /></S>
export const IslandIcon = ({ className }: P) => <S className={className}><path d="M2 23c5-2 23-2 28 0v4H2Z" fill="#2f6fd0" opacity=".85" /><path d="M7 23c2-6 5-11 9-11s7 5 9 11Z" fill={L} /><path d="M16 12c4 0 7 5 9 11h-7Z" fill={side} /></S>

// light
export const LampIcon = ({ className }: P) => { const id = "cl" + React.useId().replace(/[^a-zA-Z0-9_-]/g, ""); return <S className={className}><defs><radialGradient id={id} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff" /><stop offset=".35" stopColor={L} /><stop offset="1" stopColor={L} stopOpacity="0" /></radialGradient></defs><circle cx="16" cy="16" r="13" fill="{`url(#${id})`}" /><circle cx="16" cy="16" r="4.5" fill="#fff" /></S> }
export const SpotIcon = ({ className }: P) => <S className={className}><path d="M12 4h8l-1 5h-6Z" fill={side} /><path d="M13 9h6l8 19H5Z" fill={L} opacity=".45" /><path d="M13 9h6l-3 2Z" fill="#fff" /></S>
export const NeonIcon = ({ className }: P) => <S className={className}><circle cx="16" cy="16" r="9" stroke={L} strokeWidth="5" opacity=".35" /><circle cx="16" cy="16" r="9" stroke={hi} strokeWidth="2" /></S>

// camera views
export const TopViewIcon = ({ className }: P) => <S className={className}><rect x="6" y="6" width="20" height="20" rx="2" stroke={L} strokeWidth="2" /><circle cx="16" cy="16" r="4" fill={L} /></S>
export const FrontViewIcon = ({ className }: P) => <S className={className}><path d="M4 22h24" stroke={L} strokeWidth="2" /><path d="M10 22v-8h12v8" fill={side} /><circle cx="16" cy="10" r="3" fill={L} /></S>
export const SideViewIcon = ({ className }: P) => <S className={className}><path d="M4 22h24" stroke={L} strokeWidth="2" /><path d="M8 22c0-5 3-8 8-8s8 3 8 8" fill={side} /><path d="M21 10l5 3-5 3Z" fill={L} /></S>
export const EyeViewIcon = ({ className }: P) => <S className={className}><path d="M3 16c4-6 9-8 13-8s9 2 13 8c-4 6-9 8-13 8S7 22 3 16Z" fill={side} /><circle cx="16" cy="16" r="5" fill={L} /><circle cx="14.5" cy="14.5" r="1.6" fill="#fff" /></S>
