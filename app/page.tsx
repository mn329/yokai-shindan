import Link from "next/link";
import { YOKAI } from "@/lib/yokai/yokai";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <p className="text-5xl" aria-hidden="true">
        {YOKAI.map((yokai) => yokai.emoji).join(" ")}
      </p>
      <h1 className="text-4xl font-bold">妖怪診断</h1>
      <p className="leading-8 text-zinc-700 dark:text-zinc-300">
        7つの質問に答えると、あなたを妖怪に例えると何になるかがわかります。
      </p>
      <Link
        href="/quiz"
        className="rounded-full bg-black px-8 py-4 text-lg font-semibold text-white dark:bg-white dark:text-black"
      >
        診断スタート
      </Link>
    </main>
  );
}
