---
'DJMTbot': minor
---

Adds two new slash commands that fetch and return a random animal fact.

- **New:** `/catfact` command via `CatFactsComponent` (fetches from catfact.ninja)
- **New:** `/dogfact` command via `DogFactsComponent` (fetches from dogapi.dog)
- Registered both commands in `ComponentNames`, `ComponentCommands`, and `Components/index.ts`

- Extracted guild creation into a `createGuild()` helper in `DJMTbot`, eliminating duplicated logic
- Fixed `GuildCreate` event handler — new guilds now correctly call `onReady()` after being created
- Fixed `loadJSON` file-existence check in `GuildConfigManager` to only treat `ENOENT` as "file missing"; other filesystem errors now rethrow instead of being silently swallowed
- Downgraded `collectComponentData` log from `info` → `debug` to reduce log noise
