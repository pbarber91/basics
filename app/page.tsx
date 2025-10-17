// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Page() {
  return (
    <div className="space-y-10">
      {/* HERO — full-bleed, edge-to-edge */}
      <section className="relative -mx-4 md:-mx-0">
        <div className="relative h-[75vh] w-full overflow-hidden rounded-2xl border border-border">
          {/* Background image */}
          <Image
            src="/images/hero.jpg"
            alt="Mission Community Church"
            fill
            priority
            className="object-cover"
          />
          {/* Overlay gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10 dark:from-black/70 dark:via-black/40" />

          {/* Content */}
          <div className="relative z-10 flex h-full items-end">
            <div className="mx-auto grid w-full max-w-6xl gap-4 p-6 text-white">
              {/* Logo + eyebrow */}
              <div className="flex items-center gap-3">
  {/* Logo wrapped in a subtle pill so it’s visible on any photo */}
  <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-black/40 p-1 backdrop-blur-sm">
    <Image
      src="/brand/mcc-logo.svg"   // file lives at /public/brand/mcc-logo.svg
      alt="Mission Community Church"
      width={24}
      height={24}
      priority
    />
  </span>

  <span className="text-xs uppercase tracking-widest opacity-90">
    Mission Community Church
  </span>
</div>


              <h1 className="max-w-3xl text-4xl font-bold sm:text-5xl">
                Grow Together. Learn Together.
              </h1>
              <p className="max-w-2xl text-sm sm:text-base opacity-95">
                Learn, practice, and grow together—rooted in the Foursquare Church’s statement of faith and shaped by MCC’s heartbeat for real, gospel-formed community.
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Link href="/catalog">
                  <Button size="lg">See Courses</Button>
                </Link>
                <a href="https://www.facebook.com/mymissioncommunity" target="_blank" rel="noreferrer">
                  <Button size="lg" variant="secondary">Church Online</Button>
                </a>
                <a href="https://www.mymissioncc.com/about" target="_blank" rel="noreferrer" className="underline text-sm opacity-90">
                  About Mission Community Church
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY BASICS + MCC DISTINCTIVES */}
      <section className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle>Our Goal</CardTitle>
            <CardDescription>Foundations you can build on.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            We want to give a clear, relational path through the essentials of following Jesus—Scripture, prayer, community, mission—so new and seasoned believers grow together on solid ground.
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle>Community at MCC</CardTitle>
            <CardDescription>Church is family.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            At Mission, we believe church is family; we do life together in communities—learning to be with Jesus, be like Jesus, and do as Jesus did. Formation happens when we go deep together.
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle>Powered by Foursquare</CardTitle>
            <CardDescription>Our theological home.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Basics keeps in step with the Foursquare Church’s declaration of faith and Spirit-empowered life, contextualized for Mission Community Church.
          </CardContent>
        </Card>
      </section>

      {/* PROGRAM PREVIEW */}
      <section className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold">What you’ll experience</h2>
            <p className="text-sm text-muted-foreground">Each week includes teaching, practice, reflection, and resources.</p>
          </div>
          
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Short Videos", desc: "Simple walkthroughs every step of the way." },
            { title: "Session Guides", desc: "Read online + fillable PDF." },
            { title: "Reflection Journals", desc: "Saved locally; export to .txt." },
            { title: "Leader Extras", desc: "Role-specific resources each week." },
          ].map((f) => (
            <Card key={f.title} className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription>{f.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* MCC FEATURE ROW (rotatable) */}
      <section className="mx-auto max-w-6xl">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle>Communities at Mission</CardTitle>
              <CardDescription>Grow deeper, together.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Long-term groups that gather in homes—where we live out discipleship: be with Jesus, be like Jesus, do as Jesus did. Formation happens when we go deep together.
              <div className="mt-3">
                <a href="https://www.mymissioncc.com/groups" target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">Explore Communities</Button>
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle>What's Happening?</CardTitle>
              <CardDescription>See what’s happening for you and your family.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Check the latest events and find ways to participate as a family throughout the year.
              <div className="mt-3">
                <a href="https://www.mymissioncc.com/events" target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">Learn More</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CALL TO ACTION BAND */}
      <section className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-xl font-semibold">Ready to begin?</h3>
              <p className="text-sm text-muted-foreground">
                Start Week 1 and invite a friend or Community to go with you.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/courses/basics">
                <Button size="lg">Start Basics</Button>
              </Link>
             
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER BAND (MCC identity) */}
      <section className="mx-auto max-w-6xl">
        <Separator className="mb-4" />
        <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <div>
            <div className="font-medium text-foreground">Mission Community Church</div>
            <div>2637 Dr. Martin Luther King Jr. Blvd<br/>Fort Myers, FL 33916</div>
          </div>
          <div>
            <div>(239) 940-8911</div>
            <div><a className="underline" href="mailto:info@mymissioncc.com">info@mymissioncc.com</a></div>
          </div>
          <div>
            <a className="underline" href="https://www.mymissioncc.com/" target="_blank" rel="noreferrer">mymissioncc.com</a>
          </div>
        </div>
      </section>
    </div>
  );
}
