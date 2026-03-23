"use client";

import { AddDogForm } from "@/components/forms/add-dog-form";

export default function AddDogPage() {
  return (
    <div className="container mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Catch a Dog</h1>
      <AddDogForm />
    </div>
  );
}
