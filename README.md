<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1VnpijdGIB-NS8obNDaNB-Cb6G5sRtAK9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `VITE_GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy on Vercel

1. Import this repo in Vercel.
2. Set the `VITE_GEMINI_API_KEY` environment variable in Vercel (Project Settings -> Environment Variables).
3. Use the default build settings (Vercel will run `npm run build` and deploy `dist`).
