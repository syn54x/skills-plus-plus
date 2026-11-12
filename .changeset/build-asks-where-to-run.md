---
"@syn54x/spp": minor
---

`/build <N>` in the desktop app now asks one question first: run the build here, or in a sub-session. It recommends the sub-session when your session has already started other sessions or sits outside N's checkout. A sub-session starts in the checkout of N's repository (found one folder down when you are above it, or asked when there are none or several) and runs `building` there, and an answer you give in your own session to its question is passed on to it in your words. In a terminal nothing changes: `/build` builds here without asking. The choice lives in a new shared skill, `delegating`.
