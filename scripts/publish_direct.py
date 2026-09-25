#!/usr/bin/env python3
"""
Scaffolding for posting text directly to LinkedIn, X, Meta (Facebook Page),
Reddit, or Discord - no n8n/Make in between.

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
    a manual approval queue - see the "reddit" note below. Discord is the
    exception - a webhook needs no app review at all, see "discord" below.
  - Confirm the endpoint/version below is still current - check
    developers.linkedin.com, developer.x.com, developers.facebook.com,
    Reddit's own API docs, and Discord's own API docs directly, since
    these APIs change and this script cannot check for you.
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
  - For Discord specifically: `community-post-generator` can't
    independently verify a given server's rules the way it can for
    Reddit/Product Hunt/Hacker News/Indie Hackers, since most servers
    have no public page to check at all - it works from whatever rules
    you (as an actual member) supply it. Confirm that's still current
    yourself before sending, same as you would before posting by hand.

Text-only. None of these platforms' media-attachment flows are
implemented here (Instagram in particular has no text-only post endpoint
at all - see NOTES below - and isn't supported here at all).

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
    "discord": "The easiest of the five to set up: a webhook needs no "
               "OAuth app review, just MANAGE_WEBHOOKS permission on the "
               "target channel to create one (Channel Settings > "
               "Integrations > Webhooks). The webhook URL itself is the "
               "credential - anyone with it can post, so treat it like a "
               "password (this script redacts it in --dry-run output, "
               "same as other platforms' tokens). Sends a plain chat "
               "message (2000-character limit; longer text is rejected, "
               "not truncated, by Discord's API) - no title field exists, "
               "this isn't a self-post the way Reddit is. Unlike the "
               "other platforms, community-post-generator did not "
               "independently verify the target server's rules for this "
               "draft - it worked from what you supplied - so recheck the "
               "server's own rules channel yourself before sending.",
}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Post text directly to LinkedIn, X, Meta (Facebook Page), Reddit, or Discord. "
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
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--platform", required=True, choices=["linkedin", "x", "meta", "reddit", "discord"],
                         help="Which platform to post to.")
    parser.add_argument("--text", help="Post text. Reads stdin if omitted.")
    parser.add_argument("--subreddit", help="Target subreddit, no 'r/' prefix. Required for --platform reddit.")
    parser.add_argument("--title", help="Post title. Required for --platform reddit (the other platforms are body-only).")
    parser.add_argument("--flair-id", help="Optional flair template ID, --platform reddit only, if the subreddit requires one.")
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


BUILDERS = {
    "linkedin": build_linkedin_request,
    "x": build_x_request,
    "meta": build_meta_request,
    "discord": build_discord_request,
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
