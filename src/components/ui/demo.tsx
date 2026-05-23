import React from "react";
import { AwardBadge } from "@/components/ui/award-badge";
import { ScrollTiltedGrid } from "@/components/ui/scroll-tilted-grid";

const demoLink = "https://www.producthunt.com/golden-kitty-awards/hall-of-fame?year=2024#bootstrapped-small-teams-2";

export const GoldenKitty = () => {
  return (
    <div className="grid grid-cols-1 gap-4">
      <AwardBadge type="golden-kitty" link={demoLink} />
    </div>
  );
};

export const ProductOfTheDay = () => {
  return (
    <div className="grid grid-cols-1 gap-4">
      <AwardBadge type="product-of-the-day" place={1} link={demoLink} />
    </div>
  );
};

export const ProductOfTheMonth = () => {
  return (
    <div className="grid grid-cols-1 gap-4">
      <AwardBadge type="product-of-the-month" place={2} link={demoLink} />
    </div>
  );
};

export const ProductOfTheWeek = () => {
  return (
    <div className="grid grid-cols-1 gap-4">
      <AwardBadge type="product-of-the-week" place={3} link={demoLink} />
    </div>
  );
};

export const ScrollTiltedGridDemo = () => {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl md:text-5xl font-medium tracking-tight">
          A field of stills
        </h1>
        <p className="mt-4 max-w-md text-sm opacity-60">
          Pictures rise from below, settle into focus, then tilt away as the page advances.
        </p>
      </section>

      <ScrollTiltedGrid loop />
    </main>
  );
};
