import { Phone, MapPin, Clock, AlertTriangle } from "lucide-react";
import { SectionLabel } from "@/components/ui/section-label";

const CLINICS = [
  {
    name: "Tbilisi Vet Emergency",
    phone: "+995 32 2XX XX XX",
    addr: "Rustaveli Ave, Tbilisi",
    hours: "24/7 emergency services",
  },
  {
    name: "Pets Clinic Tbilisi",
    phone: "+995 32 2XX XX XX",
    addr: "Vake District, Tbilisi",
    hours: "Mon–Sat 9:00–20:00",
  },
  {
    name: "Animal Help Georgia",
    phone: "+995 5XX XX XX XX",
    addr: "Saburtalo, Tbilisi",
    hours: "Mon–Fri 10:00–18:00",
  },
];

export default function VeterinaryPage() {
  return (
    <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
      <div className="px-1">
        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-1.5">
          Pack · Veterinary
        </div>
        <h1 className="text-[28.6px] font-bold tracking-[-0.02em] leading-tight">
          Veterinary care
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Field references for keeping the pack healthy.
        </p>
      </div>

      <section>
        <SectionLabel meta="3 listed">Emergency Contacts</SectionLabel>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-3">
          <div className="flex items-start gap-2 text-sm text-destructive font-medium">
            <AlertTriangle className="size-4 mt-0.5 shrink-0" />
            If you see a dog in immediate danger or severe distress, call one of
            these clinics first.
          </div>
          {CLINICS.map((c) => (
            <div
              key={c.name}
              className="rounded-xl border border-rule bg-card p-3 space-y-1.5"
            >
              <p className="font-semibold text-ink text-sm">{c.name}</p>
              <div className="flex items-center gap-2 font-mono text-[13.2px] tracking-[0.04em] text-ink">
                <Phone className="size-3.5 text-muted-foreground" />
                {c.phone}
              </div>
              <div className="flex items-center gap-2 font-mono text-[13.2px] tracking-[0.04em] text-muted-foreground">
                <MapPin className="size-3.5" />
                {c.addr}
              </div>
              <div className="flex items-center gap-2 font-mono text-[13.2px] tracking-[0.04em] text-muted-foreground">
                <Clock className="size-3.5" />
                {c.hours}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Common Health Issues</SectionLabel>
        <div className="card-soft p-4 text-sm text-muted-foreground">
          <ul className="space-y-2">
            <li>
              <span className="font-semibold text-ink">Injuries:</span> limping,
              open wounds, bleeding from traffic or fights
            </li>
            <li>
              <span className="font-semibold text-ink">Malnutrition:</span>{" "}
              visible ribs, lethargy, dull coat
            </li>
            <li>
              <span className="font-semibold text-ink">Parasites:</span> hair
              loss, excessive scratching, visible ticks or fleas
            </li>
            <li>
              <span className="font-semibold text-ink">Distemper:</span>{" "}
              coughing, nasal discharge, seizures
            </li>
            <li>
              <span className="font-semibold text-ink">Mange:</span> patchy hair
              loss, scabby skin, persistent itching
            </li>
            <li>
              <span className="font-semibold text-ink">Behavioral:</span>{" "}
              aggression, extreme fear, disorientation
            </li>
          </ul>
        </div>
      </section>

      <section>
        <SectionLabel meta="municipal program">
          Vaccination Schedule
        </SectionLabel>
        <div className="card-soft p-4 text-sm">
          <p className="text-muted-foreground mb-3">
            Tbilisi&apos;s municipal program provides free vaccinations for
            registered street dogs:
          </p>
          <div className="space-y-1.5">
            {[
              ["Rabies", "Annually"],
              ["DHPP", "Every 1–3 years"],
              ["Bordetella", "Annually"],
              ["Deworming", "Every 3–6 months"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between rounded-xl bg-background border border-rule px-3 py-2.5"
              >
                <span className="font-semibold text-ink">{k}</span>
                <span className="font-mono text-[13.2px] tracking-[0.04em] text-muted-foreground">
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>First Aid Tips</SectionLabel>
        <div className="card-soft p-4 space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-semibold text-ink">Do not approach</span> an
              aggressive or frightened dog directly
            </li>
            <li>
              Offer water and food from a safe distance if the dog seems calm
            </li>
            <li>
              For bleeding wounds, apply gentle pressure with a clean cloth
            </li>
            <li>Do not attempt to move a dog with suspected broken bones</li>
            <li>
              Use the app&apos;s report feature to alert volunteers and vets
            </li>
            <li>
              Keep the dog warm with a blanket if it appears to be in shock
            </li>
          </ul>
          <p className="mt-3 rounded-xl bg-background border border-rule p-3 text-xs leading-relaxed">
            Always prioritize your safety. If a dog is aggressive or you&apos;re
            unsure how to help, call a vet clinic or submit a report through the
            app instead.
          </p>
        </div>
      </section>
    </div>
  );
}
