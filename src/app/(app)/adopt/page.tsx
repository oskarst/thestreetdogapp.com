import { Heart, PawPrint, Mail, Phone, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdoptPage() {
  return (
    <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-rose-500" />
        <h1 className="text-xl font-bold">Adopt a Street Dog</h1>
      </div>

      <p className="text-muted-foreground">
        Every street dog in Tbilisi deserves a loving home. By adopting, you
        give a dog a second chance at life and gain a loyal companion.
      </p>

      {/* Why Adopt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PawPrint className="h-4 w-4 text-primary" />
            Why Adopt a Street Dog?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
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
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </span>
            <div>
              <p className="font-medium text-foreground">Find a Dog</p>
              <p>Browse the gallery or map to find a dog you connect with.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              2
            </span>
            <div>
              <p className="font-medium text-foreground">Contact Us</p>
              <p>Reach out to our adoption coordinator with the dog&apos;s ID.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              3
            </span>
            <div>
              <p className="font-medium text-foreground">Meet & Greet</p>
              <p>We arrange a meeting so you and the dog can get to know each other.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              4
            </span>
            <div>
              <p className="font-medium text-foreground">Take Them Home</p>
              <p>Complete paperwork and welcome your new family member!</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What to Expect */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PawPrint className="h-4 w-4 text-primary" />
            What to Expect
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Street dogs may need time to adjust to indoor life. Here are a few
            things to keep in mind:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Allow 2-4 weeks for the dog to settle in</li>
            <li>Be patient with house training</li>
            <li>Schedule a vet checkup within the first week</li>
            <li>Provide a quiet, safe space for the dog to retreat to</li>
            <li>Introduce other pets gradually</li>
          </ul>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            Ready to Adopt?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Contact our adoption coordinator to start the process:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>adopt@streetdog.app</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>+995 XXX XXX XXX</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Mon-Fri, 10:00 - 18:00</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
