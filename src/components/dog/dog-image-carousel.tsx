"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import { useDotButton } from "@/hooks/use-embla-dots";

interface DogImageCarouselProps {
  images: string[];
  name: string;
  /** Ear-tag photo, shown as a labeled final slide when present. */
  earTagImage?: string | null;
}

export function DogImageCarousel({
  images,
  name,
  earTagImage,
}: DogImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const { selectedIndex, scrollSnaps, onDotButtonClick } =
    useDotButton(emblaApi);

  // Dog photos first, then the ear-tag shot (if any) as the last slide so a
  // left-swipe reveals it. Ear-tag photos use object-contain so the tag
  // number isn't cropped; dog photos stay object-cover.
  const slides = [
    ...images.map((url) => ({ url, isEarTag: false })),
    ...(earTagImage ? [{ url: earTagImage, isEarTag: true }] : []),
  ];

  if (slides.length === 0) {
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
          {slides.map((slide, i) => (
            <div key={i} className="min-w-0 flex-[0_0_100%]">
              <div className="relative aspect-[4/3] w-full bg-muted">
                <Image
                  src={slide.url}
                  alt={
                    slide.isEarTag
                      ? `${name} ear tag`
                      : `${name} photo ${i + 1}`
                  }
                  fill
                  className={slide.isEarTag ? "object-contain" : "object-cover"}
                  sizes="(max-width: 768px) 100vw, 672px"
                  priority={i === 0}
                />
                {slide.isEarTag && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">
                    Ear tag
                  </span>
                )}
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
                i === selectedIndex ? "bg-foreground" : "bg-foreground/20"
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
