import { readFileSync } from "fs";
import path from "path";

import { Router } from "express";
import serveStatic from "serve-static";

import { Comment, Post, User } from "@web-speed-hackathon-2026/server/src/models";
import {
  CLIENT_DIST_PATH,
  PUBLIC_PATH,
  UPLOAD_PATH,
} from "@web-speed-hackathon-2026/server/src/paths";

export const staticRouter = Router();

// index.html テンプレートをキャッシュ
let _htmlTemplate: string | null = null;
function getHtmlTemplate(): string {
  if (_htmlTemplate === null) {
    try {
      _htmlTemplate = readFileSync(path.join(CLIENT_DIST_PATH, "index.html"), "utf-8");
    } catch {
      _htmlTemplate = "";
    }
  }
  return _htmlTemplate;
}

// ルートに応じて必要な API データを事前取得する
async function buildPreloadData(req: Parameters<Parameters<typeof Router>[0]>[0]): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  // /api/v1/me の事前取得（認証状態に関わらず常に注入）
  try {
    if (req.session?.userId) {
      const user = await User.findByPk(req.session.userId);
      data["/api/v1/me"] = user ? user.toJSON() : null;
    } else {
      data["/api/v1/me"] = null;
    }
  } catch {
    data["/api/v1/me"] = null;
  }

  // ページ種別に応じたコンテンツの事前取得
  const urlPath = req.path;
  try {
    if (urlPath === "/" || urlPath === "") {
      // ホーム: タイムライン最初の 30 件
      const posts = await Post.findAll({ limit: 30 });
      data["/api/v1/posts"] = posts.map((p) => p.toJSON());
    } else {
      const postMatch = urlPath.match(/^\/posts\/([^/]+)$/);
      if (postMatch) {
        // 投稿詳細ページ
        const postId = postMatch[1];
        const [post, comments] = await Promise.all([
          Post.findByPk(postId),
          Comment.findAll({ where: { postId }, limit: 30 }),
        ]);
        data[`/api/v1/posts/${postId}`] = post ? post.toJSON() : null;
        data[`/api/v1/posts/${postId}/comments`] = comments.map((c) => c.toJSON());
      }
    }
  } catch {
    // データ取得に失敗してもページは表示する
  }

  return data;
}

// SPA ルート（拡張子なし）を処理: データ注入済みの HTML を返す
staticRouter.use(async (req, res, next) => {
  if (req.method !== "GET" || path.extname(req.path) !== "") {
    return next();
  }

  const template = getHtmlTemplate();
  if (!template) return next();

  try {
    const preloadData = await buildPreloadData(req);
    const script = `<script>window.__PRELOAD_DATA__=${JSON.stringify(preloadData)};</script>`;
    const html = template.replace("</head>", `${script}</head>`);
    return res.type("text/html").send(html);
  } catch {
    return next();
  }
});

staticRouter.use(
  serveStatic(UPLOAD_PATH, {
    etag: false,
    lastModified: false,
  }),
);

staticRouter.use(
  serveStatic(PUBLIC_PATH, {
    etag: false,
    lastModified: false,
  }),
);

staticRouter.use(
  serveStatic(CLIENT_DIST_PATH, {
    etag: false,
    lastModified: false,
  }),
);
