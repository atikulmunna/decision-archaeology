/**
 * Emails from the daily job, in the Field Archive look. Email clients cannot read the app's CSS
 * variables, so colors come from the token map's light theme as inline styles. No emoji, and the
 * letter's text is never included: the letter opens in the app.
 */
import { tokens } from '@/lib/design/tokens'

type Email = { subject: string; html: string; text: string }
type Message = { title: string; catalog: string; revisitUrl: string }

const c = tokens.light

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function frame(eyebrow: string, heading: string, body: string, cta: string, url: string): string {
  return `<div style="background:${c.paper};padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:${c.ink}">
  <div style="max-width:560px;margin:0 auto;background:${c.surface};border:1px solid ${c.rule};padding:28px">
    <p style="margin:0 0 12px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${c.muted}">${eyebrow}</p>
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;color:${c.ink}">${heading}</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${c['ink-2']}">${body}</p>
    <a href="${url}" style="display:inline-block;background:${c.primary};color:${c['on-primary']};padding:10px 18px;font-family:'Courier New',monospace;font-size:12px;letter-spacing:1px;text-transform:uppercase;text-decoration:none">${cta}</a>
    <p style="margin:28px 0 0;font-size:12px;color:${c.muted}">Decision Archaeology</p>
  </div>
</div>`
}

/** Sent once a letter's day has passed: it announces the letter and links to the revisit, where it opens. */
export function letterReadyEmail({ title, catalog, revisitUrl }: Message): Email {
  const subject = `Your letter about "${title}" is ready`
  const text = `The letter you wrote to future you when you sealed ${catalog}, ${title}, is ready to open. Read it as the first step of your revisit: ${revisitUrl}`
  const html = frame(
    `${escapeHtml(catalog)} · Letter`,
    'A letter from your past self is ready',
    `When you sealed <strong>${escapeHtml(title)}</strong>, you wrote a letter to read today. It opens as the first step of your revisit.`,
    'Open your letter',
    revisitUrl
  )
  return { subject, html, text }
}

/** Sent when a check-in the owner scheduled has arrived. */
export function checkInEmail({ title, catalog, revisitUrl }: Message): Email {
  const subject = `Time to revisit "${title}"`
  const text = `You asked to check in on ${catalog}, ${title}. Take a few minutes to look back at what you expected and what happened: ${revisitUrl}`
  const html = frame(
    `${escapeHtml(catalog)} · Check-in`,
    'Time to revisit',
    `You asked to check in on <strong>${escapeHtml(title)}</strong>. Take a few minutes to look back at what you expected and what happened.`,
    'Start your revisit',
    revisitUrl
  )
  return { subject, html, text }
}
