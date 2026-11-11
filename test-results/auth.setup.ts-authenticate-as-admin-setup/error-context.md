# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> authenticate as admin
- Location: tests\e2e\auth.setup.ts:37:6

# Error details

```
TimeoutError: page.waitForURL: Timeout 60000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

```
Tearing down "context" exceeded the test timeout of 120000ms.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - link "getpidief" [ref=e5] [cursor=pointer]:
        - /url: /
        - generic [ref=e6]: getpidief
      - generic [ref=e9]:
        - generic [ref=e10]:
          - heading "Welcome back, Scholar." [level=1] [ref=e11]
          - paragraph [ref=e12]: Access your institutional archive and continue your research.
        - generic [ref=e13]:
          - button "Sign in with Google" [ref=e14]:
            - img [ref=e15]
            - generic [ref=e20]: Continue with Google
          - generic [ref=e23]: or continue with email
          - generic [ref=e25]:
            - generic [ref=e26]:
              - text: Institutional Email
              - textbox "Institutional Email" [ref=e27]:
                - /placeholder: you@university.edu
                - text: admin@getpidief.dev
            - generic [ref=e28]:
              - generic [ref=e29]:
                - generic [ref=e30]: Password
                - link "Forgot password?" [ref=e31] [cursor=pointer]:
                  - /url: /forgot-password
              - generic [ref=e32]:
                - textbox "Password" [ref=e33]:
                  - /placeholder: ••••••••
                  - text: Password123!
                - button "Show password" [ref=e34]:
                  - img [ref=e35]
            - generic [ref=e38] [cursor=pointer]:
              - checkbox "Remember me for 30 days" [ref=e39]
              - generic [ref=e40]: Remember me for 30 days
            - button "Signing in…" [disabled] [ref=e41]:
              - generic [ref=e42]:
                - img [ref=e43]
                - text: Signing in…
            - paragraph [ref=e46]:
              - text: New to getpidief?
              - link "Create your scholar profile →" [ref=e47] [cursor=pointer]:
                - /url: /register
          - generic [ref=e48]:
            - img [ref=e49]
            - generic [ref=e52]: Secured with 256-bit encryption · SOC 2 compliant
      - paragraph [ref=e53]:
        - text: © 2026getpidief. All rights reserved. ·
        - link "Privacy" [ref=e54] [cursor=pointer]:
          - /url: /privacy
        - text: ·
        - link "Terms" [ref=e55] [cursor=pointer]:
          - /url: /terms
    - generic [ref=e57]:
      - generic [ref=e58]:
        - generic [ref=e59]: 2.4M+Documents
        - generic [ref=e60]: 850+Institutions
        - generic [ref=e61]: 180K+Scholars
      - generic [ref=e62]:
        - paragraph [ref=e63]: The Archive That Thinks.
        - paragraph [ref=e64]: Millions of verified academic resources — curated by students, trusted by scholars. Discover, share, and study smarter.
      - generic [ref=e65]:
        - paragraph [ref=e66]: "\"getpidief saved me weeks of searching. Every past paper for my entire course, organised and searchable.\""
        - generic [ref=e67]:
          - generic [ref=e68]: AM
          - generic [ref=e69]:
            - paragraph [ref=e70]: Amara M.
            - paragraph [ref=e71]: Computer Science · UCT
          - generic [ref=e72]:
            - img [ref=e73]
            - img [ref=e75]
            - img [ref=e77]
            - img [ref=e79]
            - img [ref=e81]
  - region "Notifications alt+T"
  - generic [ref=e84]:
    - img [ref=e86]
    - button "Open Tanstack query devtools" [ref=e134] [cursor=pointer]:
      - img [ref=e135]
  - button "Open Next.js Dev Tools" [ref=e188] [cursor=pointer]:
    - generic [ref=e191]:
      - text: Rendering
      - generic [ref=e192]:
        - generic [ref=e193]: .
        - generic [ref=e194]: .
        - generic [ref=e195]: .
  - alert [ref=e196]
```