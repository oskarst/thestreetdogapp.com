import { Mail, Phone, Clock } from "lucide-react";
import { SectionLabel } from "@/components/ui/section-label";

export default function AdoptPage() {
  return (
    <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
      <div className="px-1">
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1.5">
          Pack · Adoption
        </div>
        <h1 className="text-[26px] font-bold tracking-[-0.02em] leading-tight">
          Adopt a street dog
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Every street dog in Tbilisi deserves a loving home. By adopting, you
          give a dog a second chance at life and gain a loyal companion.
        </p>
      </div>

      <section>
        <SectionLabel>Why Adopt a Street Dog?</SectionLabel>
        <div className="card-soft p-4 space-y-2 text-sm text-muted-foreground">
          <p>
            Tbilisi&apos;s street dogs are remarkably resilient, social, and
            affectionate. Many have been ear-tagged, vaccinated, and monitored
            by volunteers through this app.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Street dogs are already adapted to city life</li>
            <li>Most are socialized and good with people</li>
            <li>You free up resources for other dogs in need</li>
            <li>Adoption fees cover vaccinations and spay/neuter</li>
          </ul>
        </div>
      </section>

      <section>
        <SectionLabel meta="4 steps">How It Works</SectionLabel>
        <div className="card-soft p-4 space-y-3 text-sm">
          {[
            {
              n: "01",
              title: "Find a dog",
              body: "Browse the gallery or map to find a dog you connect with.",
            },
            {
              n: "02",
              title: "Contact us",
              body: "Reach out to our adoption coordinator with the dog's ID.",
            },
            {
              n: "03",
              title: "Meet & greet",
              body: "We arrange a meeting so you and the dog can get to know each other.",
            },
            {
              n: "04",
              title: "Take them home",
              body: "Complete paperwork and welcome your new family member.",
            },
          ].map((s) => (
            <div key={s.n} className="flex gap-3">
              <span className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground shrink-0 pt-0.5">
                {s.n}
              </span>
              <div>
                <p className="font-semibold text-ink">{s.title}</p>
                <p className="text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>What to Expect</SectionLabel>
        <div className="card-soft p-4 space-y-2 text-sm text-muted-foreground">
          <p>
            Street dogs may need time to adjust to indoor life. Keep these in
            mind:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Allow 2–4 weeks for the dog to settle in</li>
            <li>Be patient with house training</li>
            <li>Schedule a vet checkup within the first week</li>
            <li>Provide a quiet, safe space for the dog to retreat to</li>
            <li>Introduce other pets gradually</li>
          </ul>
        </div>
      </section>

      <section>
        <SectionLabel meta="contact">Ready to Adopt?</SectionLabel>
        <div className="card-soft p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Contact our adoption coordinator to start the process:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 font-mono text-[12px] tracking-[0.04em] text-ink">
              <Mail className="size-4 text-muted-foreground" />
              adopt@streetdog.app
            </div>
            <div className="flex items-center gap-2.5 font-mono text-[12px] tracking-[0.04em] text-ink">
              <Phone className="size-4 text-muted-foreground" />
              +995 XXX XXX XXX
            </div>
            <div className="flex items-center gap-2.5 font-mono text-[12px] tracking-[0.04em] text-muted-foreground">
              <Clock className="size-4" />
              Mon–Fri, 10:00–18:00
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
