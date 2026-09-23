package com.fm891.radio;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * In-app updater v2:
 *  1) download the release APK into cache, streaming progress to the page;
 *  2) preferred: launch the standard system installer via ACTION_VIEW +
 *     our own content:// provider (reliable across OEM ROMs);
 *  3) fallback: stream the file into a PackageInstaller session (v1.1 path).
 */
public final class Updater {

    private static volatile boolean busy = false;
    private static volatile long lastProgressAt = 0;

    private Updater() { }

    /** Called from the JS bridge. apkUrl = GitHub release asset URL. */
    static void start(final Context ctx, final String apkUrl) {
        if (apkUrl == null || apkUrl.length() == 0) { state("failed", "更新地址无效"); return; }
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
                    state("failed", "请先允许“安装未知应用”，然后点“立即更新”重试");
                    return;
                }
            } catch (Throwable ignored) { }
        }

        busy = true;
        progress(0);
        new Thread(new Runnable() {
            @Override
            public void run() { execute(ctx, apkUrl); }
        }, "updater").start();
    }

    private static void execute(Context ctx, String apkUrl) {
        try {
            File apk = download(ctx, apkUrl);
            state("ready", "下载完成，正在调起安装…");
            if (!launchInstaller(ctx, apk)) {
                commitViaSession(ctx, apk); // OEM 走不通 ACTION_VIEW 时兜底
            }
        } catch (Throwable e) {
            state("failed", "更新失败：" + (e.getMessage() != null ? e.getMessage() : "未知错误"));
        } finally {
            busy = false;
        }
    }

    private static File download(Context ctx, String apkUrl) throws Exception {
        File out = new File(ctx.getCacheDir(), "update.apk");
        if (out.exists() && !out.delete()) { /* 覆盖写也可 */ }

        HttpURLConnection conn = (HttpURLConnection) new URL(apkUrl).openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(60000);
        conn.setInstanceFollowRedirects(true);
        conn.connect();
        int code = conn.getResponseCode();
        if (code != 200) throw new Exception("HTTP " + code);
        int total = conn.getContentLength();

        long done = 0;
        InputStream in = conn.getInputStream();
        OutputStream os = new java.io.FileOutputStream(out);
        try {
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) {
                os.write(buf, 0, n);
                done += n;
                if (total > 0) reportProgress(done, total);
            }
            os.flush();
        } finally {
            try { os.close(); } catch (Throwable ignored) { }
            try { in.close(); } catch (Throwable ignored) { }
            conn.disconnect();
        }
        if (out.length() <= 0) throw new Exception("下载为空");
        return out;
    }

    /** Preferred: the familiar system install screen (ACTION_VIEW). */
    private static boolean launchInstaller(Context ctx, File apk) {
        try {
            Uri uri = Uri.parse(ApkProvider.register(apk));
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
            return true;
        } catch (Throwable e) {
            return false;
        }
    }

    /** Fallback: PackageInstaller session (same as v1.1/v1.2). */
    private static void commitViaSession(Context ctx, File apk) {
        PackageInstaller.Session session = null;
        try {
            PackageInstaller installer = ctx.getPackageManager().getPackageInstaller();
            PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(
                    PackageInstaller.SessionParams.MODE_FULL_INSTALL);
            int sid = installer.createSession(params);
            session = installer.openSession(sid);

            InputStream in = new FileInputStream(apk);
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
            session = null;
            state("ready", "请在系统安装界面点“安装”");
        } catch (Throwable e) {
            if (session != null) { try { session.abandon(); } catch (Throwable ignored) { } }
            state("failed", "调起安装失败：" + (e.getMessage() != null ? e.getMessage() : ""));
        }
    }

    /* ---- progress / state → page ---- */

    private static void reportProgress(long done, int total) {
        long now = System.currentTimeMillis();
        if (now - lastProgressAt < 120) return;
        lastProgressAt = now;
        progress((int) Math.min(100, done * 100 / total));
    }

    private static void progress(int pct) {
        MainActivity.evalJs("window.__onUpdateProgress&&window.__onUpdateProgress(" + pct + ")");
    }

    private static void state(String s, String msg) {
        MainActivity.evalJs("window.__onUpdateState&&window.__onUpdateState("
                + jstr(s) + "," + jstr(msg) + ")");
    }

    private static void toast(String msg) {
        MainActivity.evalJs("window.__toast&&window.__toast(" + jstr(msg) + ")");
    }

    private static String jstr(String s) {
        try { return org.json.JSONObject.quote(s == null ? "" : s); }
        catch (Throwable t) { return "\"\""; }
    }
}
