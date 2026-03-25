package com.mercotrace.app;

import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import com.dantsu.escposprinter.EscPosPrinter;
import com.dantsu.escposprinter.connection.bluetooth.BluetoothConnection;
import com.dantsu.escposprinter.connection.bluetooth.BluetoothPrintersConnections;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "MercoPrinter")
public class MercoPrinterPlugin extends Plugin {

    private static final int BLUETOOTH_PERMS_REQUEST_CODE = 5020;
    private PluginCall pendingBluetoothPermissionsCall;

    @PluginMethod
    public void requestBluetoothPermissions(PluginCall call) {
        // Only needed on Android 12+ where BLUETOOTH_* runtime permissions exist.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        Activity activity = getActivity();
        Context context = getContext();
        if (activity == null || context == null) {
            call.reject("Activity/context not available");
            return;
        }

        String[] perms = new String[] {
            android.Manifest.permission.BLUETOOTH_CONNECT,
            android.Manifest.permission.BLUETOOTH_SCAN
        };

        boolean allGranted = true;
        for (String p : perms) {
            if (context.checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) {
                allGranted = false;
                break;
            }
        }

        if (allGranted) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        // Save call for callback
        pendingBluetoothPermissionsCall = call;
        activity.requestPermissions(perms, BLUETOOTH_PERMS_REQUEST_CODE);
    }

