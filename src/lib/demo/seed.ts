import type { DomainTag, OutcomeUpdate } from '@prisma/client'
import type { CorrectionField } from '@/lib/corrections'

/**
 * Rowan Hale's fictional archive: 24 decisions over 18 months, from a senior
 * engineering job at Halcyon, through the startup Northwind, to co-founding
 * Fernhill. Dates are day offsets from DEMO_NOW. Every name here is invented.
 */

type OutcomeRating = OutcomeUpdate['outcomeRating']

export type DemoOutcomeSeed = {
  daysAgo: number
  outcomeRating: OutcomeRating
  whatHappened: string
  lessonsLearned?: string
}

export type DemoCorrectionSeed = {
  daysAgo: number
  fieldName: CorrectionField
  correctedText: string
  reason: string
  status: 'APPROVED' | 'REJECTED'
}

export type DemoDecisionSeed = {
  key: string
  daysAgo: number
  deliberationMinutes?: number
  title: string
  summary: string
  context: string
  alternatives: string
  chosenOption: string
  reasoning: string
  values?: string
  uncertainties?: string
  predictedOutcome?: string
  predictedTimeframeDays?: number
  confidenceLevel: number
  domainTag: DomainTag
  customTags: string[]
  supplementaryNotes?: string
  outcomes: DemoOutcomeSeed[]
  corrections?: DemoCorrectionSeed[]
}

export const SPECIMEN_KEY = 'northwind-offer'

export const SPECIMEN_SENTENCE =
  'The role compounds my options, but only if the team is as strong as the interviews suggested and the extra hours do not erase the gains.'

export const SPECIMEN_EXCERPT = 'but only if the team is as strong as the interviews suggested'

