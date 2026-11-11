package ir.attendance.inservice;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.res.AssetFileDescriptor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.FileOutputStream;

/**
 * پنجره ساده «ذخیره به‌عنوان»: کاربر نام فایل و محل ذخیره را انتخاب می‌کند.
 * داده‌ها پیش از نمایش پنجره رمزگشایی و نگهداری می‌شوند تا فایل هرگز خالی (۰ بایت) نماند،
 * و پس از نوشتن، اندازه‌ی فایل با داده‌ی اصلی مقایسه می‌شود.
 */
@CapacitorPlugin(name = "NativeSave")
public class NativeSavePlugin extends Plugin {

    private byte[] pendingBytes;

    @PluginMethod
    public void save(PluginCall call) {
        String fileName = call.getString("fileName", "file");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String data = call.getString("data");
        if (data == null || data.isEmpty()) {
            call.reject("داده‌ای برای ذخیره وجود ندارد");
            return;
        }
        try {
            pendingBytes = Base64.decode(data, Base64.DEFAULT);
        } catch (Exception e) {
            call.reject("داده نامعتبر است");
            return;
        }
        if (pendingBytes == null || pendingBytes.length == 0) {
            call.reject("داده‌ای برای ذخیره وجود ندارد");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        startActivityForResult(call, intent, "onSaveResult");
    }

    @ActivityCallback
    private void onSaveResult(PluginCall call, ActivityResult result) {
        byte[] bytes = pendingBytes;
        pendingBytes = null;

        Uri uri = null;
        if (result != null && result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            uri = result.getData().getData();
        }
        if (uri == null) {
            if (call != null) {
                JSObject cancelled = new JSObject();
                cancelled.put("saved", false);
                call.resolve(cancelled);
            }
            return;
        }
        if (bytes == null || bytes.length == 0) {
            if (call != null) call.reject("داده‌ای برای ذخیره وجود ندارد");
            return;
        }

        try {
            ContentResolver resolver = getContext().getContentResolver();
            try (ParcelFileDescriptor pfd = resolver.openFileDescriptor(uri, "w")) {
                if (pfd == null) throw new Exception("امکان باز کردن فایل مقصد نیست");
                try (FileOutputStream fos = new FileOutputStream(pfd.getFileDescriptor())) {
                    fos.write(bytes);
                    fos.flush();
                    try { fos.getFD().sync(); } catch (Exception ignored) { }
                }
            }

            // بررسی اندازه‌ی فایل نوشته‌شده
            try (AssetFileDescriptor afd = resolver.openAssetFileDescriptor(uri, "r")) {
                if (afd != null) {
                    long len = afd.getLength();
                    if (len >= 0 && len != bytes.length) {
                        throw new Exception("اندازه فایل ذخیره‌شده (" + len + ") با داده اصلی (" + bytes.length + ") برابر نیست");
                    }
                }
            }

            if (call != null) {
                JSObject ret = new JSObject();
                ret.put("saved", true);
                ret.put("bytes", bytes.length);
                ret.put("uri", uri.toString());
                call.resolve(ret);
            }
        } catch (Exception e) {
            if (call != null) call.reject(e.getMessage() != null ? e.getMessage() : "خطا در نوشتن فایل");
        }
    }
}
