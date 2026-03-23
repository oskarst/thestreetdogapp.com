"use client";

import { useCallback } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import { useDotButton } from "@/hooks/use-embla-dots";

interface DogImageCarouselProps {
  images: string[];
  name: string;
}

export function DogImageCarousel({ images, name }: DogImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const { selectedIndex, scrollSnaps, onDotButtonClick } =
    useDotButton(emblaApi);

  if (images.length === 0) {
    return (
      <div className="relative aspect-[4/3] w-full rounded-xl bg-muted flex items-center justify-center">
        <span className="text-6xl text-muted-foreground">&#128021;</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={emblaRef} className="overflow-hidden rounded-xl">
        <div className="flex">
          {images.map((url, i) => (
            <div key={i} className="min-w-0 flex-[0_0_100%]">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={url}
                  alt={`${name} photo ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 672px"
                  priority={i === 0}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {scrollSnaps.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {scrollSnaps.map((_, i) => (
            <button
              key={i}
              onClick={() => onDotButtonClick(i)}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === selectedIndex
                  ? "bg-foreground"
                  : "bg-foreground/20"
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