export const DEMO_SEEDS: readonly DemoDecisionSeed[] = [
  {
    key: 'halcyon-platform-team',
    daysAgo: 540,
    deliberationMinutes: 35,
    title: 'Move to the platform team at Halcyon?',
    summary: 'Leave the payments product team for the internal platform team.',
    context:
      "I have been a senior engineer on payments for three years. The platform team is rebuilding the deploy pipeline and asked if I would join. My current team ships steadily but I have stopped learning.",
    alternatives: 'Stay on payments and push for the ledger rewrite. Join the platform team. Start looking outside Halcyon.',
    chosenOption: 'Join the platform team.',
    reasoning:
      "Infrastructure work is the gap in my experience, and doing it inside a company I already understand lowers the risk. If I hate it, moving back is easy. Looking outside now would be running away from boredom rather than toward something.",
    values: 'Learning over comfort. Keeping options open.',
    uncertainties: 'Whether platform work feels too far from users. Whether the new manager is as good as people say.',
    predictedOutcome: 'Six months in I will be glad I moved, though I will miss shipping visible features.',
    predictedTimeframeDays: 180,
    confidenceLevel: 6,
    domainTag: 'CAREER',
    customTags: ['halcyon', 'learning', 'team-change'],
    outcomes: [
      {
        daysAgo: 420,
        outcomeRating: 'SLIGHTLY_BETTER',
        whatHappened:
          'The deploy pipeline work was harder and more interesting than expected. I missed users less than I feared because other teams became my users.',
        lessonsLearned: 'Internal tools still have customers. That framing kept me motivated.',
      },
    ],
  },
  {
    key: 'emergency-fund',
    daysAgo: 520,
    title: 'Build a six-month emergency fund before investing more?',
    summary: 'Pause extra investing until six months of expenses sit in cash.',
    context:
      'I have about two months of expenses saved and the rest goes into investments every month. Two friends were laid off this spring with almost no warning.',
    alternatives: 'Keep investing everything above two months. Split new savings half and half. Fill the cash buffer first.',
    chosenOption: 'Fill the cash buffer to six months first, then resume investing.',
    reasoning:
      'The expected return of investing is higher, but the cost of being forced to sell in a downturn is worse than the return I give up. A buffer also makes any future job change a choice rather than a panic.',
    values: 'Security. Freedom to say no to a bad job.',
    uncertainties: 'Whether I will actually resume investing once the buffer is full.',
    predictedOutcome: 'The buffer will be full in about nine months and I will feel calmer about work.',
    predictedTimeframeDays: 270,
    confidenceLevel: 8,
    domainTag: 'FINANCE',
    customTags: ['savings', 'risk'],
    outcomes: [
      {
        daysAgo: 330,
        outcomeRating: 'AS_EXPECTED',
        whatHappened:
          'The buffer reached six months right on schedule, and it is the reason the Northwind offer felt like a real option instead of a gamble.',
      },
    ],
  },
  {
    key: 'half-marathon',
    daysAgo: 505,
    deliberationMinutes: 10,
    title: 'Sign up for the autumn half marathon?',
    summary: 'Commit to a half marathon in October as a reason to train consistently.',
    context:
      'I run about twice a week with no plan. A friend is training for the October half and offered to share her schedule.',
    alternatives: 'Keep running casually. Sign up for a 10k instead. Sign up for the half marathon.',
    chosenOption: 'Sign up for the half marathon.',
    reasoning:
      'A fixed date is the only thing that has ever made me consistent. Twenty weeks is enough time to build up from where I am if I follow the plan.',
    values: 'Health. Following through on commitments.',
    uncertainties: 'My left knee has complained before when I increased distance quickly.',
    predictedOutcome: 'I will finish in under two hours and keep running afterwards.',
    predictedTimeframeDays: 150,
    confidenceLevel: 5,
    domainTag: 'HEALTH',
    customTags: ['running', 'goals'],
    outcomes: [
      {
        daysAgo: 440,
        outcomeRating: 'MUCH_WORSE',
        whatHappened:
          'I raised my weekly distance too fast and strained the knee in week nine. I did not start the race and stopped running for two months.',
        lessonsLearned: 'I wrote the knee down as an uncertainty and then ignored it. Next time the known risk sets the pace.',
      },
    ],
  },
  {
    key: 'wedding-speech',
    daysAgo: 490,
    title: "Say yes to giving the speech at my sister's wedding?",
    summary: 'Accept or decline giving the family speech at the wedding.',
    context:
      'My sister asked me to give the speech. I hate public speaking, and our parents expected her to ask our uncle.',
    alternatives: 'Decline and suggest our uncle. Say yes and keep it very short. Say yes and do it properly.',
    chosenOption: 'Say yes and do it properly, with real preparation.',
    reasoning:
      'She asked me, not a substitute, and saying no would tell her my discomfort matters more than her day. Preparing well is within my control even if the nerves are not.',
    values: 'Family. Courage over comfort.',
    uncertainties: 'Whether I freeze on the day.',
    predictedOutcome: 'It will be fine but forgettable, and I will be relieved when it is over.',
    predictedTimeframeDays: 40,
    confidenceLevel: 4,
    domainTag: 'RELATIONSHIPS',
    customTags: ['family', 'speaking'],
    outcomes: [
      {
        daysAgo: 455,
        outcomeRating: 'MUCH_BETTER',
        whatHappened:
          'People still mention the speech. My sister cried, and my uncle asked for a copy. I was nervous for the first minute and then it was fine.',
        lessonsLearned: 'I predicted my own feelings well and the audience badly.',
      },
    ],
  },
  {
    key: 'open-source-side-project',
    daysAgo: 470,
    deliberationMinutes: 50,
    title: 'Open source the side project instead of selling it?',
    summary: 'Release my schema migration tool under an open license instead of charging for it.',
    context:
      'A small migration tool I built on weekends has a handful of users at other companies. One of them offered to pay for a license.',
    alternatives: 'Sell licenses. Open source it. Keep it private.',
    chosenOption: 'Open source it under a permissive license.',
    reasoning:
      'The revenue would be tiny and support would eat my weekends. As open source it becomes a portfolio piece and a way to meet engineers I would like to work with.',
    values: 'Craft. Building in public.',
    uncertainties: 'Whether anyone contributes or it just becomes more issues to answer.',
    predictedOutcome: 'A few hundred stars and one or two regular contributors within a year.',
    predictedTimeframeDays: 365,
    confidenceLevel: 6,
    domainTag: 'CREATIVE',
    customTags: ['open-source', 'side-project'],
    outcomes: [
      {
        daysAgo: 300,
        outcomeRating: 'SLIGHTLY_BETTER',
        whatHappened:
          'It reached a little over four hundred stars and two steady contributors. One of them later became the first engineer I talked to about Fernhill.',
      },
    ],
  },
  {
    key: 'negotiate-equity',
    daysAgo: 455,
    deliberationMinutes: 90,
    title: 'Trade some salary for more Northwind equity?',
    summary: 'Ask Northwind to lower the base salary in exchange for a larger option grant.',
    context:
      'Northwind offered a base salary close to my Halcyon pay plus a modest option grant. They said they could move a little in either direction.',
    alternatives: 'Take the offer as written. Push for more salary. Trade salary for options.',
    chosenOption: 'Trade about ten percent of the base salary for a larger option grant.',
    reasoning:
      'My emergency fund covers the lower salary comfortably. If Northwind works, the options matter far more than the salary difference, and asking for them signals that I believe in the company.',
    values: 'Ownership. Betting on what I can influence.',
    uncertainties: 'Startup options are often worth nothing. The strike price and the next round both matter.',
    predictedOutcome: 'The extra options will be worth more than the salary I gave up by the time I could sell any.',
    predictedTimeframeDays: 1460,
    confidenceLevel: 5,
    domainTag: 'FINANCE',
    customTags: ['northwind', 'equity', 'negotiation'],
    outcomes: [
      {
        daysAgo: 250,
        outcomeRating: 'TOO_EARLY_TO_TELL',
        whatHappened:
          'Northwind raised its next round at a higher valuation, so the options are worth more on paper. Nothing can be sold yet.',
      },
    ],
  },
  {
    key: 'northwind-offer',
    daysAgo: 452,
    deliberationMinutes: 240,
    title: 'Accept the senior role at Northwind?',
    summary: 'Leave Halcyon to join Northwind, a 30-person startup, as a senior engineer on the core product.',
    context:
      'Northwind builds scheduling software for clinics. I met six of the team during interviews and liked how they argued about tradeoffs. The role pays slightly less and the hours will be longer.',
    alternatives: 'Stay at Halcyon on the platform team. Accept Northwind. Keep interviewing for a bigger startup.',
    chosenOption: 'Accept the Northwind offer.',
    reasoning:
      `${SPECIMEN_SENTENCE} I am learning more per month in interviews with them than in a quarter at Halcyon. My savings mean a failure would be survivable.`,
    values: 'Learning speed. Working with people I respect.',
    uncertainties: 'Whether the team is as good on a bad week as in interviews. Whether the hours stay reasonable.',
    predictedOutcome: 'A year in I will have grown faster than I would have at Halcyon without burning out.',
    predictedTimeframeDays: 365,
    confidenceLevel: 7,
    domainTag: 'CAREER',
    customTags: ['northwind', 'job-offer', 'startup'],
    supplementaryNotes:
      'Added later: the interviews undersold how much of the codebase had no tests. The people were exactly as good as they seemed.',
    outcomes: [
      {
        daysAgo: 360,
        outcomeRating: 'TOO_EARLY_TO_TELL',
        whatHappened: 'Three months in. Long weeks, steep learning, and I like the team. Too soon to call it.',
      },
      {
        daysAgo: 200,
        outcomeRating: 'AS_EXPECTED',
        whatHappened:
          'After a year I own the scheduling engine and have grown a lot. The hours were long in two stretches but never unsustainable.',
        lessonsLearned: 'The team was the whole bet, and it was the right one.',
      },
    ],
  },
  {
    key: 'move-across-city',
    daysAgo: 430,
    title: 'Move across the city to shorten the Northwind commute?',
    summary: 'Leave my neighborhood to live twenty minutes from the Northwind office.',
    context:
      'The commute to Northwind is seventy minutes each way. My lease ends next month and a flat near the office is available at a similar rent.',
    alternatives: 'Renew and keep commuting. Move near the office. Ask to work from home three days a week.',
    chosenOption: 'Move near the office.',
    reasoning:
      'Over two hours a day of commuting will eat the energy the new job needs. The rent is the same, and I can still see friends on weekends.',
    values: 'Energy. Time.',
    uncertainties: 'How much I will miss my neighborhood and the people in it.',
    predictedOutcome: 'I will get back about ten hours a week and barely miss the old area.',
    predictedTimeframeDays: 120,
    confidenceLevel: 6,
    domainTag: 'OTHER',
    customTags: ['home', 'commute'],
    outcomes: [
      {
        daysAgo: 290,
        outcomeRating: 'SLIGHTLY_WORSE',
        whatHappened:
          'The time savings were real, but I saw friends far less than planned and felt isolated for the first few months.',
        lessonsLearned: 'I counted hours and did not count people.',
      },
    ],
  },
  {
    key: 'start-therapy',
    daysAgo: 400,
    title: 'Start seeing a therapist every two weeks?',
    summary: 'Commit to fortnightly therapy for at least six months.',
    context:
      'Work stress has been leaking into my sleep and my temper. A friend recommended her therapist, who has an evening slot.',
    alternatives: 'Try to manage it alone with exercise. Use the employee assistance line. Start regular therapy.',
    chosenOption: 'Start regular therapy for six months, then review.',
    reasoning:
      'Managing it alone is what I have been doing, and it is not working. Six months is long enough to judge and short enough to commit to.',
    values: 'Health. Honesty with myself.',
    uncertainties: 'Cost. Whether talking actually changes anything.',
    predictedOutcome: 'Modest improvement in sleep and fewer bad days.',
    predictedTimeframeDays: 180,
    confidenceLevel: 6,
    domainTag: 'HEALTH',
    customTags: ['mental-health', 'stress'],
    outcomes: [
      {
        daysAgo: 230,
        outcomeRating: 'MUCH_BETTER',
        whatHappened:
          'Far better than modest. I sleep through most nights and I noticed the pattern of saying yes to everything at work.',
        lessonsLearned: 'I underrated how much a fixed weekly reflection would help on its own.',
      },
    ],
  },
  {
    key: 'on-call-redesign',
    daysAgo: 380,
    deliberationMinutes: 20,
    title: 'Volunteer to own the on-call rotation redesign?',
    summary: 'Take ownership of redesigning the on-call rotation after a rough quarter of pages.',
    context:
      'Northwind had three weekend outages last quarter and the same two people handled all of them. Nobody owns the rotation.',
    alternatives: 'Stay out of it and let the leads decide. Volunteer to own it. Propose it as a shared project.',
    chosenOption: 'Volunteer to own it, with a six-week deadline.',
    reasoning:
      'The current setup is burning out teh people I rely on most. I have run rotations at Halcyon and know the common fixes, so I can move faster than a committee.',
    values: 'Fairness. Taking responsibility for shared problems.',
    uncertainties: 'Whether people accept rules from someone who joined recently.',
    predictedOutcome: 'Pages spread evenly across the team within two months.',
    predictedTimeframeDays: 60,
    confidenceLevel: 7,
    domainTag: 'CAREER',
    customTags: ['northwind', 'operations', 'ownership'],
    outcomes: [
      {
        daysAgo: 270,
        outcomeRating: 'AS_EXPECTED',
        whatHappened: 'Pages are spread across eight people now and weekend incidents dropped by half.',
      },
    ],
    corrections: [
      {
        daysAgo: 378,
        fieldName: 'reasoning',
        correctedText:
          'The current setup is burning out the people I rely on most. I have run rotations at Halcyon and know the common fixes, so I can move faster than a committee.',
        reason: 'Typo: "teh" should be "the".',
        status: 'APPROVED',
      },
    ],
  },
  {
    key: 'pottery-class',
    daysAgo: 360,
    title: 'Take the Thursday evening pottery class?',
    summary: 'Sign up for a ten-week beginner pottery course.',
    context: 'I need something with my hands that has nothing to do with screens. The studio near the new flat has a Thursday class.',
    alternatives: 'Join a climbing gym. Take the pottery class. Do nothing new.',
    chosenOption: 'Take the pottery class.',
    reasoning: 'It is close, it is weekly, and it is impossible to check my phone with clay on my hands.',
    values: 'Rest. Making things.',
    confidenceLevel: 5,
    domainTag: 'CREATIVE',
    customTags: ['hobby', 'rest'],
    outcomes: [
      {
        daysAgo: 250,
        outcomeRating: 'SLIGHTLY_BETTER',
        whatHappened: 'My bowls are lopsided, but Thursday became the calmest evening of the week and I met two neighbors.',
      },
    ],
  },
  {
    key: 'lend-friend-deposit',
    daysAgo: 340,
    deliberationMinutes: 60,
    title: 'Lend a close friend money for their deposit?',
    summary: 'Lend Sam part of the deposit for a flat, repaid over two years.',
    context:
      'Sam is short of a deposit by a sum I could cover from savings without touching the emergency fund. We have been friends since university.',
    alternatives: 'Lend the money with a written plan. Give a smaller gift instead. Say no kindly.',
    chosenOption: 'Lend the money with a simple written repayment plan.',
    reasoning:
      'I can afford to lose it, which is the only safe way to lend to a friend. A written plan keeps it from becoming an unspoken weight between us.',
    values: 'Loyalty. Clarity.',
    uncertainties: 'Whether money changes how we talk to each other.',
    predictedOutcome: 'Repaid on schedule, and the friendship unchanged.',
    predictedTimeframeDays: 730,
    confidenceLevel: 4,
    domainTag: 'RELATIONSHIPS',
    customTags: ['friends', 'money'],
    outcomes: [
      {
        daysAgo: 160,
        outcomeRating: 'TOO_EARLY_TO_TELL',
        whatHappened: 'Sam has paid every month so far and we have not had an awkward moment. Halfway through.',
      },
    ],
  },
  {
    key: 'rewrite-billing',
    daysAgo: 320,
    deliberationMinutes: 45,
    title: 'Push to rewrite the billing service instead of patching it?',
    summary: 'Argue for a full rewrite of the billing service rather than incremental fixes.',
    context:
      "Northwind's billing service has caused four incidents this year and nobody wants to touch it. I estimated a rewrite at six weeks with two engineers.",
    alternatives: 'Keep patching the worst paths. Rewrite in place module by module. Do a full rewrite behind a flag.',
    chosenOption: 'Do a full rewrite behind a flag, six weeks, two engineers.',
    reasoning:
      'Patching has not reduced incidents, and every fix adds another special case. A clean rewrite is faster than people think if we keep the scope tight.',
    values: 'Quality. Fixing root causes.',
    uncertainties: 'Hidden behavior that customers depend on.',
    predictedOutcome: 'Shipped in six weeks with no billing incidents in the following quarter.',
    predictedTimeframeDays: 90,
    confidenceLevel: 8,
    domainTag: 'CAREER',
    customTags: ['northwind', 'engineering', 'estimates'],
    supplementaryNotes:
      'Note to self: my highest-confidence work estimate in this archive is also the one that went worst.',
    outcomes: [
      {
        daysAgo: 250,
        outcomeRating: 'SLIGHTLY_WORSE',
        whatHappened: 'Week ten and still not shipped. We keep finding behavior that customers rely on.',
      },
      {
        daysAgo: 190,
        outcomeRating: 'MUCH_WORSE',
        whatHappened:
          'It shipped after nineteen weeks, three times the estimate, and caused one serious invoicing incident during the switch.',
        lessonsLearned: 'I listed hidden behavior as the main uncertainty and still gave a confident estimate.',
      },
    ],
    corrections: [
      {
        daysAgo: 185,
        fieldName: 'reasoning',
        correctedText:
          'Patching has not reduced incidents. A rewrite carries real risk from hidden behavior, so the estimate should be treated as a rough guess and revisited every two weeks.',
        reason: 'Clarifying what I meant.',
        status: 'REJECTED',
      },
    ],
  },
  {
    key: 'index-funds',
    daysAgo: 300,
    title: 'Move savings from cash into index funds?',
    summary: 'Invest savings above the emergency fund in broad index funds.',
    context: 'The emergency fund is full and extra cash has been piling up in a savings account for months.',
    alternatives: 'Leave it in cash. Pick individual stocks. Buy broad index funds monthly.',
    chosenOption: 'Buy broad index funds with a fixed monthly transfer.',
    reasoning: 'I have no edge picking stocks, and cash loses value every year. Automating it removes the temptation to time the market.',
    values: 'Simplicity. Long-term thinking.',
    predictedOutcome: 'I will stop thinking about it, and it will grow roughly with the market.',
    predictedTimeframeDays: 180,
    confidenceLevel: 7,
    domainTag: 'FINANCE',
    customTags: ['investing', 'automation'],
    outcomes: [
      {
        daysAgo: 120,
        outcomeRating: 'AS_EXPECTED',
        whatHappened: 'The transfers run every month and I checked the balance twice in six months.',
      },
    ],
  },
  {
    key: 'no-work-after-ten',
    daysAgo: 280,
    title: 'Stop working after 10pm?',
    summary: 'Set a hard rule: no work messages or code after 10pm.',
    context: 'I keep answering Slack in bed. My therapist pointed out that my worst days follow my latest nights.',
    alternatives: 'Keep working when inspired. Set a 10pm cutoff. Remove Slack from my phone entirely.',
    chosenOption: 'A 10pm cutoff, with notifications muted automatically.',
    reasoning: 'A rule is easier to keep than a feeling. Automating the mute means I do not have to win the argument with myself every night.',
    values: 'Health. Boundaries.',
    uncertainties: 'Whether the team feels I am less available.',
    predictedOutcome: 'Better sleep within a month and no real cost at work.',
    predictedTimeframeDays: 30,
    confidenceLevel: 6,
    domainTag: 'HEALTH',
    customTags: ['sleep', 'boundaries'],
    outcomes: [
      {
        daysAgo: 200,
        outcomeRating: 'SLIGHTLY_BETTER',
        whatHappened: 'Sleep improved a little and nobody at work noticed the cutoff. I broke it twice during incidents.',
      },
    ],
  },
  {
    key: 'decline-manager-track',
    daysAgo: 250,
    title: 'Turn down the engineering manager track?',
    summary: 'Decline the offer to become an engineering manager and stay an individual contributor.',
    context: 'My lead offered me the manager role for the scheduling team. It comes with a raise and a seat in planning meetings.',
    alternatives: 'Accept the manager role. Decline and stay hands-on. Ask for a six-month trial.',
    chosenOption: 'Decline and stay hands-on.',
    reasoning:
      'The parts of work I like most are building and debugging, and management would take most of that away. I can still influence planning through the scheduling engine I own.',
    values: 'Craft. Knowing what energizes me.',
    uncertainties: 'Whether saying no closes the door for good.',
    predictedOutcome: 'I will not regret it, and the door will stay open.',
    predictedTimeframeDays: 180,
    confidenceLevel: 6,
    domainTag: 'CAREER',
    customTags: ['northwind', 'management'],
    outcomes: [
      {
        daysAgo: 130,
        outcomeRating: 'SLIGHTLY_BETTER',
        whatHappened:
          'No regrets. The engineer who took the role is great at it, and declining made it easier to leave later on good terms.',
      },
    ],
  },
  {
    key: 'exercise-options',
    daysAgo: 220,
    deliberationMinutes: 120,
    title: 'Exercise my vested Northwind options early?',
    summary: 'Exercise vested options now rather than waiting for a sale or the end of the exercise window.',
    context:
      'I am thinking about leaving Northwind, and departing employees have ninety days to exercise. The valuation went up in the last round.',
    alternatives: 'Exercise all vested options. Exercise half. Let them lapse.',
    chosenOption: 'Exercise all vested options now.',
    reasoning:
      'If I leave, waiting forces the decision anyway under time pressure. I believe in the company, and I can afford the exercise cost without touching the emergency fund.',
    values: 'Ownership. Deciding without a deadline.',
    uncertainties: 'Northwind may never have a sale, and the money is locked up for years.',
    predictedOutcome: 'Worth more than the exercise cost within four years.',
    predictedTimeframeDays: 1460,
    confidenceLevel: 5,
    domainTag: 'FINANCE',
    customTags: ['northwind', 'equity', 'taxes'],
    outcomes: [
      {
        daysAgo: 100,
        outcomeRating: 'TOO_EARLY_TO_TELL',
        whatHappened: 'Exercised and paid the tax. There is no way to know the value until a sale.',
      },
    ],
  },
  {
    key: 'cofound-fernhill',
    daysAgo: 180,
    deliberationMinutes: 600,
    title: 'Leave Northwind to co-found Fernhill with Dana?',
    summary: 'Quit Northwind to start Fernhill, a tool for small clinics to manage staff rotas, with my former colleague Dana.',
    context:
      'Dana and I kept hearing the same rota complaint from clinic customers at Northwind, which only sells to large groups. We have a prototype and three clinics willing to pilot it.',
    alternatives: 'Stay at Northwind and build it on weekends. Pitch it to Northwind as a new product. Leave and found Fernhill.',
    chosenOption: 'Leave and found Fernhill with Dana, with twelve months of runway from savings.',
    reasoning:
      'Weekend projects stall, and Northwind has said small clinics are not its market. Three pilots are real demand, and twelve months is enough to learn whether it can become a business.',
    values: 'Ownership. Building something that helps people I have met.',
    uncertainties: 'Whether small clinics will pay. Whether Dana and I work well under real pressure.',
    predictedOutcome: 'Ten paying clinics within a year.',
    predictedTimeframeDays: 365,
    confidenceLevel: 6,
    domainTag: 'CAREER',
    customTags: ['fernhill', 'founding', 'startup'],
    supplementaryNotes:
      'Dana called the first pilot clinic our lighthouse customer. If it renews, the others will listen.',
    outcomes: [
      {
        daysAgo: 120,
        outcomeRating: 'TOO_EARLY_TO_TELL',
        whatHappened: 'Two months in. All three pilots active, one asking about pricing.',
      },
      {
        daysAgo: 30,
        outcomeRating: 'TOO_EARLY_TO_TELL',
        whatHappened: 'Five months in. Four paying clinics and a waiting list of six. Runway is fine. Still early.',
      },
    ],
  },
  {
    key: 'equal-equity-split',
    daysAgo: 175,
    deliberationMinutes: 180,
    title: 'Split Fernhill equity evenly with Dana?',
    summary: 'Divide founder equity fifty-fifty with four-year vesting for both of us.',
    context:
      'I wrote more of the prototype, and Dana brought the clinic relationships. A lawyer suggested we decide before any money comes in.',
    alternatives: 'Split evenly. Split sixty-forty in my favor. Split by a formula based on past contributions.',
    chosenOption: 'Split evenly, with standard vesting and a one-year cliff for both.',
    reasoning:
      'Almost all of the work is ahead of us, not behind us. An uneven split would start a scoreboard that never goes away.',
    values: 'Fairness. Partnership.',
    uncertainties: 'Whether one of us ends up doing much more of the work.',
    predictedOutcome: 'Neither of us will raise the split as a problem in the first year.',
    predictedTimeframeDays: 365,
    confidenceLevel: 7,
    domainTag: 'FINANCE',
    customTags: ['fernhill', 'equity', 'cofounder'],
    outcomes: [
      {
        daysAgo: 60,
        outcomeRating: 'AS_EXPECTED',
        whatHappened: 'The split has not come up once. We argue about product, not ownership.',
      },
    ],
  },
  {
    key: 'weekly-parents-call',
    daysAgo: 150,
    title: 'Commit to a weekly call with my parents?',
    summary: 'Call my parents every Sunday at a fixed time.',
    context: 'Since starting Fernhill I have gone weeks without calling home. My mother mentioned it lightly, which means it bothers her a lot.',
    alternatives: 'Call when I remember. Set a fixed weekly call. Visit monthly instead.',
    chosenOption: 'A fixed Sunday evening call.',
    reasoning: 'Good intentions have not worked for months. A fixed slot turns it from a decision into a habit.',
    values: 'Family.',
    confidenceLevel: 8,
    domainTag: 'RELATIONSHIPS',
    customTags: ['family', 'habits'],
    outcomes: [
      {
        daysAgo: 50,
        outcomeRating: 'MUCH_BETTER',
        whatHappened:
          'We have missed two Sundays in three months. My father started telling me stories I had never heard.',
      },
    ],
  },
  {
    key: 'first-customer-discount',
    daysAgo: 120,
    deliberationMinutes: 25,
    title: 'Give our first customer a 40 percent discount?',
    summary: 'Offer the first pilot clinic a 40 percent discount for a two-year commitment.',
    context: 'The first pilot clinic wants to convert to paid but says our list price is too high for a clinic their size.',
    alternatives: 'Hold the list price. Offer 40 percent off for a two-year term. Offer a smaller discount for one year.',
    chosenOption: 'Offer 40 percent off in exchange for a two-year commitment and a public case study.',
    reasoning:
      'A first paying customer and a case study are worth more right now than the revenue difference. The two-year term protects us from a quick churn.',
    values: 'Momentum. Learning from real customers.',
    uncertainties: 'Whether the discount anchors what other clinics expect to pay.',
    predictedOutcome: 'The case study will bring in at least two clinics at full price.',
    predictedTimeframeDays: 180,
    confidenceLevel: 5,
    domainTag: 'CAREER',
    customTags: ['fernhill', 'pricing', 'sales'],
    outcomes: [],
  },
  {
    key: 'fernhill-podcast',
    daysAgo: 90,
    title: 'Start a small podcast about building Fernhill?',
    summary: 'Record a fortnightly podcast with Dana about the decisions behind Fernhill.',
    context: 'Several clinic managers asked how we decide what to build. Writing posts keeps slipping down the list.',
    alternatives: 'Write a monthly newsletter. Record a fortnightly podcast. Do neither until we have more customers.',
    chosenOption: 'Record a fortnightly podcast for three months, then decide whether to continue.',
    reasoning: 'Talking is faster for both of us than writing, and it doubles as a record of our own reasoning.',
    values: 'Openness. Building in public.',
    uncertainties: 'Whether anyone listens. Whether it eats product time.',
    predictedOutcome: 'A small but loyal audience of clinic managers.',
    predictedTimeframeDays: 90,
    confidenceLevel: 3,
    domainTag: 'CREATIVE',
    customTags: ['fernhill', 'podcast', 'marketing'],
    outcomes: [],
  },
  {
    key: 'generalist-first-hire',
    daysAgo: 40,
    deliberationMinutes: 75,
    title: 'Hire a generalist engineer before a designer?',
    summary: 'Make the first Fernhill hire a generalist engineer rather than a product designer.',
    context:
      'We can afford one hire. Customers complain more about missing features than about the interface, but the interface is plainly rough.',
    alternatives: 'Hire a generalist engineer. Hire a product designer. Hire two part-time contractors.',
    chosenOption: 'Hire a generalist engineer.',
    reasoning:
      'Missing features are costing us renewals today, while the rough interface is costing us mostly pride. Dana can cover basic design for six more months.',
    values: 'Customer needs over our taste.',
    uncertainties: 'Whether a rough interface quietly slows down new sales.',
    predictedOutcome: 'We will ship the three most requested features before the next renewal cycle.',
    predictedTimeframeDays: 120,
    confidenceLevel: 6,
    domainTag: 'CAREER',
    customTags: ['fernhill', 'hiring'],
    outcomes: [],
  },
  {
    key: 'one-coffee-a-day',
    daysAgo: 10,
    title: 'Cut caffeine to one cup a day?',
    summary: 'Drop from four or five coffees a day to one in the morning.',
    context: 'Founder weeks have pushed my coffee intake up, and my sleep is slipping back toward where it was before therapy.',
    alternatives: 'Keep drinking what I drink. Cut to one cup. Quit caffeine entirely.',
    chosenOption: 'One cup in the morning, nothing after noon.',
    reasoning: 'Quitting entirely failed last time. One cup keeps the ritual without the afternoon crash.',
    values: 'Health. Sustainable habits.',
    uncertainties: 'A week of headaches.',
    predictedOutcome: 'Better sleep within three weeks.',
    predictedTimeframeDays: 21,
    confidenceLevel: 5,
    domainTag: 'HEALTH',
    customTags: ['sleep', 'habits'],
    outcomes: [],
  },
]
