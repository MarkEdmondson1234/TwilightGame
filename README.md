<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ArqQZSPqnja94BsLXPhUSbRf0IWvwlsx

## Run Locally

**Prerequisites:**
- Node.js (v18 or higher)
- gifsicle (for GIF optimization) - Optional but recommended

### Setup

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Install gifsicle (optional but recommended for asset optimization):**

   macOS:
   ```bash
   brew install gifsicle
   ```

   Linux:
   ```bash
   sudo apt-get install gifsicle
   ```

   Windows:
   Download from https://www.lcdf.org/gifsicle/

3. **Optimize assets (optional but recommended):**
   ```bash
   npm run optimize-assets
   ```
   This will:
   - Generate character sprite sheets
   - Resize and compress tile images (95-99% size reduction)
   - Optimize animated GIFs to 512x512 (60-80% size reduction)
   - Save optimized assets to `/public/assets-optimized/`

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   The game will be available at `http://localhost:4000/TwilightGame/`

### Development

- **TypeScript Check:** `npx tsc --noEmit`
- **Asset Optimization:** `npm run optimize-assets` (run after adding new images)
- **Build for Production:** `npm run build`

See [CLAUDE.md](CLAUDE.md) for complete development guidelines and architecture documentation.
