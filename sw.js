const CACHE_NAME = 'apple2js-emu-v1';
const FILES = [
    './',
    './index.html',
    './manifest.json',
    './favicon.png',
    './style.css',
    './main.js',
    './memory.js',
    './bus.js',
    './video.js',
    './audio.js',
    './keyboard.js',
    './rom.js',
    './char-rom.js',
    './tac.mp3',
    './submodules/cpu6502/cpu.js',
    './submodules/apple2shader/screenEmu.js',
    './textures/Shadow%20Mask%20Aperture.png',
    './textures/Shadow%20Mask%20LCD.png',
    './textures/Shadow%20Mask%20Bayer.png',
    './textures/Shadow%20Mask%20Triad.png',
    './textures/Shadow%20Mask%20Inline.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FILES);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.url.endsWith('.dsk')) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then((cached) => {
            if (cached) return cached;
            return fetch(e.request).then((res) => {
                if (res.ok && e.request.method === 'GET') {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                }
                return res;
            });
        }).catch(() => {
            if (e.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});

self.addEventListener('message', (e) => {
    if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
