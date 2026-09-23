package com.fm891.radio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;

/** Receives PackageInstaller session status (fallback install path). */
public class InstallResultReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context ctx, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS,
                PackageInstaller.STATUS_FAILURE);
        String raw = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
        switch (status) {
            case PackageInstaller.STATUS_PENDING_USER_ACTION: {
                Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                if (confirm != null) {
                    confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    try {
                        ctx.startActivity(confirm);
                        push("ready", "请在系统安装界面点“安装”");
                    } catch (Throwable t) {
                        push("failed", "无法调起系统安装界面（" + t.getMessage() + "），请重试");
                    }
                } else {
                    // 有些 ROM 会自行弹确认框，提醒用户留意屏幕
                    push("ready", "请留意系统安装确认提示，点“安装”继续");
                }
                break;
            }
            case PackageInstaller.STATUS_SUCCESS:
                push("success", "新版本安装成功，重启应用后生效");
                break;
            case PackageInstaller.STATUS_FAILURE_ABORTED:
                push("aborted", "已取消更新，可随时重试");
                break;
            default:
                push("failed", "更新未完成" + (raw != null && raw.length() > 0 ? "：" + raw : ""));
        }
    }

    private static void push(String state, String msg) {
        String s, m;
        try {
            s = org.json.JSONObject.quote(state);
            m = org.json.JSONObject.quote(msg);
        } catch (Throwable t) {
            s = "\"\"";
            m = "\"\"";
        }
        MainActivity.evalJs("window.__onUpdateState&&window.__onUpdateState(" + s + "," + m + ");");
    }
}
