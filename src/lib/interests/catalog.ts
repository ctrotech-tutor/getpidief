// A small starting vocabulary, not demo content. Records are created only when selected.
export const STARTER_TOPICS = [
  { name: "Technology", slug: "technology" }, { name: "Artificial Intelligence", slug: "artificial-intelligence" },
  { name: "Programming", slug: "programming" }, { name: "Science", slug: "science" },
  { name: "Health & Medicine", slug: "health-medicine" }, { name: "Psychology", slug: "psychology" },
  { name: "Business", slug: "business" }, { name: "Economics", slug: "economics" },
  { name: "Design", slug: "design" }, { name: "Arts & Culture", slug: "arts-culture" },
  { name: "Education", slug: "education" }, { name: "Engineering", slug: "engineering" },
  { name: "Law", slug: "law" }, { name: "History", slug: "history" },
  { name: "Literature", slug: "literature" }, { name: "Environment", slug: "environment" },
  { name: "Mathematics", slug: "mathematics" }, { name: "Personal Growth", slug: "personal-growth" },
  { name: "Research", slug: "research" }, { name: "Career & Work", slug: "career-work" },
  { name: "Entrepreneurship", slug: "entrepreneurship" }, { name: "Society", slug: "society" },
  { name: "Languages", slug: "languages" }, { name: "Agriculture", slug: "agriculture" },
] as const;
export type TopicChoice = { id: string; name: string; slug: string };
