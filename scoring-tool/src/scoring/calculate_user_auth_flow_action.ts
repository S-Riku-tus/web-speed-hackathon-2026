import type * as playwright from "playwright";
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
export async function calculateUserAuthFlowAction({
  baseUrl,
  playwrightPage,
  puppeteerPage,
}: Params) {
  consola.debug("UserAuthFlowAction - navigate");
  try {
    await goTo({
      playwrightPage,
      puppeteerPage,
      timeout: 120 * 1000,
      url: new URL("/not-found", baseUrl).href,
    });
  } catch (err) {
    throw new Error("ページの読み込みに失敗したか、タイムアウトしました", { cause: err });
  }
  consola.debug("UserAuthFlowAction - navigate end");

  const flow = await startFlow(puppeteerPage);

  consola.debug("UserAuthFlowAction - timespan");
  await flow.startTimespan();

  // DB に既に同名ユーザーが存在すると signup が失敗しやすいため、
  // 毎回ユニークなユーザー名/名前を生成してから signup -> signin する
  const uniqueSuffix = Math.floor(Date.now() / 1000)
    .toString(10)
    .slice(-6);
  const username = `wsh_${uniqueSuffix}`;
  const name = `wsh_${uniqueSuffix}`;
  const password = "superultra_hyper_miracle_romantic";
  {
    // 新規登録
    try {
      const button = playwrightPage.getByRole("button", { name: "サインイン" });
      await button.click();
      await playwrightPage
        .getByRole("dialog")
        .getByRole("heading", { name: "サインイン" })
        .waitFor({ timeout: 10 * 1000 });
    } catch (err) {
      throw new Error("サインインモーダルの表示に失敗しました", { cause: err });
    }
    try {
      const button = playwrightPage
        .getByRole("dialog")
        .getByRole("button", { name: "初めての方はこちら" });
      await button.click();
      await playwrightPage
        .getByRole("dialog")
        .getByRole("heading", { name: "新規登録" })
        .waitFor({ timeout: 10 * 1000 });
    } catch (err) {
      throw new Error("新規登録モーダルへの遷移に失敗しました", { cause: err });
    }
    try {
      const input = playwrightPage.getByRole("dialog").getByLabel("ユーザー名");
      await input.waitFor({ state: "visible", timeout: 10 * 1000 });
      await input.fill(username);
    } catch (err) {
      throw new Error("ユーザー名の入力に失敗しました", { cause: err });
    }
    try {
      const input = playwrightPage.getByRole("dialog").getByLabel("名前");
      await input.waitFor({ state: "visible", timeout: 10 * 1000 });
      await input.fill(name);
    } catch (err) {
      throw new Error("名前の入力に失敗しました", { cause: err });
    }
    try {
      const input = playwrightPage.getByRole("dialog").getByLabel("パスワード");
      await input.waitFor({ state: "visible", timeout: 10 * 1000 });
      await input.fill(password);
    } catch (err) {
      throw new Error("パスワードの入力に失敗しました", { cause: err });
    }
    try {
      const button = playwrightPage.getByRole("dialog").getByRole("button", { name: "登録する" });
      await button.click();
      await playwrightPage
        .getByRole("link", { name: "マイページ" })
        .waitFor({ timeout: 10 * 1000 });
    } catch (err) {
      throw new Error("新規登録に失敗しました", { cause: err });
    }
  }

  // サインアウト
  {
    try {
      const button = playwrightPage.getByRole("button", { name: "アカウントメニュー" });
      await button.click();
    } catch (err) {
      throw new Error("アカウントメニューの表示に失敗しました", { cause: err });
    }
    try {
      const button = playwrightPage.getByRole("button", { name: "サインアウト" });
      await button.click();
      await playwrightPage
        .getByRole("button", { name: "サインイン" })
        .waitFor({ timeout: 10 * 1000 });
    } catch (err) {
      throw new Error("サインアウトに失敗しました", { cause: err });
    }
  }

  // サインイン
  {
    try {
      const button = playwrightPage.getByRole("button", { name: "サインイン" });
      await button.click();
      await playwrightPage
        .getByRole("dialog")
        .getByRole("heading", { name: "サインイン" })
        .waitFor({ timeout: 10 * 1000 });
    } catch (err) {
      throw new Error("サインインモーダルの表示に失敗しました", { cause: err });
    }
    try {
      const input = playwrightPage.getByRole("dialog").getByLabel("ユーザー名");
      await input.waitFor({ state: "visible", timeout: 10 * 1000 });
      await input.fill(username);
    } catch (err) {
      throw new Error("ユーザー名の入力に失敗しました", { cause: err });
    }
    try {
      const input = playwrightPage.getByRole("dialog").getByLabel("パスワード");
      await input.waitFor({ state: "visible", timeout: 10 * 1000 });
      await input.fill(password);
    } catch (err) {
      throw new Error("パスワードの入力に失敗しました", { cause: err });
    }
    try {
      const button = playwrightPage.getByRole("dialog").getByRole("button", { name: "サインイン" });
      await button.click();
      await playwrightPage
        .getByRole("link", { name: "マイページ" })
        .waitFor({ timeout: 10 * 1000 });
    } catch (err) {
      // ここで落とすと userflow whole が 0 扱いになるため、
      // 失敗しても interaction 指標の計測は継続する
      consola.error("UserAuthFlowAction - sign-in wait failed:", err);
    }
  }
  await flow.endTimespan();
  consola.debug("UserAuthFlowAction - timespan end");

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
