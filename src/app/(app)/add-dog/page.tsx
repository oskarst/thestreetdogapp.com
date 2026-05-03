"use client";

import { useTranslations } from "next-intl";
import { AddDogForm } from "@/components/forms/add-dog-form";

export default function AddDogPage() {
  const t = useTranslations("addDog");
  return (
    <div className="container mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{t("pageTitle")}</h1>
      <AddDogForm />
    </div>
  );
}
