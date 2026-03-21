/**
 * lazy チャンク取得中・API 待ちなど、本文が出るまでのプレースホルダ。
 * テキストのみのフォールバックだと Speed Index が「進捗なし」と判断されやすいため、
 * 投稿詳細に近い骨組みを出す。
 */
export const RouteLoadingSkeleton = () => {
  return (
    <div aria-busy="true" className="px-1 sm:px-4" role="status">
      <div className="border-cax-border animate-pulse border-b px-4 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-cax-surface-subtle h-14 w-14 shrink-0 rounded-full sm:h-16 sm:w-16" />
          <div className="min-w-0 grow space-y-2">
            <div className="bg-cax-surface-subtle h-4 w-32 rounded" />
            <div className="bg-cax-surface-subtle h-3 w-24 rounded" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="bg-cax-surface-subtle h-4 w-full rounded" />
          <div className="bg-cax-surface-subtle h-4 w-[90%] rounded" />
        </div>
        <div className="bg-cax-surface-subtle mt-4 aspect-square w-full max-w-full rounded-lg" />
        <div className="mt-4 space-y-2">
          <div className="bg-cax-surface-subtle h-3 w-full rounded" />
          <div className="bg-cax-surface-subtle h-3 w-[85%] rounded" />
        </div>
      </div>
    </div>
  );
};
