import type { CreateDecisionInput } from '@/lib/validations/decision'

export const BIAS_REPORT_THRESHOLD = 10

type StarterPrompt = {
  domain: 'CAREER' | 'FINANCE' | 'HEALTH' | 'RELATIONSHIPS' | 'CREATIVE' | 'OTHER'
  label: string
  description: string
  seed: Partial<CreateDecisionInput>
}

export const STARTER_DECISION_PROMPTS: StarterPrompt[] = [
  {
    domain: 'CAREER',
    label: 'Career crossroads',
    description: 'Use this when you are weighing a role change, promotion, or big professional commitment.',
    seed: {
      title: 'Deciding whether to pursue a new career opportunity',
      summary: 'I am choosing between staying on my current path and pursuing a new role or responsibility that could meaningfully change my career trajectory.',
      context: 'The opportunity looks promising, but I need to weigh learning, compensation, team quality, timing, and the tradeoffs it creates in the rest of my life.',
      alternatives: 'Option 1: Stay where I am. Option 2: Pursue the new opportunity. Option 3: Delay the move and gather more evidence first.',
      chosenOption: 'I am leaning toward the option that best matches my long-term growth, even if it creates some short-term discomfort.',
      reasoning: 'The main question is whether this move compounds my future options. I want to make the choice that gives me stronger skills, better leverage, and a healthier day-to-day path over time.',
      domainTag: 'CAREER',
    },
  },
  {
    domain: 'FINANCE',
    label: 'Money decision',
    description: 'Good for purchases, investments, savings moves, or any decision with real financial tradeoffs.',
    seed: {
      title: 'Deciding on a meaningful financial move',
      summary: 'I am evaluating a financial decision that could affect my savings, flexibility, or stress level over the next several months or years.',
      context: 'The upside is appealing, but I need to balance cash flow, downside risk, opportunity cost, and how confident I am in the assumptions behind this choice.',
      alternatives: 'Option 1: Move forward now. Option 2: Wait and keep optionality. Option 3: Choose a smaller or safer version of the same move.',
      chosenOption: 'I want to choose the option that protects downside while still serving the bigger goal behind this decision.',
      reasoning: 'The best answer is not just the highest upside. It is the choice that fits my real financial position, keeps regret manageable, and leaves room to adapt if conditions change.',
      domainTag: 'FINANCE',
    },
  },
  {
    domain: 'HEALTH',
    label: 'Health commitment',
    description: 'Helpful for habits, treatment choices, recovery plans, and decisions that affect your energy or wellbeing.',
    seed: {
      title: 'Deciding on a health or wellbeing commitment',
      summary: 'I am making a health-related decision that could change my daily routine, energy, or long-term wellbeing.',
      context: 'There are competing priorities around time, effort, cost, and uncertainty, and I want to capture what I know right now before outcomes or emotions change later.',
      alternatives: 'Option 1: Commit fully now. Option 2: Try a lighter or shorter version first. Option 3: Pause until I have better information.',
      chosenOption: 'I am leaning toward the option that I can follow consistently instead of the one that only looks ideal on paper.',
      reasoning: 'Sustainability matters more than intensity here. I want the choice that gives me the best chance of following through and learning from the outcome honestly.',
      domainTag: 'HEALTH',
    },
  },
  {
    domain: 'RELATIONSHIPS',
    label: 'Relationship call',
    description: 'Use for conversations, boundaries, commitments, or choices that affect important relationships.',
    seed: {
      title: 'Deciding how to handle an important relationship situation',
      summary: 'I need to make a decision that affects an important relationship, and the emotional stakes are high enough that I want to preserve my reasoning clearly.',
      context: 'Different options could protect harmony, honesty, boundaries, or future trust in different ways, and I want to be explicit about what I value most right now.',
      alternatives: 'Option 1: Address it directly now. Option 2: Wait and gather more clarity. Option 3: Choose a softer or more limited response.',
      chosenOption: 'I am leaning toward the option that is both honest and sustainable, even if it feels uncomfortable in the short term.',
      reasoning: 'The best choice is the one I can respect later. I want to act in a way that reflects my values instead of only reacting to immediate tension or fear.',
      domainTag: 'RELATIONSHIPS',
    },
  },
  {
    domain: 'CREATIVE',
    label: 'Creative bet',
    description: 'Useful for projects, launches, portfolios, experiments, and other creative risks.',
    seed: {
      title: 'Deciding whether to commit to a creative project',
      summary: 'I am choosing whether to invest time, energy, and reputation into a creative idea or project that could open new doors if it works.',
      context: 'The opportunity is exciting, but the path is uncertain, and I need to weigh ambition against capacity, timing, and the cost of not doing other things.',
      alternatives: 'Option 1: Commit and ship. Option 2: Run a smaller experiment first. Option 3: Keep the idea parked for later.',
      chosenOption: 'I am leaning toward the version that creates learning quickly without overcommitting beyond my current capacity.',
      reasoning: 'Creative work benefits from momentum, but not every idea deserves full commitment immediately. I want the path that gives me signal fast and keeps me honest about effort versus payoff.',
      domainTag: 'CREATIVE',
    },
  },
  {
    domain: 'OTHER',
    label: 'General life decision',
    description: 'A broad template for choices that do not fit neatly into one domain.',
    seed: {
      title: 'Deciding on an important life choice',
      summary: 'I am making a decision that matters enough to document, because I want to preserve the reasoning available to me before hindsight changes the story.',
      context: 'There are meaningful tradeoffs, incomplete information, and at least a few plausible paths, so I want to be clear about what matters most right now.',
      alternatives: 'Option 1: Move ahead now. Option 2: Wait and gather more evidence. Option 3: Choose a smaller or reversible version of the decision.',
      chosenOption: 'I am leaning toward the option that best fits my current goals, constraints, and tolerance for downside.',
      reasoning: 'A good decision here is not about certainty. It is about making the most thoughtful choice I can with the information I have today and being honest about what I am assuming.',
      domainTag: 'OTHER',
    },
  },
]

export function getMilestoneMessage(decisionCount: number) {
  if (decisionCount >= 10) {
    return {
      title: 'Your first Bias Report is unlocked',
      body: 'You now have enough decisions to generate a report and see patterns in your reasoning over time.',
      cta: 'Open Bias Reports',
      href: '/ai/reports',
    }
  }

  if (decisionCount >= 5) {
    return {
      title: "You've logged 5 decisions",
      body: 'You already have enough history to revisit earlier reasoning and compare how your confidence changes across domains.',
      cta: 'Review your archive',
      href: '/decisions',
    }
  }

  if (decisionCount >= 3) {
    return {
      title: "You've logged 3 decisions",
      body: 'Your archive is starting to become useful. Go back to your earliest entry and see how your original reasoning reads now.',
      cta: 'Revisit your first decisions',
      href: '/decisions',
    }
  }

  return null
}