    @Override
    public void handleRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode != BLUETOOTH_PERMS_REQUEST_CODE) {
            super.handleRequestPermissionsResult(requestCode, permissions, grantResults);
            return;
        }

        if (pendingBluetoothPermissionsCall == null) {
            return;
        }

        boolean granted = true;
        for (int r : grantResults) {
            if (r != PackageManager.PERMISSION_GRANTED) {
                granted = false;
                break;
            }
        }

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        pendingBluetoothPermissionsCall.resolve(ret);
        pendingBluetoothPermissionsCall = null;
    }

    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html");
        String mode = call.getString("mode", "auto"); // "system" | "thermal" | "auto"
        String deviceMac = call.getString("deviceMac", null);

        if (html == null || html.isEmpty()) {
            call.reject("html is required");
            return;
        }

        if ("system".equalsIgnoreCase(mode)) {
            printSystem(html, call);
            return;
        }

        if ("thermal".equalsIgnoreCase(mode)) {
            boolean ok = tryThermalByMac(html, deviceMac);
            if (ok) {
                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("printedMode", "thermal");
                call.resolve(ret);
            } else {
                call.reject("Thermal printing failed or MAC not found");
            }
            return;
        }

        // auto: try thermal with bound MAC (if present). If it fails, always fall back to system.
        boolean thermalOk = tryThermalByMac(html, deviceMac);
        if (thermalOk) {
            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("printedMode", "thermal");
            call.resolve(ret);
        } else {
            printSystem(html, call);
        }
    }

    @PluginMethod
    public void listPrinters(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context not available");
            return;
        }

        try {
            // DantSu library constructor is no-arg in our dependency version.
            BluetoothPrintersConnections printers = new BluetoothPrintersConnections();
            BluetoothConnection[] available = printers.getList();

            List<JSObject> printerList = new ArrayList<>();
            if (available != null) {
                for (BluetoothConnection conn : available) {
                    if (conn == null || conn.getDevice() == null) continue;
                    String mac = conn.getDevice().getAddress();
                    String name = conn.getDevice().getName();

                    JSObject item = new JSObject();
                    item.put("mac", mac);
                    item.put("name", name != null ? name : mac);
                    printerList.add(item);
                }
            }

            JSObject ret = new JSObject();
            ret.put("printers", printerList);
            call.resolve(ret);
        } catch (Exception e) {
            // If permissions are missing, this will usually throw. Let UI show a helpful message.
            call.reject("Failed to list Bluetooth printers: " + e.getMessage(), e);
        }
    }

    private void printSystem(String html, PluginCall call) {
        Activity activity = getActivity();
        Context context = getContext();

        if (activity == null || context == null) {
            call.reject("No activity/context for system printing");
            return;
        }

        final PrintManager printManager =
            (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
        if (printManager == null) {
            call.reject("Print service not available");
            return;
        }

        // WebView used for printing must be rendered/attached in the view hierarchy.
        // Also, WebView creation/loading should run on the Android UI thread.
        activity.runOnUiThread(() -> {
            final ViewGroup root = activity.findViewById(android.R.id.content);
            if (root == null) {
                call.reject("Root view not available for printing");
                return;
            }

            final FrameLayout container = new FrameLayout(activity);
            container.setAlpha(0f);
            container.setX(-10000f);
            container.setY(-10000f);

            final FrameLayout.LayoutParams containerLp = new FrameLayout.LayoutParams(800, 600);
            root.addView(container, containerLp);

            final WebView webView = new WebView(activity);
            webView.getSettings().setJavaScriptEnabled(true);
            webView.setBackgroundColor(0x00000000);

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    PrintDocumentAdapter adapter = new PrintDocumentAdapter() {
                        private final PrintDocumentAdapter innerAdapter =
                            webView.createPrintDocumentAdapter("MercotraceDocument");

                        @Override
                        public void onLayout(
                            PrintAttributes oldAttributes,
                            PrintAttributes newAttributes,
                            CancellationSignal cancellationSignal,
                            LayoutResultCallback callback,
                            android.os.Bundle extras
                        ) {
                            innerAdapter.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras);
                        }

                        @Override
                        public void onWrite(
                            PageRange[] pages,
                            android.os.ParcelFileDescriptor destination,
                            CancellationSignal cancellationSignal,
                            WriteResultCallback callback
                        ) {
                            innerAdapter.onWrite(pages, destination, cancellationSignal, callback);
                        }

                        @Override
                        public void onFinish() {
                            super.onFinish();
                            try {
                                webView.destroy();
                            } catch (Exception ignored) {}
                            try {
                                root.removeView(container);
                            } catch (Exception ignored) {}
                        }
                    };

                    PrintAttributes attributes = new PrintAttributes.Builder()
                        .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                        .build();

                    // Triggers Android system print picker (select printer / Save as PDF).
                    printManager.print("MercotraceJob", adapter, attributes);

                    try {
                        JSObject ret = new JSObject();
                        ret.put("ok", true);
                        ret.put("printedMode", "system");
                        call.resolve(ret);
                    } catch (Exception ignored) {}

                    // Safety cleanup if onFinish never fires.
                    new Handler(Looper.getMainLooper()).postDelayed(() -> {
                        try {
                            webView.destroy();
                        } catch (Exception ignored) {}
                        try {
                            root.removeView(container);
                        } catch (Exception ignored) {}
                    }, 8000);
                }

                @Override
                public void onReceivedError(WebView view, android.webkit.WebResourceRequest request, android.webkit.WebResourceError error) {
                    try {
                        call.reject("System print HTML load failed");
                    } catch (Exception ignored) {}
                    try {
                        root.removeView(container);
                    } catch (Exception ignored) {}
                    try {
                        webView.destroy();
                    } catch (Exception ignored) {}
                }
            });

            container.addView(webView, new FrameLayout.LayoutParams(800, 600));
            webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
        });
    }

    private boolean tryThermalByMac(String html, String deviceMac) {
        if (deviceMac == null || deviceMac.trim().isEmpty()) {
            return false;
        }

        Context context = getContext();
        if (context == null) return false;

        try {
            BluetoothPrintersConnections printers = new BluetoothPrintersConnections();
            BluetoothConnection[] available = printers.getList();

            if (available == null || available.length == 0) return false;

            BluetoothConnection matched = null;
            for (BluetoothConnection conn : available) {
                if (conn == null || conn.getDevice() == null) continue;
                String mac = conn.getDevice().getAddress();
                if (mac != null && mac.equalsIgnoreCase(deviceMac.trim())) {
                    matched = conn;
                    break;
                }
            }

            if (matched == null) return false;

            // 80mm thermal paper width (per your requirement).
            // 203 DPI + 80mm => typically ~48 chars per line.
            EscPosPrinter printer = new EscPosPrinter(matched, 203, 80f, 48);
            String text = htmlToPlainText(html);
            if (text.isEmpty()) {
                text = "Mercotrace\nPrint job\n";
            }
            printer.printFormattedText(text);
            printer.disconnectPrinter();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String htmlToPlainText(String html) {
        if (html == null) return "";
        String text = html
            .replaceAll("(?i)<br\\s*/?>", "\n")
            .replaceAll("(?i)</p>", "\n\n")
            .replaceAll("(?s)<[^>]*>", "")
            .replace("&nbsp;", " ");
        return text.trim();
    }
}

