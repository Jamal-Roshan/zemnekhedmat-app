package ir.attendance.inservice;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

/**
 * پنجره ساده «ذخیره به‌عنوان»: کاربر نام فایل و محل ذخیره را انتخاب می‌کند.
 */
@CapacitorPlugin(name = "NativeSave")
public class NativeSavePlugin extends Plugin {

    @PluginMethod
    public void save(PluginCall call) {
        String fileName = call.getString("fileName", "file");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        if (call.getString("data") == null) {
            call.reject("data is required");
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
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("saved", false);
            call.resolve(cancelled);
            return;
        }
        Uri uri = result.getData().getData();
        try {
            byte[] bytes = Base64.decode(call.getString("data"), Base64.DEFAULT);
            try (OutputStream os = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (os == null) {
                    call.reject("cannot open output stream");
                    return;
                }
                os.write(bytes);
                os.flush();
            }
            JSObject ret = new JSObject();
            ret.put("saved", true);
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
