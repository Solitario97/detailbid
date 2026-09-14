// Next.js instrumentation hook: `register()` runs once when the server
// process boots (App Router, stable since Next 15 — no experimental flag
// needed). This is the standard place to start a long-lived in-process
// background job in a Next.js app that runs as a persistent server
// (`next start`, as this app does on Railway) rather than as serverless
// functions. See src/modules/autopick-bot/scheduler.ts for what it starts.
//
// Guarded to the Node.js runtime because `register()` also fires once for
// the Edge runtime bundle (used by src/proxy.ts) in a build that includes
// one; the bot scheduler needs Prisma/Node APIs and must only run in the
// Node.js server process.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutopickBotScheduler } = await import("@/modules/autopick-bot/scheduler");
    startAutopickBotScheduler();
  }
}
