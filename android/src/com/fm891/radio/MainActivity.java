package com.fm891.radio;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;

/**
 * FM891 Music Radio - native shell hosting the bundled web app.
 *
 * - Holds a partial wake lock + high-performance WiFi lock while streaming so
 *   audio survives screen-off.
 * - Drives PlaybackService (foreground media service): lock screen keeps
 *   playing and shows station + current song with play/pause controls.
 * - Bridges ICY "now playing" metadata from the live stream to the page
 *   (the <audio> element discards in-band song titles, and browser fetch
 *   hits CORS preflight that some stream CDNs answer with 502).
 */
public class MainActivity extends Activity {

    private WebView webView;
    private static volatile WebView sWebView;

    private volatile boolean icyRunning = false;
    private volatile String icyUrl = null;
    private volatile HttpURLConnection icyConn = null;
    private Thread icyThread;

    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 13+: notification permission for the media card / quick controls.
        if (Build.VERSION.SDK_INT >= 33) {
            try {
                if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
                }
            } catch (Throwable ignored) { }
        }

        webView = new WebView(this);
        sWebView = webView;
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient());
        webView.setBackgroundColor(0xFF0D0821);
        webView.addJavascriptInterface(new IcyBridge(), "AndroidIcy");

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        stopIcy();
        releasePower();
        PlaybackService.stopFor(this);
        sWebView = null;
        super.onDestroy();
    }

    /** Run JS on the WebView (used by PlaybackService's session callbacks). */
    static void evalJs(final String js) {
        final WebView w = sWebView;
        if (w == null) return;
        w.post(new Runnable() {
            @Override
            public void run() {
                try { w.evaluateJavascript(js, null); } catch (Throwable ignored) { }
            }
        });
    }

    /* ---------------- JS bridge ---------------- */

    public class IcyBridge {

        private String lastUrl = null;

        @android.webkit.JavascriptInterface
        public void start(String url) {
            if (url != null && url.length() > 0) lastUrl = url;
            acquirePower();                 // keep CPU + WiFi alive
            startIcy(url);                  // ICY song-title reader
            PlaybackService.startFor(MainActivity.this); // foreground media service
        }

        @android.webkit.JavascriptInterface
        public void stop() {
            stopIcy();
            releasePower();
            PlaybackService.stopFor(MainActivity.this);
        }

        @android.webkit.JavascriptInterface
        public void station(String name) {
            PlaybackService.setStation(name);
        }

        @android.webkit.JavascriptInterface
        public void title(String songTitle) {
            PlaybackService.setSong(songTitle);
        }

        /** Let the reader yield bandwidth to the audio element during stalls. */
        @android.webkit.JavascriptInterface
        public void yieldFeed(boolean yieldNow) {
            if (yieldNow) stopIcy();
            else if (lastUrl != null) startIcy(lastUrl);
        }

        /** Installed versionName (e.g. "1.1") — for the online update check. */
        @android.webkit.JavascriptInterface
        public String appVersion() {
            try {
                android.content.pm.PackageInfo pi =
                        getPackageManager().getPackageInfo(getPackageName(), 0);
                return String.valueOf(pi.versionName);
            } catch (Throwable t) {
                return "1.1";
            }
        }

        /** Download + install a new APK (url = GitHub release asset). */
        @android.webkit.JavascriptInterface
        public void applyUpdate(String url) {
            Updater.start(MainActivity.this, url);
        }
    }

    /* ---------------- keepalive locks ---------------- */

    private void acquirePower() {
        try {
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "FM891:radio");
                wakeLock.setReferenceCounted(false);
            }
            if (!wakeLock.isHeld()) wakeLock.acquire();

            if (wifiLock == null) {
                WifiManager wm = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
                wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "FM891:wifi");
                wifiLock.setReferenceCounted(false);
            }
            if (!wifiLock.isHeld()) wifiLock.acquire();
        } catch (Throwable ignored) { }
    }

    private void releasePower() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        } catch (Throwable ignored) { }
        try {
            if (wifiLock != null && wifiLock.isHeld()) wifiLock.release();
        } catch (Throwable ignored) { }
    }

    /* ---------------- ICY reader ---------------- */

    private synchronized void startIcy(String url) {
        if (url == null || url.length() == 0) return;
        if (icyRunning && url.equals(icyUrl)) return; // already reading this stream
        stopIcy();
        icyUrl = url;
        icyRunning = true;
        final String u = url;
        icyThread = new Thread(new Runnable() {
            @Override
            public void run() {
                while (icyRunning) {
                    try {
                        readIcyOnce(u);
                    } catch (Throwable ignored) { }
                    if (icyRunning) {
                        try {
                            Thread.sleep(3000); // server dropped us: reconnect
                        } catch (InterruptedException e) {
                            break;
                        }
                    }
                }
            }
        }, "icy-reader");
        icyThread.setDaemon(true);
        icyThread.start();
    }

    private synchronized void stopIcy() {
        icyRunning = false;
        icyUrl = null;
        HttpURLConnection c = icyConn;
        icyConn = null;
        if (c != null) {
            try { c.disconnect(); } catch (Throwable ignored) { }
        }
        Thread t = icyThread;
        icyThread = null;
        if (t != null) t.interrupt();
    }

    private void readIcyOnce(String streamUrl) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(streamUrl).openConnection();
        icyConn = conn;
        try {
            conn.setRequestProperty("Icy-MetaData", "1");
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (compatible; FM891/1.0)");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(20000);
            conn.connect();

            int metaInt = 0;
            String mi = conn.getHeaderField("icy-metaint");
            if (mi != null) {
                try { metaInt = Integer.parseInt(mi.trim()); } catch (NumberFormatException ignored) { }
            }

            InputStream in = conn.getInputStream();

            if (metaInt <= 0) {
                // Stream carries no metadata: hold the connection until stopped.
                byte[] skipBuf = new byte[8192];
                while (icyRunning) {
                    if (in.read(skipBuf) < 0) break;
                }
                return;
            }

            byte[] buf = new byte[4096];
            long untilMeta = metaInt;
            String last = "";
            while (icyRunning) {
                int toRead = (int) Math.min(buf.length, untilMeta);
                int n = in.read(buf, 0, toRead);
                if (n < 0) return;
                untilMeta -= n;
                if (untilMeta > 0) continue;

                // Metadata section: 1 length byte (x16) + payload
                int lenByte = in.read();
                if (lenByte < 0) return;
                int metaLen = lenByte * 16;
                String title = "";
                if (metaLen > 0) {
                    byte[] meta = new byte[metaLen];
                    int got = 0;
                    while (got < metaLen) {
                        int r = in.read(meta, got, metaLen - got);
                        if (r < 0) break;
                        got += r;
                    }
                    title = parseStreamTitle(meta, got);
                }
                untilMeta = metaInt;
                if (title.length() > 0 && !title.equals(last)) {
                    last = title;
                    dispatchTitle(title);
                }
            }
        } finally {
            if (conn == icyConn) icyConn = null;
            try { conn.disconnect(); } catch (Throwable ignored) { }
        }
    }

    private static String parseStreamTitle(byte[] b, int len) {
        String raw;
        try {
            raw = Charset.forName("UTF-8").newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(b, 0, len)).toString();
        } catch (CharacterCodingException e) {
            raw = new String(b, 0, len, Charset.forName("ISO-8859-1"));
        }
        String key = "StreamTitle='";
        int a = raw.indexOf(key);
        if (a < 0) return "";
        int start = a + key.length();
        int end = raw.indexOf('\'', start);
        String t = end >= 0 ? raw.substring(start, end) : raw.substring(start);
        t = t.replace('\0', ' ').trim();
        if (t.length() == 0 || t.equals("-") || t.equalsIgnoreCase("unknown")) return "";
        return t;
    }

    private void dispatchTitle(final String title) {
        // Page hook updates in-app UI; service hook updates lock screen card.
        evalJs("window.__onIcyTitle&&window.__onIcyTitle(" + JSONObject.quote(title) + ");");
    }
}
