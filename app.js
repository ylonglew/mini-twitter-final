const SUPABASE_URL = "https://jbofbkkfczdwfoaxhcnv.supabase.co";
const SUPABASE_KEY = "sb_publishable_5-Uy8MuODwW35jMYpRzxwQ_eImKrM9g";
const CLASS_CODE = "2026-final";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const authTitle = document.querySelector("#auth-title");
const authHelp = document.querySelector("#auth-help");
const authForm = document.querySelector("#auth-form");
const emailInput = document.querySelector("#email-input");
const magicLinkButton = document.querySelector("#magic-link-button");
const signedInRow = document.querySelector("#signed-in-row");
const signedInMessage = document.querySelector("#signed-in-message");
const signOutButton = document.querySelector("#sign-out-button");
const authMessage = document.querySelector("#auth-message");
const postList = document.querySelector("#post-list");
const feedCount = document.querySelector("#feed-count");
const errorMessage = document.querySelector("#error-message");
let posts = [];

function getMagicLinkRedirectUrl() {
  const redirectUrl = new URL(window.location.href);
  redirectUrl.search = "";
  redirectUrl.hash = "";
  return redirectUrl.toString();
}

function getAuthErrorFromUrl() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get("error_description") || searchParams.get("error_description");
}

function cleanMagicLinkUrl() {
  if (!window.location.hash && !window.location.search) {
    return;
  }

  const cleanUrl = new URL(window.location.href);
  cleanUrl.search = "";
  cleanUrl.hash = "";
  window.history.replaceState({}, document.title, cleanUrl.toString());
}

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

function setAuthMessage(message = "", isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
}

function setAuthFormLoading(isLoading) {
  magicLinkButton.disabled = isLoading;
  magicLinkButton.textContent = isLoading ? "Sending..." : "Send magic link";
}

function renderSignedOut() {
  authTitle.textContent = "Sign in";
  authHelp.textContent =
    "Enter your email and Supabase will send you a magic sign-in link.";
  authHelp.classList.remove("hidden");
  authForm.classList.remove("hidden");
  signedInRow.classList.add("hidden");
}

function renderSignedIn(user) {
  authTitle.textContent = "Account";
  authHelp.classList.add("hidden");
  authForm.classList.add("hidden");
  signedInMessage.textContent = `Signed in as ${user.email}`;
  signedInRow.classList.remove("hidden");
}

async function handleMagicLinkSubmit(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  if (!email) {
    setAuthMessage("Please enter your email address first.", true);
    return;
  }

  setAuthFormLoading(true);
  setAuthMessage("Sending your magic link now...");

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getMagicLinkRedirectUrl(),
    },
  });

  setAuthFormLoading(false);

  if (error) {
    console.error("Supabase magic link error:", error);
    setAuthMessage(
      "Sorry, Supabase could not send that magic link. Please check the email address and try again.",
      true,
    );
    return;
  }

  setAuthMessage("Magic link sent. Please check your email, then open the link.");
}

async function handleSignOut() {
  signOutButton.disabled = true;
  setAuthMessage("Signing you out...");

  const { error } = await client.auth.signOut();
  signOutButton.disabled = false;

  if (error) {
    console.error("Supabase sign out error:", error);
    setAuthMessage("Sorry, sign out did not finish. Please try again.", true);
    return;
  }

  setAuthMessage("You are signed out.");
}

async function setupAuth() {
  renderSignedOut();
  setAuthMessage("Checking whether you are already signed in...");

  const urlAuthError = getAuthErrorFromUrl();
  const { data, error } = await client.auth.getSession();

  if (error) {
    console.error("Supabase session error:", error);
    setAuthMessage(
      "Sorry, Supabase could not check your sign-in status. You can still try sending a new magic link.",
      true,
    );
  } else if (data.session?.user) {
    renderSignedIn(data.session.user);
    setAuthMessage("You are signed in. Welcome back.");
  } else if (urlAuthError) {
    setAuthMessage(
      "That sign-in link did not work. It may have expired, so please send yourself a new one.",
      true,
    );
  } else {
    setAuthMessage("");
  }

  cleanMagicLinkUrl();

  client.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      renderSignedIn(session.user);
      if (event === "SIGNED_IN") {
        setAuthMessage("You are signed in. Welcome back.");
      }
      return;
    }

    renderSignedOut();
    if (event === "SIGNED_OUT") {
      setAuthMessage("You are signed out.");
    }
  });
}

function renderPosts(newPostCreatedAt = "") {
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
      const isNewPost = post.created_at === newPostCreatedAt;

      return `
        <article class="post-card${isNewPost ? " new-post" : ""}">
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

function addRealtimePost(post) {
  if (post.class_code !== CLASS_CODE) {
    return;
  }

  posts = [post, ...posts].slice(0, 30);
  renderPosts(post.created_at);
}

function subscribeToNewPosts() {
  client
    .channel("mini-twitter-2026-final-posts")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "posts",
        filter: `class_code=eq.${CLASS_CODE}`,
      },
      (payload) => {
        addRealtimePost(payload.new);
      },
    )
    .subscribe((status, error) => {
      if (error) {
        console.error("Supabase realtime error:", error);
      }

      if (status === "CHANNEL_ERROR") {
        console.error("Supabase realtime channel could not connect.");
      }
    });
}

async function loadPosts() {
  errorMessage.classList.add("hidden");
  errorMessage.textContent = "";
  feedCount.textContent = "Loading...";

  const { data, error } = await client
    .from("posts")
    .select("author, body, created_at, class_code")
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

  posts = data ?? [];
  renderPosts();
}

authForm.addEventListener("submit", handleMagicLinkSubmit);
signOutButton.addEventListener("click", handleSignOut);

setupAuth();
loadPosts();
subscribeToNewPosts();
