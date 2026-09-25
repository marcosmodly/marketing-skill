#!/usr/bin/env python3
"""
Scaffolding for posting text directly to LinkedIn, X, Meta (Facebook Page),
Reddit, Discord, Slack, Telegram, dev.to, GitHub Discussions, TikTok, or
Instagram - no n8n/Make in between. YouTube is deliberately NOT included -
see the note near the bottom of this docstring for why.

WARNING - read this before using it for anything real:

This talks to live, versioned platform APIs. It was written without a
connected account or working credentials for any of these platforms to
test against, so treat every request shape below as best-effort against
each platform's last publicly documented stable API, not a verified
integration. Before relying on it:

  - Confirm you actually have the right kind of API access first. Each
    platform gates posting behind its own developer-app review, X
    additionally requires a paid API tier for write access, and Reddit
    closed instant self-service app registration in late 2025 in favor of
    a manual approval queue - see the "reddit" note below. Discord needs
    no app review at all - see "discord" below. Slack sits in between:
    no OAuth review from Slack itself, but many workspaces require a
    Workspace Owner/Admin to approve new apps before a webhook can even
    be created - see "slack" below, don't assume it's as simple as
    Discord. Telegram bot creation itself needs no approval either, but
    posting into a specific chat still needs that chat's own admin to add
    the bot first - see "telegram" below. dev.to's write API needs no
    approval process found in its docs at all - just an API key generated
    from your own account settings - see "devto" below; that's about
    access, though, not content - a Tag Moderator can still strip a tag
    that doesn't fit it, or a post can still be reported through the
    sitewide Code of Conduct. GitHub Discussions is similar to dev.to on
    access - a Personal Access Token from your own account, no app review
    - but most repos don't even have Discussions turned on, and some
    categories restrict who's allowed to start a new discussion at all,
    separate from the access-token question - see "github_discussions"
    below. TikTok's Content Posting API needs no approval to start using
    either, but an unaudited app is restricted to posting SELF_ONLY
    (private, visible only to the poster) permanently - going through
    TikTok's own audit process is the only way to actually reach public
    posting, not something this script can do for you - see "tiktok"
    below. Instagram's Graph API needs a Business or Creator account
    linked to a Facebook Page, with instagram_content_publish permission
    on the access token - see "instagram" below.
  - Confirm the endpoint/version below is still current - check
    developers.linkedin.com, developer.x.com, developers.facebook.com,
    Reddit's own API docs, Discord's own API docs, Slack's own API docs,
    core.telegram.org/bots/api, developers.forem.com/api (dev.to's own
    docs), docs.github.com/en/graphql (GitHub's GraphQL API reference),
    developers.tiktok.com (TikTok's Content Posting API docs), and
    developers.facebook.com/docs/instagram-platform (Instagram's Graph API
    docs) directly, since these APIs change and this script cannot check
    for you.
  - Run with --dry-run and compare the printed request against that
    platform's current docs before ever passing --confirmed.
  - Do one manual --confirmed test post yourself before wiring this into
    anything scheduled or unattended.
  - For Reddit specifically: a 2xx response here only means the API
    accepted the submission - a subreddit's AutoModerator can still remove
    it silently seconds later for violating that subreddit's own rules
    (missing flair, self-promo policy, karma/age minimums, banned
    domains). Run the `community-post-generator` skill against the target
    subreddit first and resolve everything it flags before sending.
  - For Discord and Slack specifically, and for a *private* Telegram
    group/channel: `community-post-generator` can't independently verify
    that target's rules the way it can for Reddit/Product Hunt/Hacker
    News/Indie Hackers, since most private servers, workspaces, and
    groups have no public page to check at all - it works from whatever
    rules you (as an actual member) supply it. Confirm that's still
    current yourself before sending, same as you would before posting by
    hand. A *public* Telegram channel/group is the exception - see
    "telegram" below.
  - For dev.to specifically: `community-post-generator`'s research could
    not directly confirm the Code of Conduct's specific self-promotion/
    spam wording (dev.to's own domain was unreachable during that
    research). The #showdev tag and the Organizations feature both
    suggest self-promotion is structurally welcome, but that's not the
    same as a confirmed rule - a 2xx response here just means the API
    accepted the article, not that a Tag Moderator won't strip a tag that
    doesn't fit it afterward. See "devto" below.
  - For GitHub Discussions specifically: whether this is even a reasonable
    thing to do depends heavily on whose repo it is. Posting an update to
    your *own* project's own Discussions is normal maintainer
    communication. Posting about your product into *someone else's* repo
    is governed by GitHub's sitewide Community Guidelines, which are
    explicit that content shouldn't primarily be advertising and that
    links need real explanation, not just traffic-driving - confirm
    `community-post-generator`'s research actually established this was
    the right repo and category for that, not just that the API call will
    succeed. See "github_discussions" below.
  - For TikTok specifically: check the actual privacy level your app is
    allowed to post at before assuming --confirmed will do anything
    public. An unaudited app gets silently downgraded to SELF_ONLY by
    TikTok's own API regardless of what --privacy-level asks for - that
    isn't a bug in this script, it's the platform enforcing its own audit
    gate. See "tiktok" below.
  - For Instagram specifically: this is a genuinely two-step flow, not a
    single request like every other platform here - creating a media
    container is step one, publishing it is step two, and for video the
    container needs to finish processing (poll it yourself; this script
    doesn't) before step two will succeed. See "instagram" below.

Every other builder here is text-only - a single request, no media
involved. TikTok and Instagram break that pattern: both require an
already-existing image or video at a public URL you provide
(--video-url / --media-url), since neither platform's API accepts direct
binary upload from a lightweight script like this one, and this script
doesn't implement any media hosting or upload logic of its own - get the
asset hosted somewhere public first (your own site, a CDN, cloud storage),
then point these builders at that URL.

YouTube is deliberately NOT included, for two separate, both-disqualifying
reasons: Community posts have no public write API at all (confirmed -
the API that used to support this, activities.insert, was deprecated in
2020 with no replacement; Community posts remain Studio-only), and actual
video upload (videos.insert) requires a full interactive OAuth 2.0 consent
flow to even get a usable token in the first place - not a static
credential you generate once and paste in the way every other platform
here works - plus resumable/chunked upload of the real video bytes, plus
a verified Google Cloud project before public videos are even allowed.
That's a fundamentally different kind of tool than this script was built
to be, not a missing builder function - adding one honestly would mean
building OAuth flow handling and chunked upload logic this script
deliberately doesn't have for anything else here.

Same safety pattern as publish_webhook.py: refuses to send unless you
pass --dry-run or --confirmed explicitly, and never sends without one.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


META_GRAPH_API_VERSION = os.environ.get("META_GRAPH_API_VERSION", "v21.0")

NOTES = {
    "linkedin": "Uses the legacy UGC Posts API (v2/ugcPosts). LinkedIn has "
                "been migrating products to a newer versioned Posts API "
                "(/rest/posts, requires a LinkedIn-Version header) - check "
                "which one your app's product access actually grants.",
    "x": "Requires a user-context OAuth2 access token with tweet.write "
         "scope (3-legged OAuth) - an app-only bearer token cannot post on "
         "someone's behalf. X also gates write access behind a paid API "
         "tier as of recent pricing - confirm your access level.",
    "meta": "Facebook Page text posts only. Instagram has no text-only "
            "post endpoint - it requires an image/video container plus a "
            "separate publish call, not implemented here.",
    "reddit": "Requires an OAuth2 access token with 'submit' scope, from "
              "your own registered Reddit app (reddit.com/prefs/apps). As "
              "of late 2025 Reddit closed instant self-service app "
              "registration - new apps go through a manual approval queue "
              "(reportedly weeks), though already-approved credentials "
              "keep working; confirm your current registration status "
              "before assuming this just works. Also requires a "
              "descriptive User-Agent identifying your app (Reddit rate- "
              "limits or blocks generic ones). Submits a text (self) post "
              "only - no link/image/video posts. A 2xx response does not "
              "guarantee the post survives AutoModerator; run "
              "community-post-generator against the target subreddit "
              "first.",
    "discord": "One of the easiest to set up: a webhook needs no OAuth "
               "app review, just MANAGE_WEBHOOKS permission on the target "
               "channel to create one (Channel Settings > Integrations > "
               "Webhooks). The webhook URL itself is the credential - "
               "anyone with it can post, so treat it like a password "
               "(this script redacts it in --dry-run output, same as "
               "other platforms' tokens). Sends a plain chat message "
               "(2000-character limit; longer text is rejected outright, "
               "not truncated, by Discord's API) - no title field exists, "
               "this isn't a self-post the way Reddit is. Unlike the "
               "other platforms, community-post-generator did not "
               "independently verify the target server's rules for this "
               "draft - it worked from what you supplied - so recheck the "
               "server's own rules channel yourself before sending.",
    "slack": "Not as simple as Discord, despite looking similar: the "
             "direct-webhook-URL path is legacy, and creating a webhook "
             "now means creating a Slack App, which many workspaces "
             "require a Workspace Owner/Admin to approve before it can "
             "even be installed - confirm your workspace's app-approval "
             "setting before assuming self-serve setup. The webhook URL "
             "itself is the credential, same as Discord (redacted in "
             "--dry-run output). Sends plain text - format it in Slack's "
             "own 'mrkdwn' syntax, not standard Markdown: a single "
             "asterisk (*bold*) is bold in Slack, not italic, the "
             "opposite of standard Markdown - community-post-generator "
             "drafts in mrkdwn for this platform for exactly that reason. "
             "Hard-capped at 40000 characters (rejected, not truncated, "
             "past that by this script; Slack itself recommends staying "
             "under 4000 for how the message actually displays - this "
             "script only warns, doesn't block, between 4000 and 40000). "
             "Same as Discord: this skill worked from whatever rules you "
             "supplied, not independent verification, so recheck the "
             "workspace's actual rules yourself before sending.",
    "telegram": "Bot creation itself needs no approval - message @BotFather, "
                "get a token in seconds - but that only creates the bot; "
                "posting into a *specific* chat still requires that chat's "
                "own admin to add the bot to it first, so a working token "
                "doesn't mean you can post anywhere yet. Uses the Bot API's "
                "sendMessage (api.telegram.org/bot<TOKEN>/sendMessage) - the "
                "token is embedded in the URL itself, same credential-in-URL "
                "pattern as Discord/Slack (redacted in --dry-run output). "
                "Defaults to HTML parse_mode over Telegram's MarkdownV2 on "
                "purpose: MarkdownV2 requires escaping a long list of "
                "special characters anywhere they appear as literal text, "
                "and getting it wrong fails the whole send with a parse "
                "error, not just a rendering glitch - HTML only needs "
                "'<', '>', and '&' escaped. Pass --parse-mode MarkdownV2 to "
                "override, at your own risk. Hard-capped at 4096 characters "
                "(rejected outright, not truncated - Telegram's API returns "
                "'message is too long' and sends nothing). For a *private* "
                "group/channel, community-post-generator worked from "
                "whatever rules you supplied, same as Discord/Slack - "
                "recheck them yourself before sending. A *public* channel "
                "(has an @username) is the one case among these six where "
                "the skill may have actually verified the rules directly "
                "(via the public t.me/s/<username> preview), so check its "
                "Source Confidence line rather than assuming User-Supplied.",
    "devto": "Uses the Forem API (POST dev.to/api/articles). Needs an API "
             "key from your dev.to account settings, sent as a custom "
             "'api-key' header - no OAuth flow, no app review found in its "
             "docs, the simplest credential model of any platform here. "
             "Posts a full title+body article (body_markdown, standard "
             "Markdown), not a short chat message - closer in shape to "
             "Reddit's self-post than to Discord/Slack/Telegram. Up to 4 "
             "tags via --tags (comma-separated; dev.to enforces this cap, "
             "and so does this script, before sending). Optional --org-id "
             "posts under a dev.to Organization/company page instead of "
             "your personal account, if you're actually a member of one - "
             "leave it unset for a personal-account post. No documented "
             "hard character limit on articles, unlike the chat platforms "
             "above - long-form is the point here. Publishes live "
             "immediately (published: true) once --confirmed is passed; "
             "there's no separate draft-save step exposed here even "
             "though dev.to's API supports one. See the WARNING section "
             "above on the Code of Conduct gap before trusting a 2xx "
             "response as the same thing as 'this was welcome.'",
    "github_discussions": "Uses the GraphQL API's createDiscussion mutation "
             "(POST api.github.com/graphql) - GitHub Discussions has no REST "
             "write endpoint. Needs a Personal Access Token (classic or "
             "fine-grained) with 'public_repo' scope for a public target "
             "repo, 'repo' scope for a private one - generated in your own "
             "GitHub account settings, no app-review queue. Deliberately "
             "reads from GITHUB_DISCUSSIONS_TOKEN, not the more common "
             "GITHUB_TOKEN name, since the latter is often already set for "
             "other tools (gh CLI, CI) with scopes you may not want used "
             "here. Requires the repository's and category's GraphQL node "
             "IDs via --repo-id/--category-id, not 'owner/repo' or a "
             "category name - this script doesn't resolve those for you; "
             "look them up first with a read-only "
             "repository(owner:...,name:...){id, "
             "discussionCategories(first:25){nodes{id,name}}} query against "
             "the same API. Most repositories don't have Discussions turned "
             "on at all - confirmed by testing against this very plugin's "
             "own repo, which doesn't have it enabled - so a 404 there "
             "means the feature is off, not that credentials are wrong. "
             "Some categories (commonly Announcement-style ones) restrict "
             "who can start a *new* discussion to maintainers/admins even "
             "though anyone with read access can usually comment - confirm "
             "the target category actually allows the token's account to "
             "create one, separate from whether the token itself is valid. "
             "No character limit confirmed specifically for Discussions - "
             "GitHub's Issues/PR comments cap at 65536 characters and "
             "Discussions likely shares that infrastructure, but this "
             "wasn't independently verified, so this script doesn't "
             "hard-block on it the way it does for Discord/Telegram. "
             "Whether this post even belongs here depends on whose repo it "
             "is - see the WARNING section above.",
    "tiktok": "Uses the Content Posting API's Direct Post init endpoint "
              "(POST open.tiktokapis.com/v2/post/publish/video/init/) with "
              "source=PULL_FROM_URL - TikTok's servers fetch the video "
              "themselves from --video-url, so this script never handles "
              "video bytes directly. Needs a TikTok for Developers access "
              "token with video.publish scope. The one thing that actually "
              "matters before using this for real: an unaudited API client "
              "can only post at privacy_level SELF_ONLY (visible only to "
              "the posting account), permanently - TikTok enforces this "
              "server-side regardless of --privacy-level, and posts made "
              "while unaudited stay private even after a later audit "
              "passes. Going through TikTok's own app audit is the only "
              "way to actually reach public posting; this script can't do "
              "that for you. --text becomes the caption (post_info.title); "
              "no character limit hard-blocked here since TikTok's own "
              "guidance on this varies by surface - keep it well under "
              "150 characters as a practical target.",
    "instagram": "Uses the Instagram Graph API's two-step container flow "
                 "(graph.facebook.com), not a single request like every "
                 "other platform here. Step one - the default, when "
                 "--publish-container-id is NOT given - creates a media "
                 "container from --media-url (an image or video already "
                 "hosted at a public URL; this script does not upload "
                 "media itself) plus --text as the caption, via POST "
                 "/{IG_USER_ID}/media. Step two - pass the creation_id "
                 "step one's response returns, as --publish-container-id, "
                 "in a second invocation - publishes it via POST "
                 "/{IG_USER_ID}/media_publish. For a video container, "
                 "check its processing status yourself between the two "
                 "steps (GET /{container-id}?fields=status_code&"
                 "access_token=... against the same API) and wait for "
                 "status_code to read FINISHED before publishing - this "
                 "script does not poll for you, and publishing too early "
                 "will fail. An unpublished container expires after 24 "
                 "hours. Needs an Instagram Business or Creator account "
                 "linked to a Facebook Page, and an access token with the "
                 "instagram_content_publish permission - a different "
                 "credential shape from the 'meta' platform's Facebook Page "
                 "token above even though both go through the same Graph "
                 "API family, so this uses its own INSTAGRAM_ACCESS_TOKEN "
                 "and INSTAGRAM_USER_ID rather than reusing META_PAGE_*. "
                 "Instagram enforces a 100-post-per-24-hours limit on the "
                 "publish call.",
}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Post text directly to LinkedIn, X, Meta (Facebook Page), Reddit, Discord, Slack, Telegram, "
                    "dev.to, GitHub Discussions, TikTok, or Instagram. YouTube is deliberately not included - "
                    "see the module docstring. "
                    "Scaffolding only - read the module docstring before using for real.",
        epilog=(
            "Required environment variables per platform:\n"
            "  linkedin  LINKEDIN_ACCESS_TOKEN, LINKEDIN_AUTHOR_URN\n"
            "  x         X_ACCESS_TOKEN  (user-context OAuth2, tweet.write scope)\n"
            "  meta      META_PAGE_ACCESS_TOKEN, META_PAGE_ID\n"
            "            (optional: META_GRAPH_API_VERSION, defaults to "
            f"{META_GRAPH_API_VERSION})\n"
            "  reddit    REDDIT_ACCESS_TOKEN, REDDIT_USER_AGENT\n"
            "            (also requires --subreddit and --title; --flair-id optional)\n"
            "  discord   DISCORD_WEBHOOK_URL  (the full webhook URL - itself the credential)\n"
            "  slack     SLACK_WEBHOOK_URL  (the full webhook URL - itself the credential)\n"
            "  telegram  TELEGRAM_BOT_TOKEN  (also requires --chat-id; --parse-mode optional,\n"
            "            defaults to HTML)\n"
            "  devto     DEVTO_API_KEY  (also requires --title; --tags optional, comma-\n"
            "            separated, max 4; --org-id optional)\n"
            "  github_discussions  GITHUB_DISCUSSIONS_TOKEN  (also requires --title,\n"
            "            --repo-id, and --category-id - GraphQL node IDs, not 'owner/repo')\n"
            "  tiktok    TIKTOK_ACCESS_TOKEN  (also requires --video-url; --privacy-level\n"
            "            optional, defaults to SELF_ONLY - the only level an unaudited\n"
            "            app can actually use)\n"
            "  instagram  INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID  (also requires\n"
            "            --media-url for step one, or --publish-container-id for step\n"
            "            two - see the module docstring, this is a two-step flow)\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--platform", required=True,
                         choices=["linkedin", "x", "meta", "reddit", "discord", "slack", "telegram", "devto",
                                  "github_discussions", "tiktok", "instagram"],
                         help="Which platform to post to. YouTube is not offered here - see the module docstring.")
    parser.add_argument("--text", help="Post text. Reads stdin if omitted. Optional for --platform instagram when --publish-container-id is given (step two needs no caption).")
    parser.add_argument("--subreddit", help="Target subreddit, no 'r/' prefix. Required for --platform reddit.")
    parser.add_argument("--title", help="Post title. Required for --platform reddit, devto, and github_discussions (the chat platforms are body-only).")
    parser.add_argument("--flair-id", help="Optional flair template ID, --platform reddit only, if the subreddit requires one.")
    parser.add_argument("--chat-id", help="Target chat: a numeric ID, or '@channelusername' for a public channel. Required for --platform telegram.")
    parser.add_argument("--parse-mode", default="HTML", choices=["HTML", "MarkdownV2"],
                         help="Telegram formatting mode (default: HTML, simpler escaping than MarkdownV2). --platform telegram only.")
    parser.add_argument("--tags", help="Comma-separated tags, max 4 (e.g. 'showdev,ai,opensource'). --platform devto only.")
    parser.add_argument("--org-id", help="Post under this dev.to Organization ID instead of your personal account. --platform devto only, optional.")
    parser.add_argument("--repo-id", help="Target repository's GraphQL node ID (not 'owner/repo'). Required for --platform github_discussions.")
    parser.add_argument("--category-id", help="Target discussion category's GraphQL node ID. Required for --platform github_discussions.")
    parser.add_argument("--video-url", help="Public URL of an already-hosted video for TikTok to pull (source=PULL_FROM_URL). Required for --platform tiktok.")
    parser.add_argument("--privacy-level", default="SELF_ONLY",
                         choices=["SELF_ONLY", "PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR"],
                         help="TikTok privacy level (default: SELF_ONLY - the only one an unaudited app can actually reach; others are silently downgraded server-side). --platform tiktok only.")
    parser.add_argument("--media-url", help="Public URL of an already-hosted image or video for Instagram to fetch. Required for --platform instagram step one (creating a container), unless --publish-container-id is given instead.")
    parser.add_argument("--media-type", default="image", choices=["image", "video"],
                         help="Whether --media-url points at an image or a video (default: image). --platform instagram step one only.")
    parser.add_argument("--publish-container-id", help="An existing container's creation_id, to publish it (step two). --platform instagram only; when given, --media-url/--media-type/--text are ignored.")
    parser.add_argument("--timeout", type=float, default=15, help="Request timeout in seconds (default: 15).")
    parser.add_argument("--dry-run", action="store_true", help="Print the request instead of sending it.")
    parser.add_argument("--confirmed", action="store_true",
                         help="Required to actually send. Only pass this after a human has seen the exact "
                              "request and explicitly said to proceed, in this conversation.")
    return parser.parse_args()


def load_text(text_arg):
    text = text_arg if text_arg is not None else sys.stdin.read()
    text = text.strip()
    if not text:
        print("No post text given. Pass --text or pipe it via stdin.", file=sys.stderr)
        sys.exit(2)
    return text


def require_env(*names):
    missing = [n for n in names if not os.environ.get(n)]
    if missing:
        print(f"Missing required environment variable(s): {', '.join(missing)}", file=sys.stderr)
        sys.exit(2)
    return {n: os.environ[n] for n in names}


def build_linkedin_request(text):
    env = require_env("LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN")
    url = "https://api.linkedin.com/v2/ugcPosts"
    headers = {
        "Authorization": f"Bearer {env['LINKEDIN_ACCESS_TOKEN']}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
    }
    body = {
        "author": env["LINKEDIN_AUTHOR_URN"],
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }
    return url, headers, json.dumps(body).encode("utf-8"), [env["LINKEDIN_ACCESS_TOKEN"]]


def build_x_request(text):
    env = require_env("X_ACCESS_TOKEN")
    url = "https://api.twitter.com/2/tweets"
    headers = {
        "Authorization": f"Bearer {env['X_ACCESS_TOKEN']}",
        "Content-Type": "application/json",
    }
    body = {"text": text}
    return url, headers, json.dumps(body).encode("utf-8"), [env["X_ACCESS_TOKEN"]]


def build_meta_request(text):
    env = require_env("META_PAGE_ACCESS_TOKEN", "META_PAGE_ID")
    url = f"https://graph.facebook.com/{META_GRAPH_API_VERSION}/{env['META_PAGE_ID']}/feed"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    body = urllib.parse.urlencode({
        "message": text,
        "access_token": env["META_PAGE_ACCESS_TOKEN"],
    }).encode("utf-8")
    return url, headers, body, [env["META_PAGE_ACCESS_TOKEN"]]


def build_reddit_request(text, subreddit, title, flair_id):
    env = require_env("REDDIT_ACCESS_TOKEN", "REDDIT_USER_AGENT")
    url = "https://oauth.reddit.com/api/submit"
    headers = {
        "Authorization": f"Bearer {env['REDDIT_ACCESS_TOKEN']}",
        "User-Agent": env["REDDIT_USER_AGENT"],
        "Content-Type": "application/x-www-form-urlencoded",
    }
    fields = {
        "sr": subreddit,
        "kind": "self",
        "title": title,
        "text": text,
        "api_type": "json",
    }
    if flair_id:
        fields["flair_id"] = flair_id
    body = urllib.parse.urlencode(fields).encode("utf-8")
    return url, headers, body, [env["REDDIT_ACCESS_TOKEN"]]


def build_discord_request(text):
    env = require_env("DISCORD_WEBHOOK_URL")
    url = env["DISCORD_WEBHOOK_URL"]
    if len(text) > 2000:
        print(
            f"Message is {len(text)} characters; Discord rejects messages over 2000 "
            "characters outright rather than truncating them. Shorten it before sending.",
            file=sys.stderr,
        )
        sys.exit(2)
    headers = {"Content-Type": "application/json"}
    body = json.dumps({"content": text}).encode("utf-8")
    # The webhook URL itself is the credential (no separate token/header) - redact the
    # whole thing, not just a header value, or --dry-run would print it in the clear.
    return url, headers, body, [url]


def build_slack_request(text):
    env = require_env("SLACK_WEBHOOK_URL")
    url = env["SLACK_WEBHOOK_URL"]
    if len(text) > 40000:
        print(
            f"Message is {len(text)} characters; Slack rejects messages over 40000 "
            "characters outright. Shorten it before sending.",
            file=sys.stderr,
        )
        sys.exit(2)
    if len(text) > 4000:
        print(
            f"Warning: message is {len(text)} characters. Slack technically allows up to "
            "40000, but recommends staying under 4000 for how the message actually "
            "displays (longer messages get collapsed behind a 'see more' link). Not "
            "blocking the send, just flagging it - not the same as Discord, which draws "
            "the line at a hard 2000-character cutoff.",
            file=sys.stderr,
        )
    headers = {"Content-Type": "application/json"}
    body = json.dumps({"text": text}).encode("utf-8")
    # The webhook URL itself is the credential, same as Discord - redact the whole thing.
    return url, headers, body, [url]


def build_telegram_request(text, chat_id, parse_mode):
    env = require_env("TELEGRAM_BOT_TOKEN")
    if len(text) > 4096:
        print(
            f"Message is {len(text)} characters; Telegram rejects messages over 4096 "
            "characters outright ('message is too long') rather than truncating them. "
            "Shorten it before sending.",
            file=sys.stderr,
        )
        sys.exit(2)
    url = f"https://api.telegram.org/bot{env['TELEGRAM_BOT_TOKEN']}/sendMessage"
    headers = {"Content-Type": "application/json"}
    body = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
    }).encode("utf-8")
    # The bot token is embedded in the URL path itself, not a header - redact the
    # token value so it doesn't leak in --dry-run output (URL structure stays visible).
    return url, headers, body, [env["TELEGRAM_BOT_TOKEN"]]


def build_devto_request(text, title, tags, org_id):
    env = require_env("DEVTO_API_KEY")
    if tags and len(tags) > 4:
        print(
            f"{len(tags)} tags given; dev.to allows a maximum of 4 tags per "
            "article. Trim the list before sending.",
            file=sys.stderr,
        )
        sys.exit(2)
    url = "https://dev.to/api/articles"
    headers = {
        "api-key": env["DEVTO_API_KEY"],
        "Content-Type": "application/json",
    }
    article = {
        "title": title,
        "body_markdown": text,
        "published": True,
        "tags": tags or [],
    }
    if org_id:
        article["organization_id"] = org_id
    body = json.dumps({"article": article}).encode("utf-8")
    # A static API key in a custom header, not a URL - redact the key value
    # itself, same pattern as LinkedIn/X's bearer tokens.
    return url, headers, body, [env["DEVTO_API_KEY"]]


def build_github_discussions_request(text, title, repo_id, category_id):
    env = require_env("GITHUB_DISCUSSIONS_TOKEN")
    url = "https://api.github.com/graphql"
    headers = {
        "Authorization": f"Bearer {env['GITHUB_DISCUSSIONS_TOKEN']}",
        "Content-Type": "application/json",
        "Accept": "application/vnd.github+json",
    }
    query = (
        "mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) { "
        "createDiscussion(input: {repositoryId: $repositoryId, categoryId: $categoryId, "
        "title: $title, body: $body}) { discussion { id url } } }"
    )
    body = json.dumps({
        "query": query,
        "variables": {
            "repositoryId": repo_id,
            "categoryId": category_id,
            "title": title,
            "body": text,
        },
    }).encode("utf-8")
    # A bearer token in a header, same redaction pattern as LinkedIn/X/devto.
    return url, headers, body, [env["GITHUB_DISCUSSIONS_TOKEN"]]


def build_tiktok_request(text, video_url, privacy_level):
    env = require_env("TIKTOK_ACCESS_TOKEN")
    url = "https://open.tiktokapis.com/v2/post/publish/video/init/"
    headers = {
        "Authorization": f"Bearer {env['TIKTOK_ACCESS_TOKEN']}",
        "Content-Type": "application/json",
    }
    body = json.dumps({
        "post_info": {
            "title": text,
            "privacy_level": privacy_level,
        },
        "source_info": {
            "source": "PULL_FROM_URL",
            "video_url": video_url,
        },
    }).encode("utf-8")
    # A bearer token in a header, same redaction pattern as LinkedIn/X/devto.
    return url, headers, body, [env["TIKTOK_ACCESS_TOKEN"]]


def build_instagram_request(text, media_url, media_type, container_id):
    env = require_env("INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_USER_ID")
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    if container_id:
        # Step two: publish an already-created, already-finished container.
        url = f"https://graph.facebook.com/{META_GRAPH_API_VERSION}/{env['INSTAGRAM_USER_ID']}/media_publish"
        fields = {
            "creation_id": container_id,
            "access_token": env["INSTAGRAM_ACCESS_TOKEN"],
        }
    else:
        # Step one: create the container. Meta fetches the media FROM media_url -
        # this script never touches the image/video bytes themselves.
        url = f"https://graph.facebook.com/{META_GRAPH_API_VERSION}/{env['INSTAGRAM_USER_ID']}/media"
        fields = {
            "caption": text or "",
            "access_token": env["INSTAGRAM_ACCESS_TOKEN"],
        }
        if media_type == "video":
            fields["video_url"] = media_url
            fields["media_type"] = "REELS"
        else:
            fields["image_url"] = media_url
    body = urllib.parse.urlencode(fields).encode("utf-8")
    return url, headers, body, [env["INSTAGRAM_ACCESS_TOKEN"]]


BUILDERS = {
    "linkedin": build_linkedin_request,
    "x": build_x_request,
    "meta": build_meta_request,
    "discord": build_discord_request,
    "slack": build_slack_request,
}


def redact(text, secrets):
    for secret in secrets:
        if secret:
            text = text.replace(secret, "<redacted>")
    return text


def main():
    args = parse_args()

    if not args.dry_run and not args.confirmed:
        print(
            "Refusing to send: pass --dry-run to preview the request, or --confirmed to "
            "actually send it. This script never sends without one of those being explicit.",
            file=sys.stderr,
        )
        sys.exit(2)

    if args.platform == "instagram" and args.publish_container_id:
        # Step two (publish an existing container) needs no caption - it was
        # already set on the container in step one. Don't force one here.
        text = (args.text or "").strip()
    else:
        text = load_text(args.text)

    if args.platform == "reddit":
        if not args.subreddit or not args.title:
            print(
                "--platform reddit requires both --subreddit and --title "
                "(Reddit self-posts need a title; the other platforms are body-only).",
                file=sys.stderr,
            )
            sys.exit(2)
        url, headers, body, secrets = build_reddit_request(text, args.subreddit, args.title, args.flair_id)
    elif args.platform == "telegram":
        if not args.chat_id:
            print(
                "--platform telegram requires --chat-id (a numeric chat ID, or "
                "'@channelusername' for a public channel).",
                file=sys.stderr,
            )
            sys.exit(2)
        url, headers, body, secrets = build_telegram_request(text, args.chat_id, args.parse_mode)
    elif args.platform == "devto":
        if not args.title:
            print(
                "--platform devto requires --title (dev.to articles need one, "
                "the same as Reddit self-posts).",
                file=sys.stderr,
            )
            sys.exit(2)
        tags = [t.strip() for t in args.tags.split(",") if t.strip()] if args.tags else []
        url, headers, body, secrets = build_devto_request(text, args.title, tags, args.org_id)
    elif args.platform == "github_discussions":
        if not args.title or not args.repo_id or not args.category_id:
            print(
                "--platform github_discussions requires --title, --repo-id, and "
                "--category-id (GraphQL node IDs, not 'owner/repo' or a category name).",
                file=sys.stderr,
            )
            sys.exit(2)
        url, headers, body, secrets = build_github_discussions_request(
            text, args.title, args.repo_id, args.category_id
        )
    elif args.platform == "tiktok":
        if not args.video_url:
            print(
                "--platform tiktok requires --video-url (a public URL TikTok's "
                "servers can fetch the video from - this script doesn't upload "
                "video bytes directly).",
                file=sys.stderr,
            )
            sys.exit(2)
        url, headers, body, secrets = build_tiktok_request(text, args.video_url, args.privacy_level)
    elif args.platform == "instagram":
        if not args.publish_container_id and not args.media_url:
            print(
                "--platform instagram requires either --media-url (step one: create "
                "a container) or --publish-container-id (step two: publish an "
                "existing container). See the module docstring - this is a two-step "
                "flow, not a single request.",
                file=sys.stderr,
            )
            sys.exit(2)
        url, headers, body, secrets = build_instagram_request(
            text, args.media_url, args.media_type, args.publish_container_id
        )
    else:
        url, headers, body, secrets = BUILDERS[args.platform](text)

    if args.dry_run:
        print("=== DRY RUN: no request sent ===")
        print(f"Platform: {args.platform}")
        print(f"Note: {NOTES[args.platform]}")
        print("Method: POST")
        # redact the URL itself, not just headers/body - Discord's webhook URL IS the
        # credential, so printing it unredacted here would defeat the point of --dry-run.
        print(f"URL: {redact(url, secrets)}")
        print("Headers:")
        for name, value in headers.items():
            print(f"  {name}: {redact(value, secrets)}")
        print(f"Body ({len(body)} bytes):")
        print(redact(body.decode("utf-8"), secrets))
        print("=== END DRY RUN ===")
        sys.exit(0)

    request = urllib.request.Request(url, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            status = response.getcode()
            reason = response.reason
            response_body = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        try:
            error_body = e.read().decode("utf-8", errors="replace")
        except Exception:
            error_body = ""
        print(f"{args.platform} API returned non-2xx status", file=sys.stderr)
        print(f"Status: {e.code} {e.reason}", file=sys.stderr)
        print(f"Response: {error_body[:500] or '(empty body)'}", file=sys.stderr)
        sys.exit(4)
    except (urllib.error.URLError, OSError) as e:
        print(f"Failed to reach {args.platform} API: {e}", file=sys.stderr)
        sys.exit(3)

    print(f"Posted to {args.platform}")
    print(f"Status: {status} {reason}")
    print(f"Response: {response_body[:500] or '(empty body)'}")
    sys.exit(0)


if __name__ == "__main__":
    main()
