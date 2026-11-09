'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

export const NAV_LINKS = [
  { href: '/decisions', label: 'Archive' },
  { href: '/calibration', label: 'Calibration' },
  { href: '/ai/reports', label: 'Reports' },
] as const

type NavLink = { href: string; label: string }

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

const linkBase = 'font-mono text-[11px] uppercase tracking-[0.09em] transition-colors duration-150'

export function MastheadNav({ links = NAV_LINKS, cta }: { links?: readonly NavLink[]; cta?: ReactNode }) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
        {links.map(({ href, label }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`${linkBase} border-b-[1.5px] pb-0.5 ${active ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink'}`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <button
        ref={toggleRef}
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink hover:bg-sunken md:hidden"
      >
        {open ? <X aria-hidden="true" size={18} strokeWidth={1.5} /> : <Menu aria-hidden="true" size={18} strokeWidth={1.5} />}
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full z-20 border-b-[1.5px] border-ink bg-paper px-4 py-4 md:hidden"
      >
        <nav aria-label="Primary mobile" className="flex flex-col gap-3">
          {links.map(({ href, label }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={`${linkBase} py-1 ${active ? 'text-ink' : 'text-muted'}`}
              >
                {label}
              </Link>
            )
          })}
          {cta && <div className="pt-2" onClick={() => setOpen(false)}>{cta}</div>}
        </nav>
      </div>
    </>
  )
}
