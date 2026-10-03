package com.fm891.radio;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.BitmapFactory;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;

/**
 * Foreground media service.
 *
 * - Raises the process to "media playback" priority so audio survives
 *   screen-off / app switching.
 * - Hosts a system MediaSession + MediaStyle notification showing station and
 *   current song on the lock screen, with play/pause controls.
 *
 * Brand: 拾光电台 FM89.1 ("pick up the good times in your ears").
 */
public class PlaybackService extends Service {

    private static final String CHANNEL_ID = "radio_playback";
    private static final int NOTIF_ID = 891;
    private static final String BRAND = "拾光电台 FM89.1";

    private static volatile String station = "拾光电台 FM89.1";
    private static volatile String song = "";
    private static volatile boolean playingFlag = true;
    private static volatile PlaybackService instance;

    /* ---------------- static control surface (JS bridge -> service) ---------------- */

    static void setStation(String name) {
        if (name != null && name.length() > 0) station = name;
        PlaybackService i = instance;
        if (i != null) i.show();
    }

    static void setSong(String title) {
        song = title == null ? "" : title;
        PlaybackService i = instance;
        if (i != null) i.show();
    }

    static void startFor(Context ctx) {
        song = "";
        playingFlag = true;
        Intent i = new Intent(ctx, PlaybackService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i);
            else ctx.startService(i);
        } catch (Throwable ignored) { }
    }

    static void stopFor(Context ctx) {
        playingFlag = false;
        song = "";
        try { ctx.stopService(new Intent(ctx, PlaybackService.class)); }
        catch (Throwable ignored) { }
    }

    /* ---------------- service lifecycle ---------------- */

    private MediaSession session;
    private NotificationManager nm;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;

        nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "正在播放", NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }

        session = new MediaSession(this, "ShiguangFM");
        session.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS
                | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() {
                MainActivity.evalJs("window.__svcResume&&window.__svcResume()");
            }
            @Override public void onPause() {
                MainActivity.evalJs("window.__svcPause&&window.__svcPause()");
            }
            @Override public void onStop() {
                MainActivity.evalJs("window.__svcPause&&window.__svcPause()");
            }
        });
        session.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        show(); // performs startForeground + refreshes notification/session
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        if (session != null) {
            try { session.release(); } catch (Throwable ignored) { }
            session = null;
        }
        instance = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    /* ---------------- notification + session state ---------------- */

    private void show() {
        Notification n = build();
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(NOTIF_ID, n,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIF_ID, n);
            }
        } catch (Throwable ignored) { }

        if (session == null) return;
        try {
            String title = song.length() > 0 ? song : station;

            MediaMetadata.Builder mb = new MediaMetadata.Builder()
                    .putString(MediaMetadata.METADATA_KEY_TITLE, title)
                    .putString(MediaMetadata.METADATA_KEY_ARTIST,
                            song.length() > 0 ? station : "网络直播")
                    .putString(MediaMetadata.METADATA_KEY_ALBUM, BRAND);
            try {
                android.graphics.Bitmap art = avatar();
                if (art != null) {
                    mb.putBitmap(MediaMetadata.METADATA_KEY_ART, art);
                    mb.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, art);
                }
            } catch (Throwable ignored) { }
            session.setMetadata(mb.build());

            long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE
                    | PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_STOP;
            session.setPlaybackState(new PlaybackState.Builder()
                    .setActions(actions)
                    .setState(playingFlag ? PlaybackState.STATE_PLAYING
                            : PlaybackState.STATE_PAUSED, 0, 1.0f)
                    .build());
        } catch (Throwable ignored) { }
    }

    private int appIcon() {
        try {
            return getResources().getIdentifier("ic_launcher", "mipmap", getPackageName());
        } catch (Throwable t) {
            return 0;
        }
    }

    /* ---------------- 主播头像（系统播放器用） ----------------
     * 系统播放器（通知栏 / 锁屏 / 蓝牙 / 车机）显示的封面来自 MediaSession 的
     * METADATA_KEY_ART。以前这里塞的是 ic_launcher —— 方的、旧版应用图标，
     * 用户：「系统播放器头像还是以前的 不是圆的」。
     * 改成 APK 里 assets/icons/dj-avatar.png（和站内用的同一张新头像），
     * 居中裁成正方形再上圆形遮罩，只解码一次缓存。 */
    private static android.graphics.Bitmap artCache;

    private synchronized android.graphics.Bitmap avatar() {
        if (artCache != null) return artCache;
        try (java.io.InputStream in = getAssets().open("icons/dj-avatar.png")) {
            android.graphics.Bitmap src = BitmapFactory.decodeStream(in);
            if (src == null) return null;
            int w = src.getWidth(), h = src.getHeight();
            int s = Math.min(w, h);
            android.graphics.Bitmap out = android.graphics.Bitmap.createBitmap(
                    s, s, android.graphics.Bitmap.Config.ARGB_8888);
            android.graphics.Canvas c = new android.graphics.Canvas(out);
            android.graphics.Paint p = new android.graphics.Paint(
                    android.graphics.Paint.ANTI_ALIAS_FLAG);
            android.graphics.BitmapShader sh = new android.graphics.BitmapShader(
                    src, android.graphics.Shader.TileMode.CLAMP,
                    android.graphics.Shader.TileMode.CLAMP);
            android.graphics.Matrix mx = new android.graphics.Matrix();
            mx.postTranslate(-(w - s) / 2f, -(h - s) / 2f);   // 居中裁掉多余边
            sh.setLocalMatrix(mx);
            p.setShader(sh);
            c.drawCircle(s / 2f, s / 2f, s / 2f, p);          // 圆形遮罩
            artCache = out;
            return out;
        } catch (Throwable t) {
            return null;   // 没有就退回不设封面（系统自行兜底），绝不炸服务
        }
    }

    private Notification build() {
        String title = song.length() > 0 ? song : station;
        String sub = song.length() > 0 ? station : "正在播放 · " + BRAND;

        int icon = appIcon();
        if (icon == 0) icon = android.R.drawable.ic_media_play;

        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int pf = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) pf |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, pf);

        Notification.Builder b = (Build.VERSION.SDK_INT >= 26)
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);

        b.setSmallIcon(icon)
                .setContentTitle(title)
                .setContentText(sub)
                .setContentIntent(pi)
                .setOngoing(true)
                .setShowWhen(false)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setPriority(Notification.PRIORITY_LOW);

        if (session != null) {
            try {
                b.setStyle(new Notification.MediaStyle()
                        .setMediaSession(session.getSessionToken()));
            } catch (Throwable ignored) { }
        }

        try {
            return b.build();
        } catch (Throwable e) {
            return new Notification();
        }
    }
}
