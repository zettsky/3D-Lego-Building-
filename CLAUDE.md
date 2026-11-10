# Project rules for Claude

## Usage limit

Before starting any new session in this project (parallel, background or side sessions,
including subagent-backed sessions), check the user's plan usage. If **weekly usage is over
85%**, do not start it: ask the user first and wait for an explicit yes.
