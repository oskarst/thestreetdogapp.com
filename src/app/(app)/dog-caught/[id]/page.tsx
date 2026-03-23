import Link from "next/link";
import { Trophy, ArrowLeft, Dog } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DogCaughtPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ points?: string; catchType?: string }>;
}

export default async function DogCaughtPage({
  params,
  searchParams,
}: DogCaughtPageProps) {
  const { id } = await params;
  const { points: pointsStr, catchType } = await searchParams;
  const points = parseInt(pointsStr ?? "1", 10);

  let title: string;
  let message: string;

  switch (catchType) {
    case "new":
      title = "New Dog!";
      message = "Congratulations! You registered a brand new dog!";
      break;
    case "first_catch":
      title = "First Catch!";
      message = "You spotted this dog for the first time!";
      break;
    default:
      title = "Repeat Sighting";
      message = "You spotted this dog again! Every sighting counts.";
  }

  return (
    <div className="container mx-auto flex max-w-lg flex-col items-center px-4 py-12 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10">
        <Trophy className="size-10 text-primary" />
      </div>

      <h1 className="mb-2 text-3xl font-bold">{title}</h1>
      <p className="mb-6 text-muted-foreground">{message}</p>

      <Card className="mb-8 w-full">
        <CardContent className="flex flex-col items-center py-6">
          <span className="text-5xl font-bold text-primary">+{points}</span>
          <span className="mt-1 text-sm text-muted-foreground">
            points earned
          </span>
        </CardContent>
      </Card>

      <div className="flex w-full flex-col gap-3">
        <Link
          href={`/dog/${id}`}
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          <Dog className="size-4" />
          View Dog Profile
        </Link>
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-full"
          )}
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
