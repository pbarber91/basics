export type Resource = { label: string; href: string; restricted?: "LEADER" | "ADMIN" };
export type Week = {
  weekNumber: number;
  title: string;
  summary: string;
  videoUrl: string;
  captionsVttUrl?: string;
  transcript?: string; // plain text for toggle
  guideOnlineUrl: string;
  guidePdfUrl: string; // link to fillable PDF asset
  reflectionPrompts: string[];
  resources: Resource[];
  thumbnail?: string; // NEW: points to /public images (e.g., "/images/weeks/week-1.jpg")
};

export const weeks: Week[] = [
  {
    weekNumber: 1,
    title: "What is the Gospel?",
    summary: "Core of the Good News and response in faith and repentance.",
    videoUrl: "/videos/week1.mp4",
    captionsVttUrl: "/captions/week1.vtt",
    transcript: "[Transcript placeholder for Week 1]",
    guideOnlineUrl: "/guides/week1.html",
    guidePdfUrl: "/guides/week1-fillable.pdf",
    reflectionPrompts: [
      "In your words, what is the Gospel?",
      "Where have you seen grace at work in your story?",
      "What questions do you still have about following Jesus?"
    ],
    resources: [
      { label: "Foursquare — What We Believe", href: "https://www.foursquare.org/beliefs/" },
      { label: "Leader Facilitation Notes (Week 1)", href: "/leader/week1-notes.pdf", restricted: "LEADER" },
      { label: "Admin: Feedback Form Template", href: "/admin/week1-feedback.docx", restricted: "ADMIN" }
    ],
    thumbnail: "/images/weeks/week-1.webp"
  },
  {
    weekNumber: 2,
    title: "Scripture: God’s Word",
    summary: "Authority and reliability of Scripture; how to read it well.",
    videoUrl: "/videos/week2.mp4",
    captionsVttUrl: "/captions/week2.vtt",
    transcript: "[Transcript placeholder for Week 2]",
    guideOnlineUrl: "/guides/week2.html",
    guidePdfUrl: "/guides/week2-fillable.pdf",
    reflectionPrompts: [
      "What passage has shaped you recently?",
      "Where do you feel stuck reading the Bible?"
    ],
    resources: [
      { label: "Foursquare — Scripture", href: "https://www.foursquare.org/beliefs/" },
      { label: "Leader: Discussion Questions", href: "/leader/week2-discussion.pdf", restricted: "LEADER" }
    ],
    thumbnail: "/images/weeks/week-2.webp"
  },
  {
    weekNumber: 3,
    title: "Prayer & Presence",
    summary: "Learning rhythms of prayer and daily companionship with God.",
    videoUrl: "/videos/week3.mp4",
    captionsVttUrl: "/captions/week3.vtt",
    transcript: "[Transcript placeholder for Week 3]",
    guideOnlineUrl: "/guides/week3.html",
    guidePdfUrl: "/guides/week3-fillable.pdf",
    reflectionPrompts: ["How do you currently pray?", "What helps you listen for God?"],
    resources: [
      { label: "Leader: Prayer Lab Guide", href: "/leader/week3-lab.pdf", restricted: "LEADER" }
    ],
    thumbnail: "/images/weeks/week-3.webp"
  },
  {
    weekNumber: 4,
    title: "Holy Spirit & Empowered Life",
    summary: "Person and work of the Spirit; gifts and fruit.",
    videoUrl: "/videos/week4.mp4",
    captionsVttUrl: "/captions/week4.vtt",
    transcript: "[Transcript placeholder for Week 4]",
    guideOnlineUrl: "/guides/week4.html",
    guidePdfUrl: "/guides/week4-fillable.pdf",
    reflectionPrompts: ["Where have you sensed the Spirit’s leading?"],
    resources: [
      { label: "Leader: Prayer Ministry Safeguards", href: "/leader/week4-safeguards.pdf", restricted: "LEADER" }
    ],
    thumbnail: "/images/weeks/week-4.webp"
  },
  {
    weekNumber: 5,
    title: "Community & Church",
    summary: "Life together; sacraments/ordinances; Foursquare distinctives.",
    videoUrl: "/videos/week5.mp4",
    captionsVttUrl: "/captions/week5.vtt",
    transcript: "[Transcript placeholder for Week 5]",
    guideOnlineUrl: "/guides/week5.html",
    guidePdfUrl: "/guides/week5-fillable.pdf",
    reflectionPrompts: ["Where do you need community?", "How can you serve?"],
    resources: [
      { label: "Leader: Group Covenant Template", href: "/leader/week5-covenant.docx", restricted: "LEADER" }
    ],
    thumbnail: "/images/weeks/week-5.webp"
  },
  {
    weekNumber: 6,
    title: "Mission & Witness",
    summary: "Joining God’s mission locally and globally.",
    videoUrl: "/videos/week6.mp4",
    captionsVttUrl: "/captions/week6.vtt",
    transcript: "[Transcript placeholder for Week 6]",
    guideOnlineUrl: "/guides/week6.html",
    guidePdfUrl: "/guides/week6-fillable.pdf",
    reflectionPrompts: ["Who are your 3 to pray for?"],
    resources: [
      { label: "Leader: Testimony Workshop", href: "/leader/week6-testimony.pdf", restricted: "LEADER" }
    ],
    thumbnail: "/images/weeks/week-6.webp"
  },
  {
    weekNumber: 7,
    title: "Practicing Holiness",
    summary: "Grace-powered transformation and spiritual disciplines.",
    videoUrl: "/videos/week7.mp4",
    captionsVttUrl: "/captions/week7.vtt",
    transcript: "[Transcript placeholder for Week 7]",
    guideOnlineUrl: "/guides/week7.html",
    guidePdfUrl: "/guides/week7-fillable.pdf",
    reflectionPrompts: ["Which practice will you begin this week?"],
    resources: [
      { label: "Leader: Care Escalation Path", href: "/leader/week7-care.pdf", restricted: "LEADER" }
    ],
    thumbnail: "/images/weeks/week-7.webp"
  },
  {
    weekNumber: 8,
    title: "Next Steps & Commissioning",
    summary: "Baptism, membership, serving, and ongoing growth.",
    videoUrl: "/videos/week8.mp4",
    captionsVttUrl: "/captions/week8.vtt",
    transcript: "[Transcript placeholder for Week 8]",
    guideOnlineUrl: "/guides/week8.html",
    guidePdfUrl: "/guides/week8-fillable.pdf",
    reflectionPrompts: ["What is your next faithful step?"],
    resources: [
      { label: "Leader: Celebration Guide", href: "/leader/week8-celebration.pdf", restricted: "LEADER" }
    ],
    thumbnail: "/images/weeks/week-8.webp"
  }
];
