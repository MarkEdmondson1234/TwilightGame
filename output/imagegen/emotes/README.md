# Woodland emotes

Generated on 12 September 2026 at the owner's request, using the built-in image-generation tool. These are AI-generated additions complementing the game's original hand-drawn artwork, replacing platform emoji in the emote UI and above players.

Eight expressions: wave, laugh, heart (thank you), question, yes, sad, dance and followme (come and see). The direction is a cream woodland spirit with sage leaves, warm pencil contours and chalk texture. Source PNGs retain their generated transparency. Several rejected generations contained painted checkerboards; those are not included here.

The runtime copies in `public/assets/emotes` are 128×128 PNGs. Original sources here are not shipped by Vite. The separate `items` directory contains 128px derivatives of existing game illustrations, never replacements for the originals. Rebuild that catalog and the matching database allowlist with `node scripts/build-emote-icons.mjs` after adding eligible item artwork.

The quick menu and larger item picker share the existing multiplayer emote channel. Item selections use explicit `item:<id>` catalog values; they display a picture without giving, consuming or casting the item. Database rules and client must both deploy for the expanded vocabulary. The existing Firebase workflow deploys changed database rules on merge.

The Pixi renderer loads selected thumbnails only, shares active textures and retains at most eight idle textures (512 KiB of RGBA pixels). Each active distinct emote texture adds 64 KiB before driver overhead. This is not a measurement of total game GPU memory or a fix for the reported iPhone village crash.
