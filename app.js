const SUPABASE_URL = "https://jbofbkkfczdwfoaxhcnv.supabase.co";
const SUPABASE_KEY = "sb_publishable_5-Uy8MuODwW35jMYpRzxwQ_eImKrM9g";
const CLASS_CODE = "2026-final";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const postList = document.querySelector("#post-list");
const feedCount = document.querySelector("#feed-count");
const errorMessage = document.querySelector("#error-message");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function friendlyTime(dateText) {
  if (!dateText) {
    return "just now";
  }

  const date = new Date(dateText);
  const secondsAgo = Math.floor((Date.now() - date.getTime()) / 1000);

  if (Number.isNaN(secondsAgo)) {
    return "recently";
  }

  if (secondsAgo < 60) {
    return "just now";
  }

  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) {
    return `${minutesAgo} minute${minutesAgo === 1 ? "" : "s"} ago`;
  }

  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) {
    return `${hoursAgo} hour${hoursAgo === 1 ? "" : "s"} ago`;
  }

  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) {
    return `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function renderPosts(posts) {
  feedCount.textContent = `${posts.length} post${posts.length === 1 ? "" : "s"}`;

  if (posts.length === 0) {
    postList.innerHTML = '<p class="empty-state">No posts yet for this class.</p>';
    return;
  }

  postList.innerHTML = posts
    .map((post) => {
      const author = escapeHtml(post.author || "Anonymous");
      const body = escapeHtml(post.body || "");
      const time = escapeHtml(friendlyTime(post.created_at));

      return `
        <article class="post-card">
          <div class="post-meta">
            <span class="post-author">${author}</span>
            <time class="post-time" datetime="${escapeHtml(post.created_at)}">${time}</time>
          </div>
          <p class="post-body">${body}</p>
        </article>
      `;
    })
    .join("");
}

async function loadPosts() {
  errorMessage.classList.add("hidden");
  errorMessage.textContent = "";
  feedCount.textContent = "Loading...";

  const { data, error } = await client
    .from("posts")
    .select("author, body, created_at")
    .eq("class_code", CLASS_CODE)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    postList.innerHTML = "";
    feedCount.textContent = "Could not load";
    errorMessage.textContent =
      "Sorry, the class feed could not load. Please check the Supabase table, key, and network connection.";
    errorMessage.classList.remove("hidden");
    console.error("Supabase loading error:", error);
    return;
  }

  renderPosts(data ?? []);
}

loadPosts();
