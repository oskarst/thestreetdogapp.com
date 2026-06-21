"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` at import time, so DogMap must be client-only.
// A Server Component (the /map page) can't pass `ssr: false` to next/dynamic,
// so this thin "use client" wrapper does it. SSR-ing DogMap otherwise throws
// during streaming and aborts the Suspense boundary (React error #419).
const DogMap = dynamic(() => import("./dog-map"), { ssr: false });

export default DogMap;
