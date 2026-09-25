---
'DJMTbot': patch
---

- fixes a bug where setting channels in the config manager would trigger saving to the config json without running a check on the state of component jsons before saving
