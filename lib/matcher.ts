import type { SelectionPayload, Task } from './types';

/**
 * 「这条是不是某个已有追踪的材料」的本地判定。
 *
 * 设计原则：
 * - 只做排序，不做决定——最终归不归、归哪个，用户在结果页点一下确认；
 * - 不把选择权交给 AI 的开放式命名（它会自己编新追踪名，越用越散），
 *   AI 以后要参与也只在这几个候选里挑；
 * - 打分信号全部来自已有数据：标签重叠、标题包含、同域名、活跃度。
 */

export interface ProjectCandidate {
  task: Task;
  /** 0~100，仅用于排序和决定要不要展示，不当作置信度语义 */
  score: number;
  /** 给用户看的判断依据，例如「标签都含 备案」「标题出现在内容里」 */
  why: string[];
}

/** 从追踪标题里切出可匹配的 2 字以上片段（中文没有分词，用滑窗粗切）。 */
function segs(title: string): string[] {
  const clean = title.replace(/[（）()《》「」\s]/g, '');
  const out: string[] = [];
  for (let n = 4; n >= 2; n -= 1) {
    for (let i = 0; i + n <= clean.length; i += 1) {
      out.push(clean.slice(i, i + n));
    }
  }
  return Array.from(new Set(out)).slice(0, 24);
}

export function findProjectCandidates(payload: SelectionPayload, tasks: Task[]): ProjectCandidate[] {
  const blockText = [payload.heading ?? '', ...payload.texts].join(' ').slice(0, 1500);
  const now = Date.now();

  const scored = tasks
    .filter((t) => t.type === 'milestone' && !t.archivedAt)
    .map<ProjectCandidate>((t) => {
      let score = 0;
      const why: string[] = [];

      // 1) 标签重叠：最强的信号，用户/AI 之前已经打过标
      const blockTags = new Set(
        (payload.texts.join(' ').match(/#[^\s#]{2,12}/g) ?? []).map((x) => x.slice(1)),
      );
      const shared = (t.tags ?? []).filter((tag) => blockTags.has(tag));
      if (shared.length > 0) {
        score += Math.min(30, shared.length * 15);
        why.push(`标签都含 ${shared.join('、')}`);
      }

      // 2) 追踪标题（或其片段）出现在圈选内容里
      const hitSeg = segs(t.title).find((seg) => blockText.includes(seg));
      if (hitSeg && hitSeg.length >= 3) {
        score += 40;
        why.push(`标题「${hitSeg}」出现在内容里`);
      } else if (hitSeg) {
        score += 18;
        why.push(`关键词「${hitSeg}」出现在内容里`);
      }

      // 3) 同域名：弱信号，只 +8，避免把同站不同事硬凑一起
      if (t.site && t.site === payload.site) {
        score += 8;
        why.push(`同站 ${t.site}`);
      }

      // 4) 活跃追踪轻微加分（最近更新过说明正在推进）
      const lastTouch = t.history[0]?.at ?? t.createdAt;
      if (now - lastTouch < 30 * 86_400_000) score += 5;
      if (t.nextReviewAt && t.nextReviewAt > now) score += 4;

      // 5) 材料里已有同链接 → 大概率就是同一追踪的补充
      if ((t.materials ?? []).some((m) => m.url && m.url === payload.url)) {
        score += 25;
        why.push('这个追踪已收过同链接的材料');
      }

      return { task: t, score: Math.min(100, score), why };
    })
    .filter((c) => c.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // 额外抑制：低于 40 分的候选不默认选中（界面层根据 score 决定预选）。
  return scored;
}

/** 判断要不要展示「归入建议条」：至少有一个像样的候选。 */
export function hasStrongCandidate(candidates: ProjectCandidate[]): boolean {
  return candidates.some((c) => c.score >= 40);
}
