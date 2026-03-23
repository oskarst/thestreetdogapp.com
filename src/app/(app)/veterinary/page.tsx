import {
  Stethoscope,
  Heart,
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  Syringe,
  ShieldPlus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VeterinaryPage() {
  return (
    <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Veterinary Care</h1>
      </div>

      {/* Emergency */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            If you see a dog in immediate danger or severe distress, contact
            one of these clinics:
          </p>

          <div className="space-y-4">
            <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
              <p className="font-semibold text-foreground">Tbilisi Vet Emergency</p>
              <div className="mt-1 space-y-1 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>+995 32 2XX XX XX</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Rustaveli Ave, Tbilisi</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>24/7 Emergency Services</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
              <p className="font-semibold text-foreground">Pets Clinic Tbilisi</p>
              <div className="mt-1 space-y-1 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>+995 32 2XX XX XX</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Vake District, Tbilisi</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Mon-Sat 9:00 - 20:00</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
              <p className="font-semibold text-foreground">Animal Help Georgia</p>
              <div className="mt-1 space-y-1 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>+995 5XX XX XX XX</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Saburtalo, Tbilisi</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Mon-Fri 10:00 - 18:00</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Health Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            Common Health Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="space-y-2">
            <li>
              <span className="font-medium text-foreground">Injuries:</span>{" "}
              Limping, open wounds, bleeding from traffic or fights
            </li>
            <li>
              <span className="font-medium text-foreground">Malnutrition:</span>{" "}
              Visible ribs, lethargy, dull coat
            </li>
            <li>
              <span className="font-medium text-foreground">Parasites:</span>{" "}
              Hair loss, excessive scratching, visible ticks or fleas
            </li>
            <li>
              <span className="font-medium text-foreground">Distemper:</span>{" "}
              Coughing, nasal discharge, seizures
            </li>
            <li>
              <span className="font-medium text-foreground">Mange:</span>{" "}
              Patchy hair loss, scabby skin, persistent itching
            </li>
            <li>
              <span className="font-medium text-foreground">Behavioral:</span>{" "}
              Aggression, extreme fear, disorientation
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Vaccination Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="h-4 w-4 text-primary" />
            Vaccination Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p className="mb-3">
            Tbilisi&apos;s municipal program provides free vaccinations for
            registered street dogs:
          </p>
          <div className="space-y-2">
            <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="font-medium text-foreground">Rabies</span>
              <span>Annually</span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="font-medium text-foreground">DHPP</span>
              <span>Every 1-3 years</span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="font-medium text-foreground">Bordetella</span>
              <span>Annually</span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="font-medium text-foreground">Deworming</span>
              <span>Every 3-6 months</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* First Aid Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldPlus className="h-4 w-4 text-primary" />
            First Aid Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium text-foreground">Do not approach</span>{" "}
              an aggressive or frightened dog directly
            </li>
            <li>
              Offer water and food from a safe distance if the dog seems calm
            </li>
            <li>
              For bleeding wounds, apply gentle pressure with a clean cloth
            </li>
            <li>
              Do not attempt to move a dog with suspected broken bones
            </li>
            <li>
              Use the app&apos;s report feature to alert volunteers and vets
            </li>
            <li>
              Keep the dog warm with a blanket if it appears to be in shock
            </li>
          </ul>
          <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs">
            Always prioritize your safety. If a dog is aggressive or
            you are unsure how to help, call a vet clinic or submit a report
            through the app instead.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
