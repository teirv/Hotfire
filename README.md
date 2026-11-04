# Hotfire

Interactive JavaScript and Python lessons with a live editor, invite-only accounts and saved progress.

## Update the server

```
cd /DATA/AppData/hotfire-app
docker compose pull
docker compose up -d
```

Every push to `main` builds a new image on GitHub. Wait for the green check on the **Actions** tab before pulling. Accounts and progress live in `/DATA/AppData/hotfire` and aren't touched by updates.

## Roll back to an earlier version

Every build gets a version number, such as `1.4`. Find them on the repo's **Packages** page, or on the **Actions** tab, where the run number is the version's last digit.

To go back, set the version in `.env`:

```
HOTFIRE_IMAGE=ghcr.io/teirv/hotfire:1.4
```

Then run `docker compose up -d`. Change it back to `:latest` to return to normal updates.

Going back to an older app version keeps your accounts and progress.

To see which version is running:

```
docker inspect hotfire --format '{{ index .Config.Labels "org.opencontainers.image.version" }}'
```

## Fresh install

1. Put `docker-compose.yml` and `.env.example` in `/DATA/AppData/hotfire-app`, and rename `.env.example` to `.env`.
2. Fill in `.env`. Create `SECRET_KEY` with `openssl rand -hex 32`.
3. Make the data folder:

   ```
   sudo mkdir -p /DATA/AppData/hotfire
   sudo chown 10001:10001 /DATA/AppData/hotfire
   ```

4. If this repo is private, sign the server in to GitHub's image store once:

   ```
   docker login ghcr.io -u YOUR-GITHUB-NAME
   ```

   For the password, use a GitHub token with the `read:packages` permission.

5. Run `docker compose up -d`.
6. Run `docker exec hotfire flask --app app invite` and open the link. The first account made becomes the owner.

## Day-to-day tasks

Reset a password: `docker exec hotfire flask --app app reset-password USERNAME`

Back up: copy `/DATA/AppData/hotfire`.

Invite someone: **Account**, then **Make invite link**.

## Claude explanations (optional)

Add an Anthropic key to `ANTHROPIC_API_KEY=` in `.env`, then run `docker compose up -d`. API use is billed to you. `EXPLAIN_DAILY_LIMIT` caps it per person, per day.

## Changing the app

Lessons are in `course/`. Run `node build.js` after any change, which rebuilds `server/static/index.html`, then commit and push.

Lesson format: `=U` starts a unit, `=L` a lesson, `=F` a hot fire. `@T` is a teaching card, `@Q` multiple choice, `@P` predict the output, `@B` fill in the blank, `@O` put in order, and `@C` a coding challenge.
