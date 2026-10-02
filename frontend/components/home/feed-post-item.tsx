import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { FeedPost } from "@/lib/types/home";

export function FeedPostItem({ post }: { post: FeedPost }) {
  return (
    <article className="space-y-2">
      <header className="flex items-center gap-3">
        <Avatar name={post.authorName} src={post.authorAvatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-headline text-ink">
            {post.authorName}
            <span className="ml-2 font-normal text-caption text-ink-tertiary">{post.authorMeta}</span>
          </p>
          {post.groupName ? (
            <Link href="/community" className="text-caption text-primary">
              {post.groupName}
            </Link>
          ) : null}
        </div>
      </header>
      <p className="text-body text-ink">{post.body}</p>
      <footer className="flex items-center gap-4 text-caption text-ink-secondary">
        <span className="inline-flex items-center gap-1">
          <Heart className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {post.reactionCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {post.commentCount}
        </span>
      </footer>
    </article>
  );
}
