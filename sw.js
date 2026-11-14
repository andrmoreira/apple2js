const CACHE_NAME = 'apple2js-v1';

const APP_FILES = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './icon-512.jpeg',
    './rom.js',
    './main.js',
    './CRTFilter.js',
    './audio.js',
    './bus.js',
    './char-rom.js',
    './keyboard.js',
    './memory.js',
    './video.js'
];

const appUrl = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(APP_FILES.map(appUrl));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();

        await Promise.all(
            cacheNames
                .filter((name) => name.startsWith('apple2js-') && name !== CACHE_NAME)
                .map((name) => caches.delete(name))
        );

        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Handle same-origin GET requests only
    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                return await fetch(request);
            } catch {
                return await caches.match(appUrl('./index.html'));
            }
        })());
        return;
    }

    // Cache files when they are first requested
    event.respondWith((async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        const response = await fetch(request);

        if (response.ok && response.type === 'basic') {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        }

        return response;
    })());
});
