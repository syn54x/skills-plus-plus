export const meta = {
  name: 'review-panel',
  description: 'Fan out one read-only reviewer per Persona over a pull request and return each Persona\'s findings JSON',
  whenToUse: 'Started by the review-panel skill with { pr, personas }. It only fans out: deduplication and the verdict happen in the skill.',
  phases: [{ title: 'Fan out', detail: 'one reviewer per Persona, all at once' }],
}

// args: { pr: number, personas: string[] }
const { pr, personas } = args ?? {}
if (!Number.isInteger(pr) || pr < 1) throw new Error('args.pr must be a pull request number')
const valid = Array.isArray(personas) && personas.length > 0 && personas.every((p) => /^[a-z][a-z-]*$/.test(p))
if (!valid || new Set(personas).size !== personas.length) throw new Error('args.personas must be distinct Persona names, such as correctness')

const FINDINGS = {
  type: 'object',
  properties: {
    persona: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'integer' },
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'important', 'minor'] },
          confidence: { type: 'number' },
          law: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['file', 'line', 'title', 'severity', 'confidence', 'body'],
      },
    },
  },
  required: ['persona', 'findings'],
}

// The same one-sentence prompt the skill gives a reviewer when it fans out without this workflow.
const prompt = (persona) =>
  `You are the ${persona} Persona on the panel for pull request ${pr}. The panel directory is spp-panel-${pr} under $TMPDIR (/tmp when it is unset). ` +
  'Read PERSONAS.md there (the rules, then your section), then context.md, and reply with your findings JSON only.'

phase('Fan out')
const results = await parallel(personas.map((persona) => () => agent(prompt(persona), { label: persona, agentType: 'spp:reviewer', schema: FINDINGS })))

const failed = personas.filter((_, i) => !results[i])
if (failed.length) log(`No findings came back from: ${failed.join(', ')}. Their entries are null; run them again.`)

// One entry per requested Persona, in the order asked; null where a reviewer failed.
return personas.map((persona, i) => results[i] && { persona, findings: results[i].findings })
