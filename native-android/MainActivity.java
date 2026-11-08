package ir.attendance.inservice;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePrintPlugin.class);
        registerPlugin(NativeSavePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
