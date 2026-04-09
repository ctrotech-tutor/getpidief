import { http, HttpResponse } from "msw";

const BASE = "http://localhost:3000";

export const handlers = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  http.get(`${BASE}/api/auth/session`, () =>
    HttpResponse.json({
      user: { id: "test-user-id", email: "test@example.com", role: "student",
              onboardingComplete: true, username: "testuser" },
      expires: new Date(Date.now() + 86400 * 1000).toISOString(),
    })
  ),
  http.post(`${BASE}/api/auth/signin/credentials`, () =>
    HttpResponse.json({ url: `${BASE}/explore` })
  ),
  http.post(`${BASE}/api/auth/signout`, () =>
    HttpResponse.json({ url: `${BASE}/login` })
  ),

  // ── Search ────────────────────────────────────────────────────────────────
  http.get(`${BASE}/api/search`, ({ request }) => {
    const url = new URL(request.url);
    const q   = url.searchParams.get("q");
    return HttpResponse.json({
      data: {
        results:      q ? mockDocuments.filter((d) => d.title.includes(q)) : mockDocuments,
        total:        mockDocuments.length,
        page:         1,
        totalPages:   1,
        queryTimeMs:  12,
      },
    });
  }),

  http.get(`${BASE}/api/search/autocomplete`, () =>
    HttpResponse.json({
      data: [
        { type: "popular",  label: "data structures" },
        { type: "popular",  label: "algorithms"       },
        { type: "document", label: "CS201 Past Exam 2023", href: "/d/cs201-past-exam" },
      ],
    })
  ),

  // ── Institutions ──────────────────────────────────────────────────────────
  http.get(`${BASE}/api/institutions`, () =>
    HttpResponse.json({ data: mockInstitutions })
  ),

  // ── Categories ────────────────────────────────────────────────────────────
  http.get(`${BASE}/api/categories`, () =>
    HttpResponse.json({ data: mockCategories })
  ),

  // ── Notifications ─────────────────────────────────────────────────────────
  http.get(`${BASE}/api/notifications`, () =>
    HttpResponse.json({ data: { items: [], unreadCount: 0 } })
  ),
];

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockDocuments = [
  {
    id:            "doc-1",
    slug:          "cs201-past-exam-2023",
    title:         "CS201 Data Structures Past Exam 2023",
    resourceType:  "past_exam",
    downloadCount: 1240,
    likeCount:     89,
    institution:   { id: "inst-1", name: "UCT" },
    author:        { id: "user-1", username: "jdoe", displayName: "Jane Doe" },
  },
];

const mockInstitutions = [
  { id: "inst-1", name: "University of Cape Town", slug: "uct", country: "South Africa", countryCode: "ZA", type: "university" },
  { id: "inst-2", name: "University of Lagos",     slug: "unilag", country: "Nigeria",      countryCode: "NG", type: "university" },
];

const mockCategories = [
  { id: "cat-1", name: "Computer Science", slug: "computer-science", color: "#2563EB" },
  { id: "cat-2", name: "Law",              slug: "law",              color: "#7C3AED" },
];
