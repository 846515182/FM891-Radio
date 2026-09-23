package com.fm891.radio;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;

/**
 * Minimal content:// provider that serves the downloaded APK (in cache) to
 * the system installer. Framework-only replacement for androidx FileProvider.
 */
public class ApkProvider extends ContentProvider {

    private static final String AUTHORITY = "com.fm891.radio.apk";
    private static volatile File apkFile;

    /** Called by Updater right before launching the installer. */
    static String register(File f) {
        apkFile = f;
        return "content://" + AUTHORITY + "/FM891.apk";
    }

    @Override
    public boolean onCreate() { return true; }

    @Override
    public String getType(Uri uri) { return "application/vnd.android.package-archive"; }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File f = apkFile;
        if (f == null || !f.exists()) throw new FileNotFoundException("APK not ready");
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection,
                        String[] selectionArgs, String sortOrder) {
        File f = apkFile;
        MatrixCursor c = new MatrixCursor(
                new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE });
        c.addRow(new Object[] { "FM891.apk", (f != null && f.exists()) ? f.length() : 0 });
        return c;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) { return 0; }

    @Override
    public Uri insert(Uri uri, ContentValues values) { return null; }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}
