import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkInRequestEmail, outcomeLoggedEmail, shareInviteEmail } from '@/lib/email/messages'
import { tokens } from '@/lib/design/tokens'

const dash = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`)
const url = 'https://da.example/shared/s1'

const emails = () => [
  outcomeLoggedEmail({ ownerName: 'Rowan <b>', title: 'Move <here>?', rating: 'Better than expected', summary: 'It went <well>.', url }),
  shareInviteEmail({ ownerName: 'Rowan <b>', title: 'Move <here>?', url }),
  checkInRequestEmail({ collaboratorName: 'Sam <i>', title: 'Move <here>?', url }),
]

describe('sharing emails', () => {
  it('use the Field Archive look, with no emoji or dashes', () => {
    for (const email of emails()) {
      const all = `${email.subject} ${email.html} ${email.text}`
      expect(all).not.toMatch(/\p{Extended_Pictographic}/u)
      expect(all).not.toMatch(dash)
      expect(email.html).toContain(tokens.light.paper)
      expect(email.html).not.toMatch(/#4f46e5/i)
    }
  })

  it('escape everything a person typed and link to the record', () => {
    for (const email of emails()) {
      expect(email.html).toContain('Move &lt;here&gt;?')
      expect(email.html).not.toMatch(/<here>|<b>|<i>|<well>/)
      expect(email.html).toContain(`href="${url}"`)
      expect(email.text).toContain(url)
    }
  })

  it('carry what each one is about', () => {
    const [outcome, invite, checkIn] = emails()
    expect(outcome.subject).toBe('Rowan <b> added an outcome update')
    expect(outcome.html).toContain('Better than expected')
    expect(outcome.html).toContain('It went &lt;well&gt;.')
    expect(invite.subject).toBe('Rowan <b> shared a decision with you')
    expect(checkIn.subject).toBe('Sam <i> is asking for an update')
  })

  it('read naturally when a title is a question, and keep the line breaks in a note', () => {
    const summary = ['First line.', 'Second line.'].join(String.fromCharCode(10))
    const outcome = outcomeLoggedEmail({
      ownerName: 'Rowan',
      title: 'Accept the senior role at Northwind?',
      rating: 'Better than expected',
      summary,
      url,
    })
    // The rating stands on its own, not glued to the title as "Northwind?: Better".
    expect(outcome.html).not.toContain('?</strong>:')
    expect(outcome.html).toContain('Rating: Better than expected')
    expect(outcome.html).toContain(`white-space:pre-wrap">${summary}</p>`)
    // Plain text quotes titles so a question mark does not run into the sentence.
    for (const email of emails()) expect(email.text).toContain('"Move <here>?"')
  })
})

describe('the routes that send them', () => {
  it('build their email from the shared messages, not inline markup', () => {
    for (const file of [
      'src/app/api/decisions/[id]/outcomes/route.ts',
      'src/app/api/decisions/[id]/share/route.ts',
      'src/app/api/decisions/[id]/share/[shareId]/checkin/route.ts',
    ]) {
      const source = readFileSync(path.join(process.cwd(), file), 'utf8')
      expect(source, file).not.toMatch(/#4f46e5|<div style=/i)
      expect(source, file).toMatch(/from '@\/lib\/email\/messages'/)
    }
  })
})
