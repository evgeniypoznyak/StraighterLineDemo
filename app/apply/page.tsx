import { ApplyForm } from "./form";

export const metadata = {
  title: "Apply — Stipend Applications",
};

export default function ApplyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Stipend application
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Fields marked with <span className="text-red-600">*</span> are required.
          Your information is used only to evaluate this application.
        </p>
      </header>
      <ApplyForm />
    </main>
  );
}
