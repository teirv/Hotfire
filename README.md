# Hotfire

Interactive lessons with a live editor, invite-only accounts and saved progress. Tracks: JavaScript, Python, HTML & CSS, C#, Rust, Japanese, and Spanish.

## Update the server

```
cd /DATA/AppData/hotfire-app
docker compose pull
docker compose up -d
```

**One-time step for the C# and Rust update:** copy the new `docker-compose.yml` from this repo over your old one first. It adds a second container, `hotfire-runner`, that compiles and runs C# and Rust code. The first pull downloads about 1.5 GB for it.

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

## C# and Rust runner

C# and Rust code can't run in the browser, so `hotfire-runner` compiles it on the server. It has no internet access, a read-only file system, and limits on memory, CPU, processes and run time. Each run uses its own throwaway user.

`RUN_LIMIT_PER_MINUTE` in `.env` caps runs per person (default 40). To pin a runner version, set `HOTFIRE_RUNNER_IMAGE=ghcr.io/teirv/hotfire-runner:1.4` in `.env`.

Check it: `docker logs hotfire-runner`. If it's down, C# and Rust lessons say so, and everything else keeps working.

## Changing the app

Lessons are in `course/`. Run `node build.js` after any change, which rebuilds `server/static/index.html`, then commit and push.

Lesson format: `=U` starts a unit, `=L` a lesson, `=F` a hot fire. `@T` is a teaching card, `@Q` multiple choice, `@P` predict the output, `@B` fill in the blank, `@O` put in order, and `@C` a coding challenge, and `@W` a typed answer. In Japanese lessons, `{漢字|かんじ}` adds furigana. In Spanish lessons, text in backticks can be tapped to hear it. Kana lessons are generated in `build.js`.

`=X unitid` adds to an existing unit: new `=L` lessons go before its first hot fire, and new `=F` hot fires go at the end. The `course/extra_*.txt` files use this.

In `@C` challenges, `~after` is test code that runs after the learner's code. For C#, it runs before the learner's code instead, and for Rust it's an `fn main`. Learners see the tests under **What Check tests**.

Python challenges can include files with `~file name.txt` followed by the contents. Programs can `open()`, read, write and append them, and use `csv`. Each run starts from fresh copies.

**Review buttons:** every question in a hot fire links to up to 10 earlier lessons that teach what it uses. `course/concepts.js` lists what each idea looks like in code. The build finds the first lesson that teaches each one, so links update when lessons change. To pick the links yourself, add `~review lessonid, lessonid` to a card.

The Python **Practice Test** is in `course/py_practice.txt`.

Test every card with `node tests/verify.js`. For C# and Rust, start `runner/runner.py` on port 8101 first.
