import { createFileRoute } from "@tanstack/react-router";
import { BlogIndexView } from "@/components/blog-views";
import { blogIndexHead } from "@/lib/blog-seo";
import { fetchPublishedPosts } from "@/lib/blog";

export const Route = createFileRoute("/fr/blog/")({
  loader: () => fetchPublishedPosts("fr"),
  head: () => blogIndexHead("fr"),
  component: BlogIndexFr,
});

function BlogIndexFr() {
  return <BlogIndexView lang="fr" posts={Route.useLoaderData()} />;
}
