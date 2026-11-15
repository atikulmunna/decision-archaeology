/**
 * Every email the app sends, in the Field Archive look. Email clients cannot read the app's CSS
 * variables, so colors come from the token map's light theme as inline styles. No emoji, everything
 * a person typed is escaped, and a letter's text is never included: the letter opens in the app.
 */
import { tokens } from '@/lib/design/tokens'

type Email = { subject: string; html: string; text: string }
type Message = { title: string; catalog: string; revisitUrl: string }

const c = tokens.light

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** A paragraph of escaped HTML, or one that keeps the line breaks a person typed. */
type Paragraph = string | { text: string; keepLines: true }

/** `body` is one paragraph or several, already escaped; the last one leaves room above the button. */
function frame(eyebrow: string, heading: string, body: Paragraph | Paragraph[], cta: string, url: string): string {
  const paragraphs = (Array.isArray(body) ? body : [body])
    .map((paragraph, index, all) => {
      const text = typeof paragraph === 'string' ? paragraph : paragraph.text
      const lines = typeof paragraph === 'string' ? '' : ';white-space:pre-wrap'
      return `<p style="margin:0 0 ${index === all.length - 1 ? 24 : 12}px;font-size:15px;line-height:1.6;color:${c['ink-2']}${lines}">${text}</p>`
    })
    .join('\n    ')
  return `<div style="background:${c.paper};padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:${c.ink}">
  <div style="max-width:560px;margin:0 auto;background:${c.surface};border:1px solid ${c.rule};padding:28px">
    <p style="margin:0 0 12px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${c.muted}">${eyebrow}</p>
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;color:${c.ink}">${heading}</h1>
    ${paragraphs}
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

/** To each collaborator when the owner logs an outcome on a shared decision. */
export function outcomeLoggedEmail({ ownerName, title, rating, summary, url }: { ownerName: string; title: string; rating: string; summary: string; url: string }): Email {
  const subject = `${ownerName} added an outcome update`
  // Titles are often questions, so the rating gets its own line instead of following the title.
  const text = `${ownerName} added an outcome update to "${title}".\nRating: ${rating}\n\n${summary}\n\nSee the outcome history: ${url}`
  const html = frame(
    'Outcome update',
    'A shared decision has news',
    [
      `<strong>${escapeHtml(ownerName)}</strong> added an outcome update to <strong>${escapeHtml(title)}</strong>.`,
      `Rating: ${escapeHtml(rating)}`,
      { text: escapeHtml(summary), keepLines: true },
    ],
    'See the outcome history',
    url
  )
  return { subject, html, text }
}

/** To the collaborator a decision was just shared with. */
export function shareInviteEmail({ ownerName, title, url }: { ownerName: string; title: string; url: string }): Email {
  const subject = `${ownerName} shared a decision with you`
  const text = `${ownerName} shared their decision record "${title}" with you. You can read it, leave comments and follow its outcomes: ${url}`
  const html = frame(
    'Shared with you',
    'A decision record to read',
    `<strong>${escapeHtml(ownerName)}</strong> shared their decision record <strong>${escapeHtml(title)}</strong> with you. You can read it, leave comments and follow its outcomes.`,
    'Open the decision',
    url
  )
  return { subject, html, text }
}

/** To the owner when a collaborator asks what happened. */
export function checkInRequestEmail({ collaboratorName, title, url }: { collaboratorName: string; title: string; url: string }): Email {
  const subject = `${collaboratorName} is asking for an update`
  const text = `${collaboratorName} is curious what happened with "${title}". Log an outcome update to keep them in the loop: ${url}`
  const html = frame(
    'Update requested',
    'Someone is asking what happened',
    `<strong>${escapeHtml(collaboratorName)}</strong> is curious what happened with <strong>${escapeHtml(title)}</strong>. Log an outcome update to keep them in the loop.`,
    'Log an outcome',
    url
  )
  return { subject, html, text }
}
