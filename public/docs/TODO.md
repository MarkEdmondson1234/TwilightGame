# TODO List

## Performance Optimization

### Character Sprite Optimization
- [x] Optimize left/right sprite PNGs (currently 630-755KB, should be ~300-400KB like up/down)
  - Files to optimize:
    - `public/assets/character1/base/left_0.png` (631K)
    - `public/assets/character1/base/left_1.png` (747K)
    - `public/assets/character1/base/left_2.png` (631K)
    - `public/assets/character1/base/left_3.png` (739K)
    - `public/assets/character1/base/right_0.png` (637K)
    - `public/assets/character1/base/right_1.png` (753K)
    - `public/assets/character1/base/right_2.png` (637K)
    - `public/assets/character1/base/right_3.png` (745K)
  - Methods to try:
    - Lossless PNG compression (pngquant, optipng, or tinypng.com)
    - Remove unnecessary metadata
    - Check color depth optimization
  - Goal: Reduce file sizes by ~50% to match up/down sprite sizes
  - Benefit: Faster loading, especially on mobile/slower connections
