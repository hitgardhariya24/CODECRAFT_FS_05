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

