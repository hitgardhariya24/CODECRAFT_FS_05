# SOCIAL MEDIA PLATEFORM

A full stack social media web application built with React, Node.js, Express, MongoDB, and Socket.io.

## Features

- Authentication: register, login, logout, forgot/reset password, JWT auth
- Profiles: avatar upload, editable bio/about, followers and following counts
- Posts: text, image, and video posts with multiple media uploads, hashtags, and tagging
- Feed: home, following, trending, infinite scroll, latest-first sorting
- Social actions: like/unlike, nested comments, emoji reactions, follow/unfollow
- Notifications: likes, comments, follows, mentions, realtime updates
- Chat: one-to-one realtime chat with typing and seen status
- Search: users, posts, hashtags, suggestions
- Explore: trending content and creators
- Stories: upload, view, auto-expire after 24 hours, reactions
- UI: responsive layout, dark/light mode, skeleton loaders, toast notifications, smooth animations

## Project Structure

- `backend` - Express API, MongoDB models, Socket.io server
- `frontend` - React SPA with responsive social UI

## Getting Started

1. Copy `.env.example` to `.env` and fill in the values.
2. Install dependencies:

```bash
npm install
npm run install:all
```

3. Start the app in development:

```bash
npm run dev
```

## Backend

The backend exposes REST endpoints under `/api` for auth, users, posts, feeds, notifications, chats, stories, and search.

## Frontend

The frontend is a Vite app that consumes the backend API through `VITE_API_URL` and realtime events through `VITE_SOCKET_URL`.

## UI Redesign - Premium X/Twitter-Inspired Dark Theme

The frontend has been completely redesigned with a startup-grade, premium dark theme inspired by modern X/Twitter web UI.

### Design Highlights

- **Dark Mode Default**: Black and charcoal surfaces with blue accent hierarchy
- **3-Column Layout**: Fixed left sidebar, main feed, right suggestions panel
- **X-Style Navigation**: Icon-based sticky sidebar with active highlights
- **Composer-first Feed**: For You and Following tabs with inline post composer
- **Premium Right Rail**: Search, trending section, suggestions, and subscription card
- **Smooth Animations**: Framer Motion transitions on all interactions
- **Responsive**: Adapts from desktop (3-col) → tablet (2-col) → mobile (1-col + bottom nav)
- **Premium Polish**: Micro-interactions, hover effects, careful typography

### Key Features

✅ X-style 3-column layout (sidebar + feed + rail)  
✅ Bottom navigation bar for mobile  
✅ For You and Following feed tabs  
✅ Inline composer with media and action controls  
✅ Right rail with search, trends, suggestions, premium card  
✅ Premium dark palette (black, charcoal, blue accent)  
✅ Smooth page transitions and hover effects  
✅ Perfect responsive breakpoints (520px, 720px, 1080px, 1320px)  
✅ Modern typography with Inter/Poppins fonts  
✅ All components ready for production use  

### See Full Details

👉 [UI_REDESIGN.md](./UI_REDESIGN.md) - Complete design documentation, component guide, and responsive behavior.

## Notes

- Media uploads use local disk storage in `uploads/` by default.
- Dark theme is the default; light mode is available as an option.
- Replace the email transport settings with a real SMTP provider for password reset emails.
- MongoDB must be running locally or available via `MONGODB_URI`.
