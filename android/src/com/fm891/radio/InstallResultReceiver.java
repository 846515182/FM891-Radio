package com.fm891.radio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;

/** Receives PackageInstaller session status after an in-app update commit. */
public class InstallResultReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context ctx, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS,
                PackageInstaller.STATUS_FAILURE);
        switch (status) {
            case PackageInstaller.STATUS_PENDING_USER_ACTION:
                // Bring up the system's install confirmation dialog.
                Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                if (confirm != null) {
                    confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    try { ctx.startActivity(confirm); } catch (Throwable ignored) { }
                }
                break;
            case PackageInstaller.STATUS_SUCCESS:
                notifyUi("新版本已安装，重启应用后生效");
                break;
            case PackageInstaller.STATUS_FAILURE_ABORTED:
                notifyUi("已取消更新");
                break;
            default:
                String msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
                notifyUi("更新未完成" + (msg != null && msg.length() > 0 ? "：" + msg : ""));
        }
    }

    private static void notifyUi(String text) {
        String q;
        try { q = org.json.JSONObject.quote(text); } catch (Throwable t) { q = "\"\""; }
        MainActivity.evalJs("window.__toast&&window.__toast(" + q + ")");
    }
}
