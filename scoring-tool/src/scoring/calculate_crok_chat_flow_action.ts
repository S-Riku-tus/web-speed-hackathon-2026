import * as playwright from "playwright";
import type * as puppeteer from "puppeteer";

import { consola } from "../consola";
import { goTo } from "../utils/go_to";
import { startFlow } from "../utils/start_flow";

import { calculateHackathonScore } from "./utils/calculate_hackathon_score";

type Params = {
  baseUrl: string;
  playwrightPage: playwright.Page;
  puppeteerPage: puppeteer.Page;
};
export async function calculateCrokChatFlowAction({
  baseUrl,
  playwrightPage,
  puppeteerPage,
}: Params) {
  consola.debug("CrokChatFlowAction - navigate");
  try {
    await goTo({
      playwrightPage,
      puppeteerPage,
      timeout: 120 * 1000,
      url: new URL("/not-found", baseUrl).href,
    });
  } catch (err) {
    consola.error("CrokChatFlowAction - goTo failed:", err);
  }
  consola.debug("CrokChatFlowAction - navigate end");

  // サインイン
  consola.debug("CrokChatFlowAction - signin");
  try {
    const signinButton = playwrightPage.getByRole("button", { name: "サインイン" });
    await signinButton.click();
    await playwrightPage
      .getByRole("dialog")
      .getByRole("heading", { name: "サインイン" })
      .waitFor({ timeout: 10 * 1000 });
  } catch (err) {
    consola.error("CrokChatFlowAction - sign-in modal show failed:", err);
  }
  try {
    const usernameInput = playwrightPage
      .getByRole("dialog")
      .getByRole("textbox", { name: "ユーザー名" });
    await usernameInput.pressSequentially("o6yq16leo");
  } catch (err) {
    consola.error("CrokChatFlowAction - username input failed:", err);
  }
  try {
    const passwordInput = playwrightPage
      .getByRole("dialog")
      .getByRole("textbox", { name: "パスワード" });
    await passwordInput.pressSequentially("wsh-2026");
  } catch (err) {
    consola.error("CrokChatFlowAction - password input failed:", err);
  }
  try {
    const submitButton = playwrightPage
      .getByRole("dialog")
      .getByRole("button", { name: "サインイン" });
    await submitButton.click();
    await playwrightPage.getByRole("link", { name: "Crok" }).waitFor({ timeout: 10 * 1000 });
  } catch (err) {
    consola.error("CrokChatFlowAction - sign-in submit failed:", err);
  }
  consola.debug("CrokChatFlowAction - signin end");

  // Crokページに移動
  consola.debug("CrokChatFlowAction - navigate to Crok");
  try {
    const crokLink = playwrightPage.getByRole("link", { name: "Crok" });
    await crokLink.click();
    await playwrightPage.waitForURL("**/crok", { timeout: 10 * 1000 });
  } catch (err) {
    consola.error("CrokChatFlowAction - navigate to /crok failed:", err);
  }
  consola.debug("CrokChatFlowAction - navigate to Crok end");

  const flow = await startFlow(puppeteerPage);

  consola.debug("CrokChatFlowAction - timespan");
  await flow.startTimespan();
  {
    // メッセージを入力して送信
    try {
      const chatInput = playwrightPage.getByPlaceholder("メッセージを入力...");
      await chatInput.pressSequentially("TypeScriptのtemplate literal typeとは何ですか");
    } catch (err) {
      consola.error("チャット入力欄へのテキスト入力に失敗しました", err);
    }

    try {
      const sendButton = playwrightPage.getByRole("button", { name: "送信" });
      await sendButton.click();
    } catch (err) {
      consola.error("送信ボタンのクリックに失敗しました", err);
    }

    // ストリーミング開始を待機
    try {
      await playwrightPage.getByRole("status", { name: "応答中" }).waitFor({ timeout: 60 * 1000 });
    } catch (err) {
      consola.error("AIレスポンスのローディング表示に失敗しました", err);
    }

    // <h2>第六章：最終疾走と到達</h2>が表示されるまで待機
    try {
      await playwrightPage
        .getByRole("heading", { name: "第六章：最終疾走と到達" })
        .waitFor({ timeout: 120 * 1000 });
    } catch (err) {
      consola.error("レスポンス内容が正しく表示されなかったか、タイムアウトしました", err);
    }

    // 次の質問を入力する
    try {
      const chatInput = playwrightPage.getByPlaceholder("メッセージを入力...");
      await chatInput.pressSequentially("ReactのuseTransitionの使い方の例を教えてください");
    } catch (err) {
      consola.error("ストリーミング中の入力に失敗しました", err);
    }
  }
  await flow.endTimespan();
  consola.debug("CrokChatFlowAction - timespan end");

  const {
    steps: [result],
  } = await flow.createFlowResult();

  const { breakdown, scoreX100 } = calculateHackathonScore(result!.lhr.audits, {
    isUserflow: true,
  });

  return {
    audits: result!.lhr.audits,
    breakdown,
    scoreX100,
  };
}
