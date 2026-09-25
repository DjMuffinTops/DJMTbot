---
'DJMTbot': minor
---
- adds music playing capabilities via direct URLs to audio links or directly from Audio files
- multiple music commands  including /play, /playfile, /skip, /stop, /pause, /resume, /queue, /nowplaying, /volume, /loop, and /autoplay.
- Update Docker build/runtime to support voice audio dependencies by installing FFmpeg and native build tools, and explicitly building @discordjs/opus during image build so voice playback works in Alpine-based containers.
- also fixes some issues with the say command

# Please enter a summary for your changes.
