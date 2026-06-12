# FreeLLMAPI + Litestream, for free 24/7 hosting on Render (no credit card).
#
# Wraps the published FreeLLMAPI image and adds Litestream, which continuously
# replicates the SQLite database to a Cloudflare R2 bucket and restores it on
# boot. This makes Render's ephemeral disk survive restarts/redeploys, so your
# provider keys and unified key persist. See docs/DEPLOY_FREELLMAPI_RENDER.md.

FROM ghcr.io/tashfeenahmed/freellmapi:latest

# Add the Litestream binary from its official image (Render builds for amd64).
COPY --from=litestream/litestream:0.3.13 /usr/local/bin/litestream /usr/local/bin/litestream

USER root
COPY litestream.yml /etc/litestream.yml
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
USER node

# Litestream restores the DB (if a replica exists), then runs FreeLLMAPI while
# replicating live. Render injects PORT; FreeLLMAPI reads it.
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
