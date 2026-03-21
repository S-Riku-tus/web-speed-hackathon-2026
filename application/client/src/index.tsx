import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router";

import { AppContainer } from "@web-speed-hackathon-2026/client/src/containers/AppContainer";
import { store } from "@web-speed-hackathon-2026/client/src/store";

// defer スクリプト実行時点では DOM は既に解析済み。load まで待つと画像等の後まで描画が遅れ、
// パース・実行・コミットが一箇所に寄って TBT が悪化しやすい。
const rootEl = document.getElementById("app");
if (rootEl) {
  createRoot(rootEl).render(
    <Provider store={store}>
      <BrowserRouter>
        <AppContainer />
      </BrowserRouter>
    </Provider>,
  );
}
