import { devices } from "playwright";

import { signInWithDefaultUser } from "../src/utils/signin_with_default_user";
import { createPage } from "../src/utils/create_page";
import { goTo } from "../src/utils/go_to";

const DEVICE = {
  deviceScaleFactor: 1,
  hasTouch: false,
  isMobile: false,
  viewport: {
    height: 1080,
    width: 1920,
  },
} satisfies Partial<(typeof devices)[string]>;

async function main() {
  using pageSet = await createPage({ device: DEVICE });
  const { playwrightPage, puppeteerPage } = pageSet;

  playwrightPage.on("request", (request) => {
    if (request.url().includes("/api/v1/sign")) {
      console.log("request", request.method(), request.url(), request.postData());
    }
  });
  playwrightPage.on("response", async (response) => {
    if (response.url().includes("/api/v1/sign") || response.url().includes("/api/v1/me")) {
      console.log("response", response.status(), response.url());
      try {
        console.log("body", await response.text());
      } catch {
        console.log("body", "<unavailable>");
      }
    }
  });

  await goTo({
    playwrightPage,
    puppeteerPage,
    timeout: 120_000,
    url: "http://localhost:3000/not-found",
  });

  console.log("before signin links", await playwrightPage.getByRole("link").allInnerTexts());
  console.log("before signin buttons", await playwrightPage.getByRole("button").allInnerTexts());

  try {
    await signInWithDefaultUser({ page: playwrightPage });
    console.log("signin succeeded");
  } catch (error) {
    console.error("signin failed", error);
  }

  console.log("url", playwrightPage.url());
  console.log("dialog open", await playwrightPage.getByRole("dialog").evaluateAll((nodes) =>
    nodes.map((node) => (node instanceof HTMLDialogElement ? node.open : false)),
  ));
  console.log("after signin links", await playwrightPage.getByRole("link").allInnerTexts());
  console.log("after signin buttons", await playwrightPage.getByRole("button").allInnerTexts());
  console.log("cookies", await playwrightPage.context().cookies());
  console.log(
    "me body",
    await playwrightPage.evaluate(async () => {
      const response = await fetch("/api/v1/me");
      return response.text();
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
