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
 *   screen-off / app switching (fixes: playback pauses after locking).
 * - Hosts a system MediaSession + MediaStyle notification showing station and
 *   current song on the lock screen, with play/pause controls
 *   (fixes: no playback info visible after locking).
 */
public class PlaybackService extends Service {

    private static final String CHANNEL_ID = "radio_playback";
    private static final int NOTIF_ID = 891;

    private static volatile String station = "FM891 音乐电台";
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

        session = new MediaSession(this, "FM891");
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
                    .putString(MediaMetadata.METADATA_KEY_ALBUM, "FM891 音乐电台");
            try {
                int iconId = appIcon();
                if (iconId != 0) {
                    android.graphics.Bitmap bmp =
                            BitmapFactory.decodeResource(getResources(), iconId);
                    if (bmp != null) mb.putBitmap(MediaMetadata.METADATA_KEY_ART, bmp);
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

    private Notification build() {
        String title = song.length() > 0 ? song : station;
        String sub = song.length() > 0 ? station : "正在播放 · FM891 音乐电台";

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
