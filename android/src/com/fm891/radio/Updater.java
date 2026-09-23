package com.fm891.radio;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * In-app updater: streams the GitHub-release APK directly into a
 * PackageInstaller session (framework-only, no FileProvider needed) and
 * commits it. The system then shows the usual "update this app?" prompt.
 */
public final class Updater {

    private static volatile boolean busy = false;

    private Updater() { }

    /** Called from the JS bridge. apkUrl = GitHub release asset URL. */
    static void start(final Context ctx, final String apkUrl) {
        if (apkUrl == null || apkUrl.length() == 0) return;
        if (busy) { toast("正在下载更新，请稍候…"); return; }

        // API 26+: user must allow this app to install packages first.
        if (Build.VERSION.SDK_INT >= 26) {
            try {
                if (!ctx.getPackageManager().canRequestPackageInstalls()) {
                    Intent i = new Intent(
                            android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + ctx.getPackageName()));
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(i);
                    toast("请先允许“安装未知应用”，然后点“立即更新”重试");
                    return;
                }
            } catch (Throwable ignored) { }
        }

        busy = true;
        toast("开始下载新版本…");
        new Thread(new Runnable() {
            @Override
            public void run() { downloadAndInstall(ctx, apkUrl); }
        }, "updater").start();
    }

    private static void downloadAndInstall(Context ctx, String apkUrl) {
        HttpURLConnection conn = null;
        PackageInstaller.Session session = null;
        int sessionId = -1;
        try {
            conn = (HttpURLConnection) new URL(apkUrl).openConnection();
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(60000);
            conn.setInstanceFollowRedirects(true);
            conn.connect();
            int code = conn.getResponseCode();
            if (code != 200) throw new Exception("HTTP " + code);

            PackageInstaller installer = ctx.getPackageManager().getPackageInstaller();
            PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(
                    PackageInstaller.SessionParams.MODE_FULL_INSTALL);
            sessionId = installer.createSession(params);
            session = installer.openSession(sessionId);

            InputStream in = conn.getInputStream();
            OutputStream out = session.openWrite("base.apk", 0, -1);
            try {
                byte[] buf = new byte[65536];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                session.fsync(out);
            } finally {
                try { out.close(); } catch (Throwable ignored) { }
                try { in.close(); } catch (Throwable ignored) { }
            }

            Intent cb = new Intent(ctx, InstallResultReceiver.class);
            cb.setPackage(ctx.getPackageName());
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent pi = PendingIntent.getBroadcast(ctx, 1, cb, flags);
            session.commit(pi.getIntentSender());
            session = null; // ownership handed to the installer
            toast("下载完成，请在系统弹窗中确认更新");
        } catch (Throwable e) {
            if (session != null) {
                try { session.abandon(); } catch (Throwable ignored) { }
            } else if (sessionId >= 0) {
                try {
                    ctx.getPackageManager().getPackageInstaller().abandonSession(sessionId);
                } catch (Throwable ignored) { }
            }
            toast("更新失败：" + e.getMessage());
        } finally {
            busy = false;
            if (conn != null) conn.disconnect();
            if (session != null) { try { session.close(); } catch (Throwable ignored) { } }
        }
    }

    private static void toast(String msg) {
        String q;
        try { q = org.json.JSONObject.quote(msg); } catch (Throwable t) { q = "\"\""; }
        MainActivity.evalJs("window.__toast&&window.__toast(" + q + ")");
    }
}
